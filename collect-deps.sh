#!/bin/bash
#
# collect-deps.sh - Extract package dependency data for Arch-based distributions
#
# Generates timestamped JSON file containing all installed packages with their
# direct dependencies and reverse dependencies.
#
# Output: ui/public/data/<OS-name>-<hostname>-<timestamp>.json
#

set -euo pipefail

#######################################
# Distribution check
#######################################
if [[ ! -f /etc/os-release ]] || ! grep -qiE 'arch|manjaro|endeavouros' /etc/os-release || ! command -v pacman >/dev/null 2>&1; then
	echo "Error: This script must be run on an Arch-based distribution (pacman not found or incompatible OS)." >&2
	exit 1
fi

#######################################
# Requirement check
#######################################
REQUIRED_PKGS=("pactree" "jq" "bc" "hostname" "pv")
MISSING_PKGS=()

for cmd in "${REQUIRED_PKGS[@]}"; do
	if ! command -v "${cmd}" >/dev/null 2>&1; then
		MISSING_PKGS+=("${cmd}")
	fi
done

if [[ ${#MISSING_PKGS[@]} -ne 0 ]]; then
	echo "Error: The following commands are missing: ${MISSING_PKGS[*]}" >&2

	# Check if pacman files database exists, if not, suggest update
	if [[ ! -d "/var/lib/pacman/sync" ]] || [[ -z "$(ls -A /var/lib/pacman/sync/*.files 2>/dev/null || true)" ]]; then
		echo "Note: pacman-files database not found. Run 'sudo pacman -Fy' first." >&2
	fi

	echo "Searching for providing packages..." >&2

	# Use a set-like approach to find unique package names
	INSTALL_LIST=()
	for cmd in "${MISSING_PKGS[@]}"; do
		# Find the package that owns /usr/bin/cmd
		# We use -q (quiet) and -v (to avoid matching directories)
		pkg=$(pacman -Fq "/usr/bin/${cmd}" | head -n 1 | cut -d' ' -f1)

		if [[ -n ${pkg} ]]; then
			INSTALL_LIST+=("${pkg}")
		else
			# Fallback for common groups if pacman -F fails (e.g. pacman-contrib)
			case "${cmd}" in
			"pactree") INSTALL_LIST+=("pacman-contrib") ;;
			*) echo "Warning: Could not find package for '${cmd}'" >&2 ;;
			esac
		fi
	done

	# Get unique packages to install
	UNIQUE_PKGS=$(echo "${INSTALL_LIST[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' ')

	if [[ -n ${UNIQUE_PKGS} ]]; then
		echo -e "\nPlease install the missing dependencies using:" >&2
		echo "  sudo pacman -S ${UNIQUE_PKGS}" >&2
	fi
	exit 1
fi

#######################################
# Timing & logging helpers
#######################################
SCRIPT_START_TS="$(date +%s%N)"

now_ns() { date +%s%N; }
format_duration() {
	local total_ns=$1
	local total_secs
	total_secs=$(awk "BEGIN { printf \"%.3f\", ${total_ns}/1000000000 }")

	# Check if we are over 60 seconds
	local is_over_60
	is_over_60=$(echo "${total_secs} >= 60" | bc -l)
	if ((is_over_60)); then
		local mins
		mins=$(awk "BEGIN { print int(${total_secs} / 60) }")
		local secs
		secs=$(awk "BEGIN { printf \"%.3f\", ${total_secs} % 60 }")
		echo "${mins}m ${secs}s"
	else
		echo "${total_secs}s"
	fi
}

log_phase() {
	local timestamp
	timestamp=$(date '+%H:%M:%SZ%z' || true)
	printf "\n[%s] %s\n" "${timestamp}" "$1" >&2
}

PHASE_START=0
phase_begin() { PHASE_START="$(now_ns)"; }
phase_end() {
	local end
	end="$(now_ns)"
	local dur_ns=$((end - PHASE_START))
	local duration
	duration=$(format_duration "${dur_ns}")
	printf "→ Completed in %s\n" "${duration}"
}

#######################################
# Setup
#######################################
DEBUG=false
for arg in "$@"; do
	if [[ ${arg} == "--debug" || ${arg} == "-d" ]]; then
		DEBUG=true
		shift
	fi
done

OS_NAME=$(grep '^ID=' /etc/os-release | cut -d'=' -f2 | tr -d '"' | tr '[:upper:]' '[:lower:]' 2>/dev/null || echo "arch")
HOSTNAME=$(hostname -s)
SHELL_NAME=$(basename "${SHELL:-/bin/bash}")
JOBS="$(nproc)"
TMP_DIR="$(mktemp -d)"
if [[ ${DEBUG} == true ]]; then
	echo "DEBUG MODE: Temporary directory will be preserved at ${TMP_DIR}" >&2
	trap 'echo "Exit triggered. Debug mode active: $TMP_DIR was not deleted."' EXIT
else
	trap 'rm -rf "$TMP_DIR"' EXIT
fi

TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%SZ%z)
OUTPUT_DIR="ui/public/data"
OUTPUT_FILE="${OUTPUT_DIR}/${OS_NAME}-${HOSTNAME}-${TIMESTAMP}.json"
mkdir -p "${OUTPUT_DIR}"

echo "Arch-based Package Dependency Collector" >&2
echo "========================================" >&2
echo "OS: ${OS_NAME}" >&2
echo "Hostname: ${HOSTNAME}" >&2
echo "Parallel jobs: ${JOBS}" >&2
echo "Shell: ${SHELL_NAME}" >&2
echo "Temporary Dir: ${TMP_DIR}" >&2

#######################################
# Step 1: Package list
#######################################
log_phase "Collecting package list"
phase_begin
pkg_list=$(pacman -Qq | sort)
mapfile -t all_packages <<<"${pkg_list}"
package_count="${#all_packages[@]}"
echo "Found ${package_count} packages"
phase_end

#######################################
# Step 2: Explicit packages
#######################################
log_phase "Identifying explicitly installed packages"
phase_begin
declare -A EXPLICIT
explicit_list=$(pacman -Qqe)
while read -r pkg _; do
	EXPLICIT["${pkg}"]=true
done <<<"${explicit_list}"
explicit_count="${#EXPLICIT[@]}"
echo "Found ${explicit_count} explicitly installed packages"
phase_end

#######################################
# Step 3: Versions
#######################################
log_phase "Collecting package versions"
phase_begin
declare -A VERSION
version_list=$(pacman -Q)
while read -r pkg ver; do
	VERSION["${pkg}"]="${ver}"
done <<<"${version_list}"
echo "Collected versions for ${package_count} packages"
phase_end

#######################################
# Step 4: Foreign (AUR) detection
#######################################
log_phase "Identifying AUR packages"
phase_begin
declare -A FOREIGN
foreign_list=$(pacman -Qqm)
while read -r pkg; do
	FOREIGN["${pkg}"]=1
done <<<"${foreign_list}"
aur_count="${#FOREIGN[@]}"
echo "Identified ${aur_count} AUR packages"
phase_end

#######################################
# Step 5: Cache pacman -Qi
#######################################
log_phase "Caching pacman -Qi output"
phase_begin
PACMAN_QI_ALL="$(pacman -Qi)"
phase_end

log_phase "Caching URL information"
phase_begin
declare -A URL_CACHE
awk_output=$(awk '
    /^Name/ { pkg = $3 }
    /^URL/ { print "URL_CACHE["pkg"]=\""substr($0, index($0, ":") + 2) "\""}
' <<<"${PACMAN_QI_ALL}")
eval "${awk_output}"
phase_end

#######################################
# Step 6: Cache pacman -Si (repos)
#######################################
log_phase "Caching pacman -Si output"
phase_begin
PACMAN_SI_ALL="$(pacman -Si)"
phase_end

log_phase "Caching repository information"
phase_begin
declare -A REPO_CACHE
awk_output=$(awk '
    /^Repository/ { repo = $3 }
    /^Name/ { print "REPO_CACHE["$3"]=\""repo"\"" }
' <<<"${PACMAN_SI_ALL}")
eval "${awk_output}"
phase_end

get_repo() {
	local pkg="$1"
	local repo_raw="${REPO_CACHE[${pkg}]-}"

	if [[ -n ${repo_raw} ]]; then
		echo "${repo_raw}"
	elif [[ -n ${FOREIGN[${pkg}]-} ]]; then
		echo "aur"
	else
		echo "unknown"
	fi
}

#######################################
# Step 7: Precompute pactree (parallel)
#######################################
log_phase "Precomputing dependency trees (parallel: ${JOBS} jobs)"
phase_begin
printf '%s\n' "${all_packages[@]}" |
	pv -l -s "${package_count}" -N "pactree" |
	xargs -P "${JOBS}" -I{} "${SHELL_NAME}" ./collect-pactree.sh {} "${TMP_DIR}"
# Check for failures
if [[ -s "${TMP_DIR}/failures.log" ]]; then
	echo -e "\n--- Package Collection Failures ---"
	cat "${TMP_DIR}/failures.log"
	echo "-----------------------------------"
else
	echo "All packages processed successfully."
fi
phase_end

#######################################
# Step 8: JSON generation
#######################################
log_phase "Extracting dependencies & generating JSON Manifest"
phase_begin
MANIFEST="${TMP_DIR}/0_manifest.jsonl"
for pkg in "${all_packages[@]}"; do
	# 1. Dependency Data (from precomputed pactree files)
	deps=$(sed 's/.*/"&"/' "${TMP_DIR}/${pkg}.dep" | paste -sd, -)
	rdeps=$(sed 's/.*/"&"/' "${TMP_DIR}/${pkg}.rdep" | paste -sd, -)
	odeps=$(sed 's/.*/"&"/' "${TMP_DIR}/${pkg}.odep" | paste -sd, -)
	ordeps=$(sed 's/.*/"&"/' "${TMP_DIR}/${pkg}.ordep" | paste -sd, -)

	# 2. Repository & Locally Built Logic
	repo=$(get_repo "${pkg}")
	# Logic from your source: Foreign + exists in sync DB == rebuilt official package
	is_local="false"
	if [[ ${repo} != "aur" ]] && [[ -n ${FOREIGN["${pkg}"]-} ]]; then
		is_local="true"
	fi

	# 3. Create JSON Line
	printf '{"name":"%s","explicit":%s,"version":"%s","repo":"%s","locally_built":%s,"url":"%s","deps":[%s],"rdeps":[%s],"odeps":[%s],"ordeps":[%s]}\n' \
		"${pkg}" \
		"${EXPLICIT[${pkg}]:-false}" \
		"${VERSION[${pkg}]:-unknown}" \
		"${repo}" \
		"${is_local}" \
		"${URL_CACHE[${pkg}]-}" \
		"${deps-}" "${rdeps-}" "${odeps-}" "${ordeps-}"
done | pv -l -s "${package_count}" -N "json-gen" >"${MANIFEST}"
phase_end

log_phase "Using jq to finalize JSON structure"
phase_begin
jq -n -c \
	--arg os "${OS_NAME}" \
	--arg host "${HOSTNAME}" \
	--arg ts "${TIMESTAMP}" \
	--arg shell "${SHELL_NAME}" \
	'{info: {os: $os, hostname: $host, timestamp: $ts, shell: $shell},
    nodes: [inputs | {(.name): {
        explicit, version, repo, locally_built, url, 
        depends_on: .deps, 
        required_by: .rdeps, 
        optional_depends_on: .odeps, 
        optional_required_by: .ordeps
    }}] | add}' \
	<"${MANIFEST}" >"${OUTPUT_FILE}"
phase_end
#######################################
# Final summary
#######################################
SCRIPT_END_TS="$(now_ns)"
TOTAL_NS=$((SCRIPT_END_TS - SCRIPT_START_TS))

echo "" >&2
echo "=====================================" >&2
echo "Performance summary:" >&2
total_runtime=$(format_duration "${TOTAL_NS}")
printf "  Total runtime: %s\n" "${total_runtime}" >&2
printf "  Parallel jobs: %d\n" "${JOBS}" >&2
echo "=====================================" >&2
echo "Complete! Generated ${OUTPUT_FILE}" >&2
echo "Total packages: ${package_count}" >&2
echo "Explicit: ${explicit_count}" >&2
echo "Dependencies: $((package_count - explicit_count))" >&2
echo "" >&2
echo "To view the graph:" >&2
echo "  cd ui && pnpm dev" >&2
echo "  Then open http://localhost:3000 in your browser" >&2
