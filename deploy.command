#!/bin/bash
# One-time first publish for iMoein/nevis-sanj. Does not upload admin_data.
set -euo pipefail
cd "$(dirname "$0")"
EXPECTED='https://github.com/iMoein/nevis-sanj.git'
if ! command -v git >/dev/null; then echo 'Git در سیستم پیدا نشد.'; exit 1; fi
if ! command -v gh >/dev/null; then echo 'GitHub CLI پیدا نشد: brew install gh'; exit 1; fi
gh auth status >/dev/null
if ! gh repo view iMoein/nevis-sanj >/dev/null 2>&1; then
  echo 'مخزن iMoein/nevis-sanj در GitHub پیدا نشد. از طریق GitHub مخزن را بسازید.'; exit 1
fi
if [ ! -d .git ]; then git init -b main; fi
if git remote get-url origin >/dev/null 2>&1; then
  CURRENT="$(git remote get-url origin)"
  if [ "$CURRENT" != "$EXPECTED" ] && [ "$CURRENT" != 'git@github.com:iMoein/nevis-sanj.git' ]; then
    echo "این پوشه از قبل به مخزن دیگری متصل است: $CURRENT"; exit 1
  fi
else git remote add origin "$EXPECTED"; fi
if [ -e admin_data ]; then echo 'داده خصوصی در admin_data وجود دارد و طبق .gitignore ارسال نمی‌شود.'; fi
# Explicitly inspect tracked paths to prevent accidental private data disclosure.
git add .
if git diff --cached --name-only | grep -E '^(admin_data/|\.venv/|node_modules/|cache/)' >/dev/null; then
  echo 'فایل خصوصی در مرحله انتشار پیدا شد؛ انتشار لغو شد.'; exit 1
fi
if ! git diff --cached --quiet; then git commit -m "NevisSanj 2.4.0: public detector and private training studio"; fi
BRANCH="$(git branch --show-current)"
if [ "$BRANCH" != 'main' ]; then echo 'برای اولین انتشار باید روی شاخه main باشید.'; exit 1; fi
printf '\nارسال فایل‌های پروژه به GitHub...\n'
git push -u origin main
printf '\nفعال‌سازی GitHub Pages در حال بررسی است...\n'
if gh api "repos/iMoein/nevis-sanj/pages" >/dev/null 2>&1; then
  gh api --method PUT 'repos/iMoein/nevis-sanj/pages' -f build_type=workflow >/dev/null 2>&1 || true
else
  gh api --method POST 'repos/iMoein/nevis-sanj/pages' -f build_type=workflow >/dev/null 2>&1 || echo 'اگر Pages فعال نشد: Settings > Pages > Source: GitHub Actions'
fi
gh workflow run pages.yml --repo iMoein/nevis-sanj || true
printf '\nفایل‌ها ارسال شدند. وضعیت انتشار را در GitHub > Actions بررسی کنید.\n'
printf 'پس از موفقیت Workflow آدرس سایت: https://imoein.github.io/nevis-sanj/\n'
