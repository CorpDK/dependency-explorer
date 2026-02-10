#!/bin/bash

# 1. Detect Container Engine
if command -v podman &>/dev/null; then
  ENGINE="podman"
elif command -v docker &>/dev/null; then
  ENGINE="docker"
else
  echo "Error: Neither podman nor docker found." >&2
  exit 1
fi

IMAGE_NAME="final-test-image"
HOSTNAME="sample-system"

PWDIR="$(pwd || true)"

# 2. Ensure the host data directory exists
mkdir -p "${PWDIR}/sample-generator/data"

echo "Using engine: ${ENGINE}"

# 3. Build the image
echo "Building image..."
${ENGINE} build -t "${IMAGE_NAME}" -f sample-generator/Dockerfile.arch .

# 4. Run with host mount
# -v "$(pwd)/data:/data" maps the host ./data folder to the container /data folder
echo "Running container as ${HOSTNAME} with host mount..."
${ENGINE} run -it \
  --rm \
  --hostname "${HOSTNAME}" \
  -v "${PWDIR}/sample-generator/data:/data" \
  "${IMAGE_NAME}"

mv "${PWDIR}/sample-generator/data"/arch-sample-system*.json "${PWDIR}/ui/public/data/arch-sample-system-c.json"

jq . "${PWDIR}/ui/public/data/arch-sample-system-c.json" >"${PWDIR}/ui/public/data/arch-sample-system.json"

rm "${PWDIR}/ui/public/data/arch-sample-system-c.json"

rmdir "${PWDIR}/sample-generator/data"

echo "Done!"
