#!/bin/bash
#
# collect-deps.sh - Extract package dependency data for Arch-based distributions
#
# Generates timestamped JSON file containing installed packages with their
# dependencies and reverse dependencies.
#
# Usage:
#   ./collect-deps.sh [OPTIONS]
#
# Options:
#   -d, --debug              Enable debug mode (preserve temp directory)
#   -f, --first N            Collect first N explicit packages and their complete dependency trees (including optional deps)
#   -l, --last N             Collect last N explicit packages and their complete dependency trees (including optional deps)
#   -r, --random N           Collect random N explicit packages and their complete dependency trees (including optional deps)
#   -s, --select "x,y,z"     Collect specified packages (explicit or dependency) and their complete dependency trees (including optional deps)
#
# Examples:
#   ./collect-deps.sh                           # Collect all packages
#   ./collect-deps.sh --first 10                # Collect first 10 explicit packages
#   ./collect-deps.sh --last 5                  # Collect last 5 explicit packages
#   ./collect-deps.sh --random 8                # Collect 8 random explicit packages
#   ./collect-deps.sh --select "vim,firefox"    # Collect vim and firefox with deps
#   ./collect-deps.sh --select "glibc,systemd"  # Works with dependency packages too
#
# Output: ui/public/data/<OS-name>-<hostname>-<timestamp>.json
#

set -euo pipefail

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
  printf "[%s] %s\n" "${timestamp}" "$1"
}

log_error() {
  local timestamp
  timestamp=$(date '+%H:%M:%SZ%z' || true)
  printf "[%s] %s\n" "${timestamp}" "$1" >&2
}

PHASE_START=0
phase_begin() { PHASE_START="$(now_ns)"; }
phase_end() {
  local end
  end="$(now_ns)"
  local dur_ns=$((end - PHASE_START))
  local duration
  duration=$(format_duration "${dur_ns}")
  log_phase "→ Completed in ${duration}"
}

#######################################
# Distribution check
#######################################
if [[ ! -f /etc/os-release ]] || ! grep -qiE 'arch|manjaro|endeavouros' /etc/os-release || ! command -v pacman >/dev/null 2>&1; then
  log_error "Error: This script must be run on an Arch-based distribution (pacman not found or incompatible OS)."
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
  log_error "Error: The following commands are missing: ${MISSING_PKGS[*]}"

  # Check if pacman files database exists, if not, suggest update
  if [[ ! -d "/var/lib/pacman/sync" ]] || [[ -z "$(ls -A /var/lib/pacman/sync/*.files 2>/dev/null || true)" ]]; then
    log_error "Note: pacman-files database not found. Run 'sudo pacman -Fy' first."
  fi

  log_error "Searching for providing packages..."

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
      *) log_error "Warning: Could not find package for '${cmd}'" ;;
      esac
    fi
  done

  # Get unique packages to install
  UNIQUE_PKGS=$(echo "${INSTALL_LIST[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' ')

  if [[ -n ${UNIQUE_PKGS} ]]; then
    log_error "Please install the missing dependencies using:"
    log_error "  sudo pacman -S ${UNIQUE_PKGS}"
  fi
  exit 1
fi

#######################################
# Setup
#######################################
DEBUG=false
FILTER_MODE=""
FILTER_VALUE=""

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
  --debug | -d)
    DEBUG=true
    shift
    ;;
  --first | -f)
    if [[ -z ${2-} ]] || ! [[ $2 =~ ^[0-9]+$ ]]; then
      log_error "Error: --first requires a numeric argument"
      exit 1
    fi
    FILTER_MODE="first"
    FILTER_VALUE="$2"
    shift 2
    ;;
  --last | -l)
    if [[ -z ${2-} ]] || ! [[ $2 =~ ^[0-9]+$ ]]; then
      log_error "Error: --last requires a numeric argument"
      exit 1
    fi
    FILTER_MODE="last"
    FILTER_VALUE="$2"
    shift 2
    ;;
  --random | -r)
    if [[ -z ${2-} ]] || ! [[ $2 =~ ^[0-9]+$ ]]; then
      log_error "Error: --random requires a numeric argument"
      exit 1
    fi
    FILTER_MODE="random"
    FILTER_VALUE="$2"
    shift 2
    ;;
  --select | -s)
    if [[ -z ${2-} ]]; then
      log_error "Error: --select requires a comma-separated list of packages"
      exit 1
    fi
    FILTER_MODE="select"
    FILTER_VALUE="$2"
    shift 2
    ;;
  *)
    log_error "Unknown option: $1"
    log_error "Usage: $0 [--debug|-d] [--first|-f N] [--last|-l N] [--random|-r N] [--select|-s pkg1,pkg2,...]"
    exit 1
    ;;
  esac
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

