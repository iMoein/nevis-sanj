#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then echo 'ابتدا bash manage.command را یک بار اجرا کنید.'; exit 1; fi
.venv/bin/python python/install_scheduler.py install
