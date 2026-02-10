#!/bin/bash
set -eu

pkg="$1"
tmp_dir="$2"
LOG_FILE="${tmp_dir}/failures.log"

# Escape special regex characters in package name for use in patterns
# This ensures packages like "dbus-c++" are matched literally, not as regex
pkg_escaped=$(printf '%s\n' "${pkg}" | sed 's/[][\\.*^$+?{}()|]/\\&/g')

# Standard Cleanup: Removes tree chars, versions, and the root package
# 1. '/\(optional\)/d'        -> Removes lines containing "(optional)"
# 2. 's/^[├└│─ ]+//'          -> Removes the tree visual characters
# 3. 's/[<>=].*$//'           -> Removes versioning (e.g., >=1.2)
# 4. 's/([^: ]+).*/\1/'       -> Strip everything after the package name (descriptions/tags)
# 5. '/^'"${pkg_escaped}"'$/d'  -> Deletes the root package from the list
NON_OPT_REGEX='/\(optional\)/d; s/^[├└│─ ]+//; s/[<>=].*$//; s/([^: ]+).*/\1/; /^'"${pkg_escaped}"'$/d'

# Optional Cleanup:
# 1. '/\(optional\)/!d'                     -> Selects only lines containing "(optional)"
# 2. 's/^[├└│─ ]+//'                        -> Removes the tree visual characters
# 3. 's/([^: ]+).+\[unresolvable\].*/\1*/'  -> If "[unresolvable]" is found, mark the package name with *
# 4. 's/([^: ]+).*/\1/'                     -> Strip everything after the package name (descriptions/tags)
# 5. '/^'"${pkg_escaped}"'$/d'  -> Deletes the root package from the list
OPT_REGEX='/\(optional\)/!d; s/^[├└│─ ]+//; s/([^: ]+).+\[unresolvable\].*/\1*/; s/([^: ]+).*/\1/; /^'"${pkg_escaped}"'$/d'

# Function to log errors
log_error() {
  local reason="$1"
  echo "Failed: ${pkg} (${reason})" >>"${LOG_FILE}"
  return 0
}

# 1. Process Direct Dependencies (Mandatory + Optional)
if output=$(pactree -d1 -o "${pkg}" 2>/dev/null); then
  # Extract Mandatory Dependencies
  echo "${output}" | sed -E "${NON_OPT_REGEX}" | sort -u >"${tmp_dir}/${pkg}.dep" || true

  # Extract Optional Dependencies
  echo "${output}" | sed -E "${OPT_REGEX}" | sort -u >"${tmp_dir}/${pkg}.odep" || true
else
  log_error "direct dep tree"
  touch "${tmp_dir}/${pkg}.dep" "${tmp_dir}/${pkg}.odep"
fi

# 2. Process Reverse Dependencies (Mandatory + Optional)
if r_output=$(pactree -r -d1 -o "${pkg}" 2>/dev/null); then
  # Extract Mandatory Reverse Dependencies
  echo "${r_output}" | sed -E "${NON_OPT_REGEX}" | sort -u >"${tmp_dir}/${pkg}.rdep" || true

  # Extract Optional Reverse Dependencies
  echo "${r_output}" | sed -E "${OPT_REGEX}" | sort -u >"${tmp_dir}/${pkg}.ordep" || true
else
  log_error "reverse dep tree"
  touch "${tmp_dir}/${pkg}.rdep" "${tmp_dir}/${pkg}.ordep"
fi
