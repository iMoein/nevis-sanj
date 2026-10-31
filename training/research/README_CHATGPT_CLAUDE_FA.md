# گسترش آزمایشی نویس‌سنج برای GPT و Claude

این مجموعه مخصوص آموزش و اعتبارسنجی آزمایشی `python/engine_v3.py` است و نباید بدون ارزیابی مستقل به `models/published` یا `dist/models` منتقل شود.

## منابع و مجوزها
- انگلیسی: [artnitolog/llm-generated-texts](https://huggingface.co/datasets/artnitolog/llm-generated-texts)، متن انسانی و GPT-4 Turbo / GPT-4o / Claude 3 Opus برای موضوع‌های مشترک. مجوز صریح در کارت داده مشخص نیست؛ استفاده پژوهشی محلی، بدون بازنشر.
- فارسی GPT: [asrinvakili/persian-ai-text-corpus](https://github.com/asrinvakili/persian-ai-text-corpus)، خروجی GPT-4o-mini. متن‌های AI تابع شرایط ارائه‌دهندگان اعلام شده‌اند؛ استفاده پژوهشی.
- فارسی Claude: [shahryars/vazirweb-persian-social-media-content](https://huggingface.co/datasets/shahryars/vazirweb-persian-social-media-content)، خروجی فارسی فیلد output از پیام Claude. مجوز CC BY 4.0. در کارت دیتاست و dataset_info شماره نسخه Claude متفاوت گزارش شده است؛ پس در دیتابیس `claude-sonnet-4.x-unverified` ثبت شده.

همه انتساب مدل‌ها بر اساس ادعای ناشرند و تأیید رمزنگاری‌شده ندارند. برای ChatGPT دقیقاً از مدل‌های OpenAI استفاده شده، نه الزاماً UI سرویس ChatGPT.

## ایمنی آموزش
- جداسازی قطعی ۲۰٪ موضوع‌ها/گروه‌های هر منبع برای آزمون بیرونی، پیش از وارد کردن دیتا به SQLite.
- نمونه‌های یک prompt/group در train و holdout پخش نمی‌شوند.
- حذف تکرار با هش متن نرمال‌شده و فیلترهای طول و زبان.
- `admin_data/benchmark-chatgpt-claude/*-external-heldout.jsonl` به‌هیچ‌وجه نباید در دیتابیس آموزشی وارد شود.
- مقایسه نسخه قبلی و جدید با `tools/evaluate_chatgpt_claude_v3.py`. آزمون مستقل هر زبان باید FPR و AI recall را به‌تفکیک تولیدکننده گزارش دهد.

## اجرای مجدد
```bash
.venv/bin/python tools/import_chatgpt_claude_corpora.py --import-corpus
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .venv/bin/python python/engine_v3.py --lang fa --limit-per-class 4000
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .venv/bin/python python/engine_v3.py --lang en --limit-per-class 6000
```

دریافت داده از منابع اینترنتی ممکن است بعداً تغییر کند، و نسخه‌بندی تولیدکننده، مجوز و منشأ نمونه‌ها همیشه باید بررسی شود. این کار آزمایش تعمیم‌پذیری است، نه اثبات نهایی تشخیص متن تولیدشده با AI.
