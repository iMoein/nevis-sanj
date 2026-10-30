#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -d .git ]; then
  echo 'این پوشه هنوز به مخزن GitHub متصل نیست.'
  echo 'یک بار مراحل README_FA.md را برای ساخت مخزن انجام بدهید.'
  read -r -p 'Enter برای خروج...'
  exit 1
fi
if ! git remote get-url origin >/dev/null 2>&1; then
  echo 'ابتدا remote مخزن را مشخص کنید.'; exit 1
fi
if [ ! -f models/published/fa.json ] && [ ! -f models/published/en.json ]; then
  echo 'ابتدا در پنل مدیریت مدل تأییدشده منتشر کنید.'; exit 1
fi
if [ -n "$(git status --porcelain --untracked-files=no | grep -v '^.. models/published/' || true)" ]; then
  echo 'در مخزن تغییرات دیگری وجود دارد؛ برای جلوگیری از انتشار ناخواسته، تغییرات را خودتان بررسی کنید.'
  exit 1
fi
git add models/published/*.json models/published/*.onnx 2>/dev/null || git add models/published/*.json
git diff --cached --quiet && { echo 'تغییر جدیدی برای انتشار وجود ندارد.'; exit 0; }
git commit -m "Publish verified NevisSanj browser model"
git push
printf '\nمدل‌ها ارسال شدند؛ پس از اجرای GitHub Actions، سایت به‌روز می‌شود.\n'
