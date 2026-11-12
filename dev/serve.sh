#!/bin/sh
# Test the page in a normal browser with the mock shell: sh dev/serve.sh, then open http://127.0.0.1:8732
cd "$(dirname "$0")/.." && python3 build/build.py && rm -rf dev/www && cp -r dist dev/www && cp dev/mock-tauri.js dev/www/ &&
sed -i '' 's#<head>#<head><script src="mock-tauri.js"></script>#' dev/www/index.html && python3 -m http.server 8732 --bind 127.0.0.1 -d dev/www
