#!/bin/bash
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js نصب نیست. لطفا Node.js نسخه ۱۸ یا بالاتر را نصب کنید.'
  read -r -p 'Enter را بزنید...' _
  exit 1
fi
(sleep 1; open 'http://127.0.0.1:4173') &
node server.mjs
