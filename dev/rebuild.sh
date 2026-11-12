#!/bin/sh
# Rebuild into the running test server's folder (see serve.sh)
cd "$(dirname "$0")/.." && python3 build/build.py && cp dist/index.html dev/www/index.html && sed -i '' 's#<head>#<head><script src="mock-tauri.js"></script>#' dev/www/index.html
