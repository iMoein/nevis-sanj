"""Install/uninstall an opt-in hourly macOS launchd job for local training."""
from __future__ import annotations
import argparse
import os
import plistlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LABEL = 'com.nevissanj.auto-training'
PLIST = Path.home() / 'Library' / 'LaunchAgents' / (LABEL + '.plist')
PYTHON = ROOT / '.venv' / 'bin' / 'python'


def launchctl(*args):
    return subprocess.run(['launchctl', *args], capture_output=True, text=True)


def install():
    if not PYTHON.is_file():
        raise SystemExit('ابتدا یک بار bash manage.command را اجرا کنید تا Python آماده شود.')
    PLIST.parent.mkdir(parents=True, exist_ok=True)
    logs = ROOT / 'admin_data'
    logs.mkdir(parents=True, exist_ok=True)
    payload = {
        'Label': LABEL, 'RunAtLoad': True, 'StartInterval': 3600,
        'ProgramArguments': [str(PYTHON), str(ROOT / 'python' / 'auto_training.py'), '--once'],
        'WorkingDirectory': str(ROOT),
        'EnvironmentVariables': {'NEVIS_SCHEDULED': '1'},
        'StandardOutPath': str(logs / 'auto-training.log'),
        'StandardErrorPath': str(logs / 'auto-training-error.log'),
    }
    domain = f'gui/{os.getuid()}'
    launchctl('bootout', domain, str(PLIST))
    PLIST.write_bytes(plistlib.dumps(payload))
    r = launchctl('bootstrap', domain, str(PLIST))
    if r.returncode:
        raise SystemExit('launchd error: ' + (r.stderr or r.stdout).strip())
    print('✓ آموزش خودکار هر یک ساعت روی مک فعال شد، حتی وقتی پنل بسته است.')
    print('✓ مدل‌ها فقط به‌صورت آزمایشی ساخته می‌شوند؛ انتشار عمومی دستی است.')
    print(f'پوشه اطلاعات محلی: {logs}')


def uninstall():
    launchctl('bootout', f'gui/{os.getuid()}', str(PLIST))
    PLIST.unlink(missing_ok=True)
    print('✓ زمان‌بندی خودکار غیرفعال شد. داده‌ها و مدل‌های قبلی حفظ شدند.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=('install', 'uninstall'))
    install() if parser.parse_args().action == 'install' else uninstall()
