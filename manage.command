#!/bin/bash
set -e
cd "$(dirname "$0")"
export PYTHONUTF8=1
PYTHON_BIN="$(command -v python3 || true)"
if [ -z "$PYTHON_BIN" ]; then echo 'Python 3 را نصب کنید.'; read -r; exit 1; fi
if [ ! -x .venv/bin/python ]; then "$PYTHON_BIN" -m venv .venv; fi
if ! .venv/bin/python -c 'import numpy, sklearn' >/dev/null 2>&1; then
  echo 'نصب وابستگی‌های لازم برای آموزش Python...'
  .venv/bin/python -m pip install -r python/requirements.txt
fi
.venv/bin/python python/admin_server.py
