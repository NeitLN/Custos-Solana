#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Chua cai Node.js — tai o https://nodejs.org"; exit 1; }
( sleep 1; (open http://localhost:8080/phong-van.html 2>/dev/null || xdg-open http://localhost:8080/phong-van.html 2>/dev/null || true) ) &
node phuc-vu.mjs 8080
