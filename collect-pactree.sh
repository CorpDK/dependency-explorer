#!/bin/bash
set -eu

pkg="$1"
tmp_dir="$2"
LOG_FILE="$tmp_dir/failures.log"

# Standard Cleanup: Removes tree chars, versions, and the root package
# 1. 's/^[├└│─ ]\+//g'        -> Removes the tree visual characters
# 2. 's/[<>=].*$//'           -> Removes versioning (e.g., >=1.2)
# 3. 's/ provides.*$//'       -> Removes " provides..." and everything after
# 4. '/^'"$pkg"'$/d'          -> Deletes the root package from the list
CLEANUP_REGEX='s/^[├└│─ ]\+//g; s/[<>=].*$//; s/ provides.*$//; /^'"$pkg"'$/d'

# Optional Cleanup: 
# 1. '/\(optional\)/!d'                     -> Selects only lines containing "(optional)"
# 2. 's/^[├└│─ ]+//'                        -> Removes the tree visual characters
# 3. 's/([^: ]+).+\[unresolvable\].*/\1*/'  -> If "[unresolvable]" is found, mark the package name with *
# 4. 's/([^: ]+).*/\1/'                     -> Strip everything after the package name (descriptions/tags)
# 5. '/^'"$pkg"'$/d'                        -> Remove the root package
OPT_REGEX='/\(optional\)/!d; s/^[├└│─ ]+//; s/([^: ]+).+\[unresolvable\].*/\1*/; s/([^: ]+).*/\1/; /^'"$pkg"'$/d'

# Function to log errors
log_error() {
  echo "[$(date +'%H:%M:%S')] Failed: $pkg ($1)" >> "$LOG_FILE"
}

# Direct dependencies
{
  pactree -d1 "$pkg" 2>/dev/null \
    | sed "$CLEANUP_REGEX" \
    | sort -u > "$tmp_dir/$pkg.dep"
} || { log_error "direct dep"; touch "$tmp_dir/$pkg.dep"; }

# Reverse dependencies
{
  pactree -r -d1 "$pkg" 2>/dev/null \
    | sed "$CLEANUP_REGEX" \
    | sort -u > "$tmp_dir/$pkg.rdep"
} || { log_error "reverse dep"; touch "$tmp_dir/$pkg.rdep"; }

# Direct optional dependencies
{
  pactree -d1 -o "$pkg" 2>/dev/null \
    | sed -E "$OPT_REGEX" \
    | sort -u > "$tmp_dir/$pkg.odep"
} || { log_error "direct optional dep"; touch "$tmp_dir/$pkg.odep"; }

# Reverse optional dependencies
{
  pactree -r -d1 -o "$pkg" 2>/dev/null \
    | sed -E "$OPT_REGEX" \
    | sort -u > "$tmp_dir/$pkg.ordep"
} || { log_error "reverse optional dep"; touch "$tmp_dir/$pkg.ordep"; }
