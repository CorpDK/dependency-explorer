#!/bin/bash
#
# collect-deps.sh - Extract Manjaro package dependency data
#
# Generates graph.json containing all installed packages with their
# direct dependencies and reverse dependencies.
#
# Requirements: pacman, pactree
# Output: ui/graph.json
#

set -euo pipefail

OUTPUT_FILE="ui/graph.json"

echo "Manjaro Package Dependency Collector" >&2
echo "=====================================" >&2
echo "" >&2

# Step 1: Get all installed packages
echo "Collecting package list..." >&2
all_packages=$(pacman -Qq)
package_count=$(echo "$all_packages" | wc -l)
echo "Found $package_count packages" >&2
echo "" >&2

# Step 2: Get explicitly installed packages
echo "Identifying explicitly installed packages..." >&2
explicit_packages=$(pacman -Qe | awk '{print $1}')
explicit_count=$(echo "$explicit_packages" | wc -l)
echo "Found $explicit_count explicitly installed packages" >&2
echo "" >&2

# Step 3: Build explicit package lookup map
declare -A explicit_map
for pkg in $explicit_packages; do
    explicit_map[$pkg]=1
done

# Step 4: Initialize JSON output
echo '{"nodes":{' > "$OUTPUT_FILE"

# Step 5: Process each package
echo "Extracting dependencies..." >&2
current=0
first=1

for pkg in $all_packages; do
    current=$((current + 1))

    # Show progress every 50 packages
    if [ $((current % 50)) -eq 0 ] || [ $current -eq $package_count ]; then
        echo "Progress: $current/$package_count packages processed" >&2
    fi

    # Determine if package is explicitly installed
    if [[ -n "${explicit_map[$pkg]:-}" ]]; then
        is_explicit="true"
    else
        is_explicit="false"
    fi

    # Extract direct dependencies (depth 1)
    # pactree outputs the package itself as root, then dependencies
    # We skip the first line and parse the tree structure
    depends_on=$(pactree -d1 "$pkg" 2>/dev/null | \
                 tail -n +2 | \
                 grep -v 'provides' | \
                 sed 's/^[├└│─ ]\+//g' | \
                 awk '{print $1}' | \
                 sort -u || echo "")

    # Extract reverse dependencies (packages that depend on this one)
    required_by=$(pactree -r -d1 "$pkg" 2>/dev/null | \
                  tail -n +2 | \
                  grep -v 'provides' | \
                  sed 's/^[├└│─ ]\+//g' | \
                  awk '{print $1}' | \
                  sort -u || echo "")

    # Build JSON arrays for dependencies
    deps_json=""
    if [ -n "$depends_on" ]; then
        deps_json=$(echo "$depends_on" | awk '{printf "\"%s\",", $0}' | sed 's/,$//')
    fi

    # Build JSON arrays for reverse dependencies
    reqs_json=""
    if [ -n "$required_by" ]; then
        reqs_json=$(echo "$required_by" | awk '{printf "\"%s\",", $0}' | sed 's/,$//')
    fi

    # Escape package name for JSON (handle special characters)
    pkg_escaped="${pkg//\"/\\\"}"

    # Add comma separator for all entries except the first
    if [ $first -eq 0 ]; then
        echo "," >> "$OUTPUT_FILE"
    fi
    first=0

    # Write package entry to JSON (no newline, inline format)
    printf '"%s":{"explicit":%s,"depends_on":[%s],"required_by":[%s]}' \
           "$pkg_escaped" "$is_explicit" "$deps_json" "$reqs_json" >> "$OUTPUT_FILE"
done

# Step 6: Close JSON structure
echo '' >> "$OUTPUT_FILE"
echo '}}' >> "$OUTPUT_FILE"

echo "" >&2
echo "=====================================" >&2
echo "Complete! Generated $OUTPUT_FILE" >&2
echo "Total packages: $package_count" >&2
echo "Explicit: $explicit_count" >&2
echo "Dependencies: $((package_count - explicit_count))" >&2
echo "" >&2
echo "To view the graph, open ui/index.html in a web browser" >&2
