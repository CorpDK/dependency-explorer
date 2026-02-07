#!/bin/bash

cd /test || true
mkdir -p ./ui/public/data
./collect-deps.sh -s zsh,fastfetch,dbus,bash
mv ./ui/public/data/*.json /data/arch-sample-system.json
echo "Analysis complete. Hostname: $(hostname || true)"
echo "File saved to /data/"
