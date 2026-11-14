#!/bin/bash
set -e
cd -- "$(dirname -- "$0")"
if [ -f "local/server.mjs" ]; then
  server_path="local/server.mjs"
else
  server_path="server.mjs"
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Для запуска нужен Node.js 22 или новее: https://nodejs.org/"
  read -r -p "Нажмите Enter, чтобы закрыть окно."
  exit 1
fi
node "$server_path"