log_phase "Arch-based Package Dependency Collector"
log_phase "========================================"
log_phase "OS: ${OS_NAME}"
log_phase "Hostname: ${HOSTNAME}"
log_phase "Parallel jobs: ${JOBS}"
log_phase "Shell: ${SHELL_NAME}"
log_phase "Temporary Dir: ${TMP_DIR}"

#######################################
# Step 1: Package list
#######################################
log_phase "Collecting package list"
phase_begin
pkg_list=$(pacman -Qq | sort)
mapfile -t all_packages <<<"${pkg_list}"
package_count="${#all_packages[@]}"
log_phase "Found ${package_count} packages"
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
log_phase "Found ${explicit_count} explicitly installed packages"
phase_end

#######################################
# Step 2.5: Filter packages (if requested)
#######################################
# Initialize filter info for JSON output
FILTER_TYPE="none"
FILTER_VALUE_JSON="null"

if [[ -n ${FILTER_MODE} ]]; then
  log_phase "Filtering packages (mode: ${FILTER_MODE})"
  phase_begin

  # Create lookup map for installed packages
  declare -A all_packages_map
  for pkg in "${all_packages[@]}"; do
    all_packages_map["${pkg}"]=1
  done

  # Get list of selected explicit packages
  mapfile -t explicit_array < <(echo "${explicit_list}")
  declare -a selected_packages=()

  case "${FILTER_MODE}" in
  first)
    selected_packages=("${explicit_array[@]:0:FILTER_VALUE}")
    log_phase "Selected first ${#selected_packages[@]} explicit packages"
    FILTER_TYPE="first"
    FILTER_VALUE_JSON="${FILTER_VALUE}"
    ;;
  last)
    start_idx=$((${#explicit_array[@]} - FILTER_VALUE))
    if ((start_idx < 0)); then
      start_idx=0
    fi
    selected_packages=("${explicit_array[@]:start_idx}")
    log_phase "Selected last ${#selected_packages[@]} explicit packages"
    FILTER_TYPE="last"
    FILTER_VALUE_JSON="${FILTER_VALUE}"
    ;;
  random)
    random_pkgs=$(printf '%s\n' "${explicit_array[@]}" | shuf -n "${FILTER_VALUE}")
    mapfile -t selected_packages <<<"${random_pkgs}"
    log_phase "Selected ${#selected_packages[@]} random explicit packages"
    FILTER_TYPE="select"
    # Convert comma-separated list to JSON array
    FILTER_VALUE_JSON=$(printf '%s\n' "${selected_packages[@]}" | jq -R . | jq -s .)
    ;;
  select)
    IFS=',' read -ra selected_packages <<<"${FILTER_VALUE}"
    log_phase "Selected ${#selected_packages[@]} packages"
    # Verify packages are installed (explicit or dependency)
    for pkg in "${selected_packages[@]}"; do
      if [[ -z ${all_packages_map[${pkg}]-} ]]; then
        log_error "Error: Package '${pkg}' is not installed"
        exit 1
      fi
    done
    FILTER_TYPE="select"
    # Convert comma-separated list to JSON array
    FILTER_VALUE_JSON=$(printf '%s\n' "${selected_packages[@]}" | jq -R . | jq -s .)
    ;;
  *)
    log_error "Error: Unknown filter mode '${FILTER_MODE}'"
    exit 1
    ;;
  esac

  # Display selected packages
  log_phase "Selected packages:"
  for pkg in "${selected_packages[@]}"; do
    log_phase "  - ${pkg}"
  done

  # Build complete dependency tree for selected packages
  declare -A included_packages

  # Pactree output cleanup regex:
  # 1. '/\[unresolvable\]/d' -> Remove unresolvable packages (not installed)
  # 2. 's/^[├─└│ ]*//'       -> Removes tree visual characters (box-drawing chars)
  # 3. 's/ provides.*//'     -> Removes "provides" clauses and everything after
  # 4. 's/[<>=].*$//'        -> Removes version constraints (e.g., >=1.2, <2.0)
  # 5. 's/:.*$//'            -> Removes descriptions after colon (e.g., ": Image output...")
  PACTREE_CLEANUP_REGEX='/\[unresolvable\]/d; s/^[├─└│ ]*//; s/ provides.*//; s/[<>=].*$//; s/:.*$//'

  log_phase "Building complete dependency tree..."
  for pkg in "${selected_packages[@]}"; do
    # Get complete tree with pactree -o (includes optional deps)
    # Parse output to extract clean package names
    pactree_out=$(pactree -o "${pkg}" 2>/dev/null | sed "${PACTREE_CLEANUP_REGEX}" | sort -u)
    while IFS= read -r dep_pkg; do
      if [[ -n ${dep_pkg} ]]; then
        included_packages["${dep_pkg}"]=1
      fi
    done <<<"${pactree_out}"
  done

  # Filter all_packages to only include packages in dependency tree
  declare -a filtered_packages=()
  for pkg in "${all_packages[@]}"; do
    if [[ -n ${included_packages[${pkg}]-} ]]; then
      filtered_packages+=("${pkg}")
    fi
  done

  # Count explicit packages in filtered set
  new_explicit_count=0
  for pkg in "${filtered_packages[@]}"; do
    if [[ -n ${EXPLICIT[${pkg}]-} ]]; then
      ((new_explicit_count++)) || true
    fi
  done
  explicit_count="${new_explicit_count}"

  all_packages=("${filtered_packages[@]}")
  package_count="${#all_packages[@]}"
  log_phase "Total packages in dependency tree: ${package_count}"
  log_phase "Explicit packages in filtered set: ${explicit_count}"
  phase_end
