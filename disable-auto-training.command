#!/bin/bash
set -e
cd "$(dirname "$0")"
python3 python/install_scheduler.py uninstall