fi

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
log_phase "Collected versions for ${#VERSION[@]} packages"
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
log_phase "Identified ${aur_count} AUR packages"
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
  pv -u shaded -l -s "${package_count}" -N "[$(date '+%H:%M:%SZ%z' || true)] pactree" |
  xargs -P "${JOBS}" -I{} "${SHELL_NAME}" ./collect-pactree.sh {} "${TMP_DIR}"
# Check for failures
if [[ -s "${TMP_DIR}/failures.log" ]]; then
  log_error "Package Collection Failures"
  while IFS= read -r line; do
    log_error "${line}"
  done <"${TMP_DIR}/failures.log"
  log_error "-----------------------------------"
else
  log_phase "All packages processed successfully"
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
done | pv -u shaded -l -s "${package_count}" -N "[$(date '+%H:%M:%SZ%z' || true)] json-gen" >"${MANIFEST}"
phase_end

log_phase "Using jq to finalize JSON structure"
phase_begin
jq -n -c \
  --arg os "${OS_NAME}" \
  --arg host "${HOSTNAME}" \
  --arg ts "${TIMESTAMP}" \
  --arg shell "${SHELL_NAME}" \
  --arg filter_type "${FILTER_TYPE}" \
  --argjson filter_value "${FILTER_VALUE_JSON}" \
  '{info: {os: $os, hostname: $host, timestamp: $ts, shell: $shell, filter: {type: $filter_type, value: $filter_value}},
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

log_phase "====================================="
log_phase "Performance summary:"
total_runtime=$(format_duration "${TOTAL_NS}")
log_phase "Total runtime: ${total_runtime}"
log_phase "Parallel jobs: ${JOBS}"
log_phase "====================================="
log_phase "Complete! Generated ${OUTPUT_FILE}"
log_phase "Total packages: ${package_count}"
log_phase "Explicit: ${explicit_count}"
log_phase "Dependencies: $((package_count - explicit_count))"
log_phase "To view the graph:"
log_phase "  cd ui && pnpm dev"
log_phase "  Then open http://localhost:3000 in your browser"
