"use strict";
/**
 * NevisSanj: transparent, local-only writing-pattern inspector.
 * This is not a classifier of authorship. No network calls, models, or training data.
 */
var NevisEngine;
(function (NevisEngine) {
    const RULES = [
        {
            id: 'fa-generic-intro', category: 'cliche', title: 'مقدمه‌های کلیشه‌ای',
            description: 'شروع‌های عمومی که اغلب اطلاعات مشخصی درباره موضوع نمی‌دهند.',
            caveat: 'این عبارت‌ها در نوشته‌های انسانی، به‌ویژه متن‌های رسمی، هم رایج‌اند.',
            severity: 'medium', weight: 7,
            phrases: ['در دنیای امروز', 'در دنیای مدرن', 'در عصر دیجیتال', 'در عصر حاضر', 'در جهان امروز', 'با پیشرفت روزافزون فناوری', 'در دنیای پرشتاب امروز', 'در چشم انداز امروز']
        },
        {
            id: 'fa-boilerplate', category: 'cliche', title: 'تعبیرهای عمومی و قالبی',
            description: 'عبارت‌های پرکاربرد و کم‌جزئیات که ممکن است متن را بیش از حد عمومی کنند.',
            caveat: 'وجود یک یا دو تعبیر قالبی برای تشخیص منشأ متن کافی نیست.',
            severity: 'low', weight: 3,
            phrases: ['نقش کلیدی ایفا می کند', 'نقش مهمی ایفا می کند', 'اهمیت ویژه ای دارد', 'از اهمیت بالایی برخوردار است', 'امری ضروری است', 'گامی مهم در راستای', 'بستر مناسبی فراهم می کند', 'راهکارهای نوآورانه', 'چالش ها و فرصت ها', 'لازم به ذکر است', 'شایان ذکر است', 'بدون شک', 'بی شک', 'در این راستا', 'افق های جدیدی']
        },
        {
            id: 'fa-balanced-rhetoric', category: 'cliche', title: 'قالب‌های بلاغی از پیش‌ساخته',
            description: 'ساختارهای تأکیدی و دوگانه که در متن‌های قالبی زیاد دیده می‌شوند.',
            caveat: 'این الگوها بخشی طبیعی از فن بیان و نگارش فارسی هم هستند.',
            severity: 'low', weight: 3,
            phrases: ['نه تنها', 'بلکه همچنین', 'از یک سو', 'از سوی دیگر', 'به عبارت دیگر', 'به طور کلی', 'در مجموع می توان گفت', 'در نهایت می توان گفت']
        },
        {
            id: 'fa-transitions', category: 'transition', title: 'عبارت‌های اتصال پرتکرار',
            description: 'تکرار پیوندهای صریح ممکن است نشانه نگارش بیش از حد الگومند باشد.',
            caveat: 'در مقاله‌های آموزشی و پژوهشی، این پیوندها کاملا معمول‌اند.',
            severity: 'low', weight: 2,
            phrases: ['علاوه بر این', 'همچنین', 'از طرفی', 'از سوی دیگر', 'در نتیجه', 'در نهایت', 'در مقابل', 'به همین دلیل', 'با این حال', 'از این رو']
        },
        {
            id: 'fa-model-reference', category: 'self-reference', title: 'خودارجاعی مستقیم به مدل هوش مصنوعی',
            description: 'متن مستقیما از جایگاه یک مدل هوش مصنوعی یا دستیار زبانی صحبت می‌کند.',
            caveat: 'ممکن است متن صرفا نقل‌قول، آموزش یا توضیحی درباره هوش مصنوعی باشد.',
            severity: 'high', weight: 16,
            phrases: ['به عنوان یک مدل زبانی', 'به عنوان یک مدل هوش مصنوعی', 'من یک مدل زبانی هستم', 'من یک هوش مصنوعی هستم', 'به عنوان یک دستیار هوش مصنوعی']
        },
        {
            id: 'en-generic-intro', category: 'cliche', title: 'مقدمه‌های کلیشه‌ای انگلیسی',
            description: 'شروع‌های کلی و فرمولی در نثر انگلیسی.',
            caveat: 'این عبارت‌ها در بازاریابی، آموزش و نگارش انسانی هم دیده می‌شوند.',
            severity: 'medium', weight: 7,
            phrases: ["in today's fast-paced world", "in today's digital age", 'in the ever-evolving landscape', 'in the modern era', 'in a world where', 'as technology continues to evolve']
        },
        {
            id: 'en-boilerplate', category: 'cliche', title: 'عبارت‌های کلیشه‌ای انگلیسی',
            description: 'ترکیب‌های عمومی و پرکاربرد که ممکن است ارزش اطلاعاتی کمی داشته باشند.',
            caveat: 'تک‌عبارت‌های رایج هیچ منشأ مشخصی را اثبات نمی‌کنند.',
            severity: 'low', weight: 3,
            phrases: ['it is important to note that', 'plays a crucial role', 'delve into', 'a testament to', 'unlock the potential', 'navigating the complexities', 'a wide range of', 'in conclusion', 'in summary', 'it is worth noting', 'seamlessly integrate', 'the realm of', 'pivotal role']
        },
        {
            id: 'en-transitions', category: 'transition', title: 'پیوندهای پرتکرار انگلیسی',
            description: 'چگالی بالای پیوندهای رسمی ممکن است نشانه الگوی تکراری نگارش باشد.',
            caveat: 'در مقاله‌های رسمی وجود این واژه‌ها طبیعی است.',
            severity: 'low', weight: 2,
            phrases: ['moreover', 'furthermore', 'additionally', 'consequently', 'nevertheless', 'on the other hand', 'as a result']
        },
        {
            id: 'en-model-reference', category: 'self-reference', title: 'خودارجاعی مستقیم انگلیسی به مدل',
            description: 'عبارت‌هایی که گوینده را یک دستیار یا مدل هوش مصنوعی معرفی می‌کنند.',
            caveat: 'ممکن است بخش نقل‌قول یا مثال باشد و لزوما نشان‌دهنده نویسنده متن نباشد.',
            severity: 'high', weight: 16,
            phrases: ['as an ai language model', 'as a large language model', 'as an ai assistant', 'i am an ai language model']
        },
        {
            id: 'fa-significance-inflation', category: 'rhetoric', title: 'بزرگ‌نمایی اهمیت موضوع',
            description: 'به‌جای توضیح اثر قابل سنجش، چند تعبیر برای برجسته‌کردن اهمیت موضوع به کار رفته است.',
            caveat: 'در متن تبلیغاتی، انگیزشی یا خبر رسمی این عبارات انسانی و طبیعی هم هستند.',
            severity: 'low', weight: 3, minHits: 2,
            phrases: ['نقطه عطفی در', 'تحولی شگرف', 'تحولی چشمگیر', 'نقشی حیاتی در', 'تاثیر عمیقی بر', 'تأثیر عمیقی بر', 'بیش از هر زمان دیگری', 'بخشی جدایی ناپذیر از', 'اهمیتی انکارناپذیر', 'دستاوردی چشمگیر', 'پتانسیل عظیم', 'اهمیت روزافزون']
        },
        {
            id: 'en-significance-inflation', category: 'rhetoric', title: 'بزرگ‌نمایی اهمیت در انگلیسی',
            description: 'مجموعه‌ای از تعابیر پرطمطراق برای برجسته‌کردن موضوع بدون شواهد متناظر.',
            caveat: 'نثر تبلیغاتی یا ادبی انسان نیز می‌تواند همین سبک را داشته باشد.',
            severity: 'low', weight: 3, minHits: 2,
            phrases: ['stands as a testament to', 'marks a significant milestone', 'has left an indelible mark', 'a vibrant tapestry', 'ever-evolving landscape', 'a beacon of hope', 'pivotal moment in', 'underscores the importance of', 'a cornerstone of', 'transformative power of']
        },
        {
            id: 'fa-vague-attribution', category: 'attribution', title: 'ارجاع مبهم به نظر یا پژوهش دیگران',
            description: 'ادعاهایی به «کارشناسان» یا «تحقیقات» نسبت داده شده، بدون اینکه منبع در خود عبارت مشخص شود.',
            caveat: 'این یک ضعف احتمالی در استناد است، نه ویژگی اختصاصی متن هوش مصنوعی؛ صحت منابع باید دستی بررسی شود.',
            severity: 'low', weight: 3, minHits: 2,
            phrases: ['بسیاری از کارشناسان معتقدند', 'کارشناسان بر این باورند', 'برخی پژوهش ها نشان می دهند', 'مطالعات نشان داده اند', 'تحقیقات نشان داده است', 'پژوهش ها حاکی از آن است', 'به گفته کارشناسان', 'بسیاری بر این باورند', 'به باور بسیاری از صاحب نظران']
        },
        {
            id: 'en-vague-attribution', category: 'attribution', title: 'ارجاع کلی و بدون منبع',
            description: 'ارجاع کلی به کارشناسان و مطالعات، بدون مشخص‌کردن سند در همان بخش.',
            caveat: 'این عبارت‌ها در نگارش انسانی هم دیده می‌شوند؛ لینک یا فهرست منابع ممکن است در بخش دیگری آمده باشد.',
            severity: 'low', weight: 3, minHits: 2,
            phrases: ['experts widely agree', 'many experts believe', 'studies have shown that', 'research suggests that', 'it is widely believed', 'observers have noted', 'widely regarded as', 'some scholars argue', 'according to experts']
        },
        {
            id: 'fa-future-coda', category: 'cliche', title: 'جمع‌بندی عمومی درباره آینده و چالش‌ها',
            description: 'چند عبارت پایان‌بندی درباره فرصت‌ها، چالش‌ها و آینده دیده می‌شود.',
            caveat: 'بخش نتیجه‌گیری در متون دانشگاهی یا مدیریتی هم ممکن است عمداً آینده‌نگر باشد.',
            severity: 'low', weight: 3, minHits: 2,
            phrases: ['با چالش ها و فرصت های فراوانی', 'فرصت ها و چالش های پیش رو', 'آینده ای روشن تر', 'راه را برای آینده ای', 'در سال های آینده شاهد', 'برای تحقق این چشم انداز', 'با همکاری همه ذینفعان', 'برای دستیابی به آینده ای پایدار']
        },
        {
            id: 'en-future-coda', category: 'cliche', title: 'نتیجه‌گیری کلیشه‌ای درباره چشم‌انداز',
            description: 'نتیجه‌گیری به جای جمع‌بندی دقیق ادعاها به «فرصت‌ها و چالش‌ها» متوسل شده است.',
            caveat: 'این نوع نتیجه‌گیری به‌ویژه در گزارش‌های راهبردی انسانی هم مرسوم است.',
            severity: 'low', weight: 3, minHits: 2,
            phrases: ['challenges and opportunities ahead', 'future holds great promise', 'poised to shape the future', 'as we look to the future', 'the journey is far from over', 'pave the way for a brighter future', 'only time will tell', 'continued efforts will be crucial']
        },
        {
            id: 'fa-assistant-address', category: 'residue', title: 'خطاب مستقیم دستیار به مخاطب',
            description: 'عبارت‌هایی شبیه پاسخِ گفتگو به درخواست کاربر، داخل متن دیده می‌شود.',
            caveat: 'در مکالمه، آموزش یا نقل‌قول این عبارت‌ها طبیعی‌اند؛ بررسی کنید متن قرار بوده مقاله باشد یا گفتگو.',
            severity: 'medium', weight: 7,
            phrases: ['امیدوارم این توضیحات مفید بوده باشد', 'اگر سوال دیگری داشتید', 'اگر سوال دیگری دارید', 'اگر مایل باشید می توانم', 'اگر دوست داشته باشید می توانم', 'آیا مایلید در این باره', 'حتما، در ادامه', 'در ادامه پاسخ شما', 'در صورت تمایل می توانم']
        },
        {
            id: 'en-assistant-address', category: 'residue', title: 'لحن مستقیم یک پاسخ چت‌بات',
            description: 'جمله‌هایی مشاهده شده که بیشتر به خروجی گفتگو یا راهنمای دستیار شبیه‌اند.',
            caveat: 'در ایمیل، راهنما یا گفتگو ممکن است کاملاً طبیعی باشند.',
            severity: 'medium', weight: 7,
            phrases: ["i hope this helps", 'let me know if you would like', 'would you like me to', "here's a breakdown", 'here is a detailed breakdown', "i'd be happy to help", 'feel free to ask', 'as requested, here is', 'certainly! here is']
        },
        {
            id: 'fa-polite-overhedging', category: 'rhetoric', title: 'احتیاط‌گویی و توصیه‌های تکراری',
            description: 'توصیه‌های کلی و احتیاط‌آمیز چندین بار جای توضیح مستقیم را گرفته‌اند.',
            caveat: 'در موضوعات حساس، نگارش حرفه‌ای و مسئولانه عمداً از این سبک استفاده می‌کند.',
            severity: 'low', weight: 2, minHits: 3,
            phrases: ['باید توجه داشت که', 'توجه به این نکته ضروری است', 'در نظر داشته باشید که', 'توصیه می شود که', 'با در نظر گرفتن شرایط', 'بسته به شرایط خاص', 'این امر به عوامل متعددی بستگی دارد']
        },
        {
            id: 'en-polished-hedging', category: 'rhetoric', title: 'احتیاط‌گویی قالبی انگلیسی',
            description: 'تکرار ساختارهای نرم‌کننده و کلی‌گویانه در بیان.',
            caveat: 'برای متون علمی، حقوقی و پزشکی احتیاط‌گویی ممکن است ضرورت داشته باشد.',
            severity: 'low', weight: 2, minHits: 3,
            phrases: ["it's worth noting that", 'it should be noted that', 'depending on the context', 'it is essential to consider', 'while results may vary', 'may vary depending on', 'it is important to remember that']
        }
    ];
    const SEVERITY_RANK = { low: 1, medium: 2, high: 3 };
    function cleanChar(char) {
        if (/\p{M}/u.test(char))
            return '';
        const map = { 'ي': 'ی', 'ى': 'ی', 'ك': 'ک', 'ة': 'ه', 'ۀ': 'ه', 'أ': 'ا', 'إ': 'ا', 'ٱ': 'ا', 'ؤ': 'و', 'ئ': 'ی', 'ـ': '', '\u200c': ' ', '\u200f': ' ', '\u200e': ' ' };
        return (map[char] === undefined ? char : map[char]).toLocaleLowerCase();
    }
    function mappedNormalize(text) {
        let normalized = '';
        const offsets = [];
        for (let i = 0; i < text.length; i++) {
            const replacement = cleanChar(text[i]);
            for (let j = 0; j < replacement.length; j++) {
                normalized += replacement[j];
                offsets.push(i);
            }
        }
        return { normalized, offsets };
    }
    function escapeRegex(input) { return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function words(text) {
        return text.match(/[\p{L}\p{N}]+(?:[\u200c'’-][\p{L}\p{N}]+)*/gu) || [];
    }
    function average(values) { return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length); }
    function variation(values) {
        const mean = average(values);
        if (mean === 0)
            return 0;
        return Math.sqrt(average(values.map(v => (v - mean) ** 2))) / mean;
    }
    function asSpan(text, start, end) {
        return { start, end, text: text.slice(start, end) };
    }
    function dedupeSpans(spans) {
        const seen = new Set();
        return spans.filter(s => {
            const key = `${s.start}:${s.end}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        }).sort((a, b) => a.start - b.start);
    }
    function ruleMatches(raw, mapped, phrase) {
        const normalizedPhrase = mappedNormalize(phrase).normalized.trim();
        const regex = new RegExp(escapeRegex(normalizedPhrase).replace(/\s+/g, '[\\s\\u200c]+'), 'gu');
        const spans = [];
        let match;
        while ((match = regex.exec(mapped.normalized)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            const before = start > 0 ? mapped.normalized[start - 1] : '';
            const after = end < mapped.normalized.length ? mapped.normalized[end] : '';
            if (/[\p{L}\p{N}]/u.test(before) || /[\p{L}\p{N}]/u.test(after))
                continue;
            const sourceStart = mapped.offsets[start];
            const sourceEnd = mapped.offsets[end - 1] + 1;
            if (sourceStart !== undefined && sourceEnd !== undefined)
                spans.push(asSpan(raw, sourceStart, sourceEnd));
        }
        return spans;
    }
    function getParagraphs(text) {
        const found = [];
        const regex = /[^\n]+/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const trimmed = match[0].trim();
            if (trimmed) {
                const lead = match[0].indexOf(trimmed);
                found.push(asSpan(text, match.index + lead, match.index + lead + trimmed.length));
            }
        }
        return found;
    }
    function getSentences(text) {
        const output = [];
        for (const p of getParagraphs(text)) {
            const regex = /[^.!?؟]+(?:[.!?؟]+|$)/g;
            let match;
            while ((match = regex.exec(p.text)) !== null) {
                const trim = match[0].trim();
                if (trim && words(trim).length > 0) {
                    const lead = match[0].indexOf(trim);
                    output.push(asSpan(text, p.start + match.index + lead, p.start + match.index + lead + trim.length));
                }
            }
        }
        return output;
    }
    function regexMatches(raw, regex, maximum = 15) {
        const hits = [];
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(raw)) !== null && hits.length < maximum) {
            if (!match[0].length) {
                regex.lastIndex++;
                continue;
            }
            hits.push(asSpan(raw, match.index, match.index + match[0].length));
        }
        return dedupeSpans(hits);
    }
    function patternFinding(results, text, params, regex, minimum) {
        const hits = regexMatches(text, regex);
        if (hits.length >= minimum)
            makeFinding({ ...params, hits }, results);
    }
    function makeFinding(f, output) {
        f.hits = dedupeSpans(f.hits);
        if (f.hits.length) {
            f.evidenceKind || (f.evidenceKind = f.category === 'self-reference' ? 'artifact' : 'stylistic');
            output.push(f);
        }
    }
    function analyze(text) {
        const allWords = words(text);
        const paragraphs = getParagraphs(text);
        const sentences = getSentences(text);
        const mapped = mappedNormalize(text);
        const results = [];
        const faLetters = (text.match(/[\u0600-\u06FF]/g) || []).length;
        const enLetters = (text.match(/[A-Za-z]/g) || []).length;
        const language = (faLetters + enLetters) < 6 ? 'unknown' : faLetters > enLetters * 2 ? 'fa' : enLetters > faLetters * 2 ? 'en' : 'mixed';
        for (const rule of RULES) {
            const hits = dedupeSpans(rule.phrases.flatMap(phrase => ruleMatches(text, mapped, phrase)));
            // Transition words are only interesting if they recur several times.
            if (hits.length < (rule.minHits || (rule.category === 'transition' ? 3 : 1)))
                continue;
            makeFinding({ id: rule.id, category: rule.category, title: rule.title, description: rule.description, caveat: rule.caveat, severity: rule.severity, weight: rule.weight, hits }, results);
        }
        // Strong technical artifacts survive many superficial 'humanize' instructions.
        // They demonstrate a copied/generated workflow artifact, not necessarily the author of surrounding prose.
        patternFinding(results, text, {
            id: 'citation-artifact', category: 'residue', title: 'نشانگر خام ارجاعِ ابزار',
            description: 'نشانه‌گذاری داخلی ارجاع یا رندر ناقص خروجی یک دستیار زبانی در متن مانده است.',
            caveat: 'احتمال دارد فردی نقل‌قولی از ابزار را آورده باشد؛ به‌تنهایی اثبات نویسنده کل سند نیست.',
            severity: 'high', weight: 14, evidenceKind: 'artifact'
        }, /(?:contentReference\[oaicite[^\]\r\n]*\]|\[oaicite:[^\]\r\n]*\]|cite[^\r\n]{1,140}|【turn\d+(?:search|view|file|news)\d+】)/giu, 1);
        patternFinding(results, text, {
            id: 'unfinished-placeholders', category: 'residue', title: 'جای‌خالی تکمیل‌نشده در پیش‌نویس',
            description: 'یک جای‌خالی به سبک الگوی پاسخ یا پیش‌نویس قابل‌پرکردن باقی مانده است.',
            caveat: 'قالب‌های انسانی نیز از جای‌خالی استفاده می‌کنند؛ نوع سند و هدف تهیه آن را بررسی کنید.',
            severity: 'medium', weight: 6, evidenceKind: 'artifact'
        }, /\[(?:insert|your|add|name|company|date|brief description|source|نام|تاریخ|اینجا بنویسید|نام شرکت)[^\]\r\n]{0,55}\]|\{\{(?:company|name|title|date|نام|عنوان)[^}]{0,30}\}\}/giu, 1);
        // Rhetorical contrasts are common in humans. Only *recurrent* instances are surfaced.
        patternFinding(results, text, {
            id: 'fa-repeated-contrast', category: 'rhetoric', title: 'تقابل بلاغی تکراری فارسی',
            description: 'ساختار «نه‌تنها ... بلکه ...» در بخش‌های متعدد تکرار شده است.',
            caveat: 'این الگو یک آرایه طبیعی در فارسی است؛ فقط تکرار زیاد آن موضوع بررسی است.',
            severity: 'low', weight: 4
        }, /نه[\s‌]*تنها[^\n.!؟]{3,110}?بلکه/giu, 2);
        patternFinding(results, text, {
            id: 'en-repeated-contrast', category: 'rhetoric', title: 'تقابل‌های کلیشه‌ای تکرارشونده',
            description: 'قالب‌های «not just ... but» یا «not only ... but also» چند بار استفاده شده‌اند.',
            caveat: 'در سخنرانی، تبلیغات و مقاله‌های انسانی هم رایج‌اند.',
            severity: 'low', weight: 4
        }, /\bnot (?:just|only)[^\n.!?]{3,110}?(?:but|rather)\b/giu, 2);
        // Markdown formatting can be a prompt-output remnant, but only in unexpected contexts.
        if (allWords.length >= 90)
            patternFinding(results, text, {
                id: 'markdown-heavy', category: 'formatting', title: 'قالب‌بندی پرتراکم با Markdown',
                description: 'چند تیتر، تأکید یا مورد فهرستی با نشانه‌های Markdown وجود دارد؛ در اسناد متنی ساده می‌تواند ردپای کپی خروجی چت باشد.',
                caveat: 'در فایل Markdown، مستندات فنی و نوشته توسعه‌دهندگان این نشانه کاملاً طبیعی است؛ سند را در زمینه خودش بررسی کنید.',
                severity: 'low', weight: 2
            }, /^(?:#{1,4}\s+.{3,80}|\s{0,3}[-*]\s+\*\*[^\n*]{3,55}\*\*|\*\*[^\n*]{5,80}\*\*)/gmu, 4);
        // Fragile punctuation clues intentionally receive a very low weight.
        if (language === 'en' && allWords.length >= 160)
            patternFinding(results, text, {
                id: 'em-dash-density', category: 'formatting', title: 'استفاده پرتکرار از خط تیره بلند',
                description: 'از em dash به دفعات استفاده شده؛ این الگو در برخی مدل‌ها و دوره‌ها دیده شده است.',
                caveat: 'قواعد نگارش، سبک نویسنده و نسخه مدل آن را تغییر می‌دهند؛ هیچ خط تیره‌ای به‌تنهایی شاهد تولید AI نیست.',
                severity: 'low', weight: 1
            }, /—/gu, Math.max(5, Math.ceil(allWords.length / 100)));
        // Repeated paragraph openings (2-4 initial words) are independent of preset phrase rules.
        if (paragraphs.length >= 4) {
            const starters = new Map();
            for (const p of paragraphs) {
                const prefix = words(p.text).slice(0, 3).map(w => mappedNormalize(w).normalized);
                if (prefix.length < 2)
                    continue;
                const key = prefix.join(' ');
                const found = starters.get(key) || [];
                found.push(asSpan(text, p.start, Math.min(p.end, p.start + 65)));
                starters.set(key, found);
            }
            const frequent = [...starters.values()].filter(v => v.length >= 3).flat();
            if (frequent.length)
                makeFinding({
                    id: 'repeated-openings', category: 'repetition', title: 'شروع مشابه چند پاراگراف',
                    description: 'دست‌کم سه پاراگراف با واژه‌های یکسان شروع شده‌اند؛ این می‌تواند از تکرار یک قالب نوشتاری خبر بدهد.',
                    caveat: 'تکرار آغاز پاراگراف گاهی انتخاب آگاهانه نویسنده برای انسجام یا تأکید است.',
                    severity: 'medium', weight: 7, hits: frequent
                }, results);
        }
        // Repeated sequences of five words across different sentences.
        if (allWords.length >= 90 && sentences.length >= 4) {
            const ngrams = new Map();
            for (let s = 0; s < sentences.length; s++) {
                const sentence = sentences[s];
                const tokens = [...sentence.text.matchAll(/[\p{L}\p{N}]+(?:[\u200c'’-][\p{L}\p{N}]+)*/gu)];
                for (let i = 0; i <= tokens.length - 5; i++) {
                    const chunk = tokens.slice(i, i + 5);
                    const key = chunk.map(t => mappedNormalize(t[0]).normalized).join(' ');
                    if (key.length < 22)
                        continue;
                    const existing = ngrams.get(key) || { sentences: new Set(), spans: [] };
                    existing.sentences.add(s);
                    if (existing.spans.length < 5) {
                        const start = sentence.start + (chunk[0].index || 0);
                        const last = chunk[4];
                        const end = sentence.start + (last.index || 0) + last[0].length;
                        existing.spans.push(asSpan(text, start, end));
                    }
                    ngrams.set(key, existing);
                }
            }
            const repeated = [...ngrams.values()].filter(x => x.sentences.size >= 3).sort((a, b) => b.sentences.size - a.sentences.size);
            if (repeated.length)
                makeFinding({
                    id: 'repeated-ngrams', category: 'repetition', title: 'تکرار عبارت چندواژه‌ای',
                    description: 'یک توالی پنج‌واژه‌ای در چند جمله مستقل تکرار شده است.',
                    caveat: 'واژه‌های تخصصی یا عبارت‌های کلیدی ممکن است عمدا تکرار شوند.',
                    severity: 'medium', weight: 8, hits: repeated[0].spans
                }, results);
        }
        const sentenceLengths = sentences.map(s => words(s.text).length).filter(v => v >= 4);
        if (sentenceLengths.length >= 8 && variation(sentenceLengths) < 0.27 && average(sentenceLengths) >= 9) {
            makeFinding({
                id: 'uniform-sentences', category: 'structure', title: 'طول بسیار یکنواخت جمله‌ها',
                description: `در ${sentenceLengths.length} جمله، طول جمله‌ها تنوع کمی دارد (میانگین ${Math.round(average(sentenceLengths))} واژه).`,
                caveat: 'جمله‌های هم‌اندازه در نثر ویرایش‌شده و حرفه‌ای نیز کاملا ممکن‌اند.',
                severity: 'low', weight: 4, hits: sentences.slice(0, 3).map(s => asSpan(text, s.start, Math.min(s.end, s.start + 72)))
            }, results);
        }
        const paragraphLengths = paragraphs.map(p => words(p.text).length);
        if (paragraphs.length >= 4 && average(paragraphLengths) >= 25 && variation(paragraphLengths) < 0.17) {
            makeFinding({
                id: 'uniform-paragraphs', category: 'structure', title: 'بندهای بیش از حد هم‌اندازه',
                description: 'اندازه پاراگراف‌ها بسیار نزدیک به هم است و ممکن است از تقسیم‌بندی قالبی ناشی شده باشد.',
                caveat: 'چیدمان منظم در مقاله‌های آموزشی یا متن ویرایش‌شده نیز طبیعی است.',
                severity: 'low', weight: 3, hits: paragraphs.slice(0, 4).map(p => asSpan(text, p.start, Math.min(p.end, p.start + 65)))
            }, results);
        }
        // Contextual observation, intentionally not a standalone AI-authorship signal.
        const anchors = /[0-9۰-۹]|https?:\/\/|«[^»]{4,}»|"[^"]{4,}"|(?:برای مثال|مثلا|مثلاً|به عنوان نمونه|for example|for instance)/iu;
        const genericFindings = results.filter(f => f.category === 'cliche').reduce((n, f) => n + f.hits.length, 0);
        if (allWords.length >= 140 && !anchors.test(text) && genericFindings >= 3) {
            makeFinding({
                id: 'low-specificity', category: 'specificity', title: 'کلی‌گویی بدون شاهد مشخص',
                description: 'متن چند عبارت عمومی دارد، اما عدد، نقل‌قول یا عبارت مثال‌زننده قابل شناسایی در آن دیده نمی‌شود.',
                caveat: 'متن‌های نظری و ادبی لزوما به عدد، نقل‌قول یا مثال صریح نیاز ندارند؛ نبودن آن‌ها نشانه هوش مصنوعی نیست.',
                severity: 'low', weight: 2, hits: [asSpan(text, paragraphs[0].start, Math.min(paragraphs[0].end, paragraphs[0].start + 80))]
            }, results);
        }
        const typePriority = { 'residue': 0, 'self-reference': 1, 'repetition': 2, 'attribution': 3, 'rhetoric': 4, 'cliche': 5, 'structure': 6, 'transition': 7, 'formatting': 8, 'specificity': 9 };
        results.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || typePriority[a.category] - typePriority[b.category] || b.hits.length - a.hits.length);
        const uniqueCategories = new Set(results.map(r => r.category)).size;
        // Cap contributions by category: repeating many weak buzzwords cannot create a proof-like score.
        const categories = new Map();
        const categoryCaps = {
            cliche: 13, transition: 5, repetition: 14, structure: 10, 'self-reference': 18,
            specificity: 3, rhetoric: 9, attribution: 6, formatting: 3, residue: 24
        };
        results.forEach(r => categories.set(r.category, (categories.get(r.category) || 0) + r.weight * (1 + Math.min(3, r.hits.length - 1) * 0.15)));
        const weighted = [...categories].reduce((sum, [category, amount]) => sum + Math.min(categoryCaps[category], amount), 0);
        // No probability, and no numerical precision implied for short samples.
        const lengthAdjustment = Math.min(1.0, Math.max(0.65, allWords.length / 200));
        const index = Math.min(100, Math.round(weighted * lengthAdjustment * 1.25));
        const level = allWords.length < 80 ? 'insufficient' : index < 24 ? 'low' : index < 49 ? 'medium' : 'high';
        const normalizedWords = allWords.map(w => mappedNormalize(w).normalized);
        const uniqueWords = new Set(normalizedWords);
        const reportNote = allWords.length < 80
            ? 'متن کوتاه است؛ این حجم برای برداشت قابل اتکا از الگوهای سبکی کافی نیست.'
            : results.length === 0
                ? 'در فهرست الگوهای تعریف‌شده، نشانه برجسته‌ای پیدا نشد. این به معنی انسانی بودن متن نیست.'
                : 'این نتایج فقط الگوهای قابل بررسی را نشان می‌دهند؛ نویسنده یا ابزار تولید متن را ثابت نمی‌کنند.';
        return {
            text, wordCount: allWords.length, characterCount: text.length,
            sentenceCount: sentences.length, paragraphCount: paragraphs.length,
            language, lexicalDiversity: allWords.length ? Math.round((uniqueWords.size / allWords.length) * 100) : 0,
            averageSentenceWords: Math.round(average(sentenceLengths) * 10) / 10,
            index, level, findings: results, style: NevisEngine.getStyleProfile(text, language),
            totalHighlights: results.reduce((sum, r) => sum + r.hits.length, 0),
            categoryCount: uniqueCategories,
            note: reportNote
        };
    }
    NevisEngine.analyze = analyze;
    function createReadableReport(a) {
        const levelNames = { insufficient: 'شواهد ناکافی', low: 'نشانه‌های محدود', medium: 'نیازمند بررسی', high: 'نشانه‌های متعدد' };
        const rows = [
            'گزارش نویس‌سنج | NevisSanj',
            '================================',
            'یادآوری: الگوهای قابل مشاهده به‌تنهایی منشأ نگارش را اثبات نمی‌کنند.',
            `زمان: ${new Date().toLocaleString('fa-IR')}`,
            `تعداد واژه: ${a.wordCount} | جمله: ${a.sentenceCount} | پاراگراف: ${a.paragraphCount}`,
            `شواهد قابل مشاهده: ${a.findings.length} دسته، ${a.totalHighlights} مورد | ارزیابی: ${levelNames[a.level]}`,
            'پروفایل آماری متن (توصیفی، نه احتمال منشأ):',
            ...a.style.metrics.map(m => `  ${m.title}: ${m.display}`),
            a.note, '',
            `یافته‌ها (${a.findings.length} دسته):`
        ];
        a.findings.forEach((f, i) => {
            rows.push(`${i + 1}. ${f.title} (${f.hits.length} مورد)`, f.description, `محدودیت: ${f.caveat}`);
            f.hits.slice(0, 5).forEach(hit => rows.push(`  • «${hit.text.replace(/\n/g, ' ')}»`));
            rows.push('');
        });
        rows.push('روش: نشانه‌های واژگانی، بلاغی، ساختاری و مصنوعات خروجی؛ وزن‌ها تجربی و کالیبره‌نشده‌اند. اجرا کاملا محلی و بدون API.');
        return rows.join('\n');
    }
    NevisEngine.createReadableReport = createReadableReport;
})(NevisEngine || (NevisEngine = {}));
/**
 * Language-neutral, explainable stylometry; no authorship inference.
 * Every value is descriptive and must not be interpreted as an AI probability.
 * Source text never leaves this module/browser.
 */
var NevisEngine;
(function (NevisEngine) {
    const STYLO_TOKEN_RE = /[\p{L}\p{N}]+(?:[\u200c'’-][\p{L}\p{N}]+)*/gu;
    const FA_FUNCTION = new Set('از به در با برای که این آن و یا اما اگر تا را بر هم نیز چون سپس پس یک هر همه خود ما من تو او شما آنها آن‌ها است هست بود بودند می شود می‌شود شده می‌کند کند خواهد باید مثل بین بدون روی زیر دیگر چنین همان زیرا حتی'.split(' ').map(norm));
    const EN_FUNCTION = new Set('the a an and or but if for to of in on at with by from as is are was were be been being it this that these those i you he she we they not do does did have has had can could will would should may might about into over under than then there here their his her our your its'.split(' '));
    const TITLES = {
        rollingVocabulary: 'تنوع واژگان در بخش‌های هم‌اندازه', wordEntropy: 'آنتروپی واژگان',
        repeatedTrigrams: 'تکرار توالی سه‌واژه‌ای', sentenceRhythm: 'نوسان طول جمله‌ها',
        paragraphRhythm: 'نوسان طول پاراگراف‌ها', functionWords: 'سهم واژه‌های دستوری',
        punctuation: 'تراکم نشانه‌گذاری', hapax: 'واژه‌های تک‌بار مصرف'
    };
    const DETAILS = {
        rollingVocabulary: 'میانگین نسبت واژه‌های متفاوت در پنجره‌های ۵۰واژه‌ای؛ اثر طول متن را تا حدی کاهش می‌دهد.',
        wordEntropy: 'آنتروپی نرمال‌شده توزیع واژه‌ها؛ مقدار بالاتر یعنی پراکندگی بیشتر انتخاب واژگان.',
        repeatedTrigrams: 'سهم توالی‌های سه‌واژه‌ای که بیش از یک بار آمده‌اند؛ موضوع و اصطلاحات تخصصی بر آن اثر می‌گذارند.',
        sentenceRhythm: 'ضریب تغییرات طول جملات؛ عدد بالاتر یعنی تغییرپذیری بیشتر ریتم نوشتار.',
        paragraphRhythm: 'ضریب تغییرات طول بندها؛ متن فهرستی و Markdown می‌تواند آن را تغییر دهد.',
        functionWords: 'سهم واژه‌های پرکاربرد دستوری در متن؛ موضوع و زبان روی آن اثر دارند.',
        punctuation: 'تعداد نشانه‌های نگارشی به ازای هر صد واژه؛ سبک و قالب سند بر آن اثر دارد.',
        hapax: 'نسبت انواع واژه‌هایی که فقط یک بار رخ داده‌اند؛ در متن کوتاه ناپایدار است.'
    };
    const SCALE = {
        rollingVocabulary: 0.16, wordEntropy: 0.12, repeatedTrigrams: 0.11,
        sentenceRhythm: 0.35, paragraphRhythm: 0.45, functionWords: 0.13, punctuation: 12, hapax: 0.22
    };
    function norm(w) {
        return w.normalize('NFKC').toLocaleLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
            .replace(/[ًٌٍَُِّْـ]/g, '').replace(/[\u200c’'-]/g, '');
    }
    function toks(raw) { return (raw.match(STYLO_TOKEN_RE) || []).map(norm); }
    function avg(data) { return data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0; }
    function cv(data) {
        const a = avg(data);
        return a > 0 ? Math.sqrt(avg(data.map(v => (v - a) ** 2))) / a : 0;
    }
    function fix(num) { return Number(num.toFixed(4)); }
    function metric(id, value, available, unit) {
        const display = !available ? 'داده ناکافی' : unit === 'percentage' ? `${(value * 100).toFixed(1)}٪` : unit === 'count' ? value.toFixed(1) : value.toFixed(3);
        return { id, title: TITLES[id], value: fix(value), available, display, detail: DETAILS[id] };
    }
    function getStyleProfile(text, language) {
        const tokens = toks(text), n = tokens.length;
        const counts = new Map();
        tokens.forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
        const types = [...counts.values()];
        const windows = [];
        // MATTR: all windows for short/medium texts; fixed stride for large texts.
        if (n >= 50)
            for (let i = 0; i <= n - 50; i += n > 2000 ? 10 : 1) {
                windows.push(new Set(tokens.slice(i, i + 50)).size / 50);
            }
        const entropy = n > 0 ? -types.reduce((sum, count) => {
            const p = count / n;
            return sum + p * Math.log2(p);
        }, 0) : 0;
        const maxEntropy = types.length > 1 ? Math.log2(types.length) : 0;
        const triCount = new Map();
        for (let i = 0; i < n - 2; i++) {
            const key = `${tokens[i]}\u0001${tokens[i + 1]}\u0001${tokens[i + 2]}`;
            triCount.set(key, (triCount.get(key) || 0) + 1);
        }
        const occurrencesInRepeatedTrigrams = [...triCount.values()].reduce((sum, count) => sum + (count > 1 ? count : 0), 0);
        const sentenceLengths = [];
        for (const part of text.split(/\n+/u))
            for (const sentence of part.split(/[.!?؟]+/u)) {
                const len = toks(sentence).length;
                if (len >= 3)
                    sentenceLengths.push(len);
            }
        const paragraphLengths = text.split(/\n\s*\n|\n/u).map(p => toks(p).length).filter(length => length >= 5);
        const functionDictionary = language === 'fa' ? FA_FUNCTION : language === 'en' ? EN_FUNCTION : null;
        const functionFraction = functionDictionary && n ? tokens.filter(w => functionDictionary.has(w)).length / n : 0;
        const punctuationCount = (text.match(/[،؛,.!?؟:;«»“”()\-—]/gu) || []).length;
        const metrics = [
            metric('rollingVocabulary', avg(windows), n >= 100, 'percentage'),
            metric('wordEntropy', maxEntropy ? entropy / maxEntropy : 0, n >= 100, 'number'),
            metric('repeatedTrigrams', n > 2 ? occurrencesInRepeatedTrigrams / (n - 2) : 0, n >= 100, 'percentage'),
            metric('sentenceRhythm', cv(sentenceLengths), sentenceLengths.length >= 8, 'number'),
            metric('paragraphRhythm', cv(paragraphLengths), paragraphLengths.length >= 4, 'number'),
            metric('functionWords', functionFraction, n >= 100 && functionDictionary !== null, 'percentage'),
            metric('punctuation', n ? 100 * punctuationCount / n : 0, n >= 100, 'count'),
            metric('hapax', types.length ? types.filter(c => c === 1).length / types.length : 0, n >= 100, 'percentage')
        ];
        return { wordCount: n, sentenceCount: sentenceLengths.length, paragraphCount: paragraphLengths.length,
            language, validForComparison: n >= 150 && sentenceLengths.length >= 8 && (language === 'fa' || language === 'en'), metrics };
    }
    NevisEngine.getStyleProfile = getStyleProfile;
    function compareStyleProfiles(target, reference) {
        const languageMatches = target.language === reference.language && (target.language === 'fa' || target.language === 'en');
        const comparable = target.validForComparison && reference.validForComparison && languageMatches;
        if (!comparable)
            return { comparable: false, languageMatches, differences: [],
                explanation: !languageMatches ? 'برای مقایسه، هر دو متن باید به یک زبان اصلی باشند (فارسی یا انگلیسی).'
                    : 'برای مقایسه قابل استفاده، هر متن دست‌کم به ۱۵۰ واژه و ۸ جمله نیاز دارد.' };
        const differences = [];
        for (const current of target.metrics) {
            const baseline = reference.metrics.find(x => x.id === current.id);
            if (!current.available || !baseline || !baseline.available)
                continue;
            differences.push({ id: current.id, title: current.title, current: current.display, reference: baseline.display,
                difference: fix(Math.abs(current.value - baseline.value) / SCALE[current.id]) });
        }
        differences.sort((a, b) => b.difference - a.difference);
        return { comparable: true, languageMatches, differences,
            explanation: 'اختلاف‌ها براساس ویژگی‌های آماری مرتب شده‌اند؛ این مقایسه هویت نویسنده یا استفاده از AI را تعیین نمی‌کند. موضوع و نوع سند را همسان انتخاب کنید.' };
    }
    NevisEngine.compareStyleProfiles = compareStyleProfiles;
})(NevisEngine || (NevisEngine = {}));
/**
 * NevisSanj local supervised learning. No preset AI scores and no network access.
 * Learns from explicitly labelled AI/Human examples supplied by the user.
 * The score is an uncalibrated model score, NOT an authorship probability.
 */
var NevisEngine;
(function (NevisEngine) {
    const DIMS = 4096;
    const NUMERIC = 8;
    const MIN_TRAIN_CLASS = 24;
    const tokenRE = /[\p{L}\p{N}]+(?:[\u200c'’-][\p{L}\p{N}]+)*/gu;
    function normText(t) {
        return t.normalize('NFKC').toLocaleLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ًٌٍَُِّْـ]/g, '')
            .replace(/[\u200c\u200f\u200e]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function labelOf(x) {
        const s = String(x ?? '').trim().toLowerCase();
        if (['ai', 'machine', 'generated', 'llm', '1', 'synthetic', 'ماشینی', 'هوش مصنوعی'].includes(s))
            return 'ai';
        if (['human', 'person', 'written', '0', 'real', 'انسانی', 'انسان'].includes(s))
            return 'human';
        return null;
    }
    NevisEngine.labelOf = labelOf;
    function exampleFromRow(row) {
        if (!row || typeof row !== 'object')
            return null;
        const label = labelOf(row.label ?? row.origin ?? row.class ?? row.source);
        const raw = row.text ?? row.content ?? row.generated_text ?? row.writing;
        const content = typeof raw === 'string' ? raw.trim() : '';
        if (!label || content.length < 160 || content.length > 24000)
            return null;
        const normalized = normText(content);
        if ((normalized.match(tokenRE) || []).length < 35)
            return null;
        const explicitLang = row.language ?? row.lang;
        const lang = explicitLang === 'fa' || explicitLang === 'en' ? explicitLang : undefined;
        const group = row.group ?? row.topic_id ?? row.human_id ?? row.topic;
        return { text: content, label, language: lang, group: group === undefined || group === null || group === '' ? undefined : String(group).slice(0, 140) };
    }
    function csvRows(content) {
        const lines = [];
        let field = '', cells = [], quoted = false;
        for (let i = 0; i < content.length; i++) {
            const c = content[i];
            if (c === '"') {
                if (quoted && content[i + 1] === '"') {
                    field += '"';
                    i++;
                }
                else
                    quoted = !quoted;
            }
            else if (c === ',' && !quoted) {
                cells.push(field);
                field = '';
            }
            else if ((c === '\n' || c === '\r') && !quoted) {
                if (c === '\r' && content[i + 1] === '\n')
                    i++;
                cells.push(field);
                if (cells.some(x => x.trim()))
                    lines.push(cells);
                cells = [];
                field = '';
            }
            else
                field += c;
        }
        if (quoted)
            throw new Error('ساختار CSV ناقص است؛ علامت نقل‌قول بسته نشده.');
        cells.push(field);
        if (cells.some(x => x.trim()))
            lines.push(cells);
        return lines;
    }
    function parseLabeledData(content, filename = 'data.jsonl') {
        let raw = [];
        try {
            if (/\.csv$/i.test(filename)) {
                const rows = csvRows(content.replace(/^\uFEFF/, ''));
                if (rows.length < 2)
                    return { examples: [], skipped: 0, error: 'فایل CSV ردیف داده ندارد.' };
                const headers = rows[0].map(x => x.trim().toLowerCase());
                raw = rows.slice(1).map(row => Object.fromEntries(headers.map((k, i) => [k, row[i] || ''])));
            }
            else if (/\.json$/i.test(filename)) {
                const parsed = JSON.parse(content);
                raw = Array.isArray(parsed) ? parsed : Array.isArray(parsed.examples) ? parsed.examples : [];
            }
            else {
                raw = content.split(/\r?\n/).filter(s => s.trim()).map(line => JSON.parse(line));
            }
            if (raw.length > 20000)
                return { examples: [], skipped: 0, error: 'حداکثر ۲۰ هزار ردیف قابل ورود است.' };
            const seen = new Set(), examples = [];
            let skipped = 0;
            for (const row of raw) {
                const item = exampleFromRow(row);
                if (!item) {
                    skipped++;
                    continue;
                }
                const key = normText(item.text);
                if (seen.has(key)) {
                    skipped++;
                    continue;
                }
                seen.add(key);
                examples.push(item);
            }
            return { examples, skipped, error: examples.length ? '' : 'نمونه معتبر پیدا نشد. ستون‌های text و label با مقدار ai یا human لازم‌اند؛ متن هر ردیف باید دست‌کم ۳۵ واژه داشته باشد.' };
        }
        catch (e) {
            return { examples: [], skipped: 0, error: e instanceof Error ? e.message : 'فایل قابل خواندن نیست.' };
        }
    }
    NevisEngine.parseLabeledData = parseLabeledData;
    function hash(s) {
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }
    function languageOf(text) {
        const fa = (text.match(/[\u0600-\u06FF]/g) || []).length, en = (text.match(/[A-Za-z]/g) || []).length;
        return fa > en * 2 ? 'fa' : en > fa * 2 ? 'en' : 'mixed';
    }
    function vector(text) {
        const normalized = normText(text).slice(0, 8000);
        const counts = new Map();
        const add = (key, factor) => {
            const h = hash(key) % DIMS;
            counts.set(h, (counts.get(h) || 0) + factor);
        };
        // Word unigrams + bigrams, character 3-5 grams; no hand-written phrase whitelist.
        const ws = (normalized.match(tokenRE) || []).slice(0, 1400);
        for (let i = 0; i < ws.length; i++) {
            add('w:' + ws[i], 1.5);
            if (i > 0)
                add('b:' + ws[i - 1] + ' ' + ws[i], 1.0);
        }
        const flat = normalized.replace(/\s+/g, ' ');
        for (let size = 3; size <= 5; size++)
            for (let i = 0; i + size <= flat.length; i++) {
                if (i % 2 === 1 && flat.length > 3000)
                    continue;
                add('c' + size + ':' + flat.slice(i, i + size), 0.4);
            }
        const items = [...counts].map(([idx, count]) => [idx, Math.sqrt(count)]);
        const magnitude = Math.sqrt(items.reduce((s, x) => s + x[1] * x[1], 0)) || 1;
        for (const item of items)
            item[1] /= magnitude;
        // Stylometric features in a separate partition, standardized to bounded values.
        const sents = normalized.split(/[.!?؟]+/).map(s => (s.match(tokenRE) || []).length).filter(v => v >= 3);
        const mean = sents.length ? sents.reduce((a, b) => a + b, 0) / sents.length : 0;
        const cv = mean > 0 ? Math.sqrt(sents.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, sents.length)) / mean : 0;
        const unique = new Set(ws).size;
        const short = ws.filter(w => w.length <= 3).length;
        const numeric = [
            Math.min(1, ws.length / 400), Math.min(1, unique / Math.max(1, ws.length)),
            Math.min(1, mean / 40), Math.min(1, cv / 1.6),
            Math.min(1, sents.length / 25), Math.min(1, short / Math.max(1, ws.length)),
            Math.min(1, (normalized.match(/[،؛,:;]/g) || []).length / Math.max(1, ws.length) * 3),
            Math.min(1, normalized.split(/\n\s*\n/).length / 10)
        ];
        numeric.forEach((v, i) => items.push([DIMS + i, (v - 0.5) * 0.45]));
        return items;
    }
    function rawScore(v, w, bias) {
        let z = bias;
        for (const [k, x] of v)
            z += w[k] * x;
        return Math.max(-20, Math.min(20, z));
    }
    function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
    function predictLocal(text, model) {
        const wordCount = (normText(text).match(tokenRE) || []).length;
        if (!model)
            return { available: false, score: null, verdict: 'insufficient', wordCount, explanation: 'مدل اختصاصی هنوز آموزش ندیده است. یک مجموعه داده انسانی و ماشینی وارد کنید.' };
        if (languageOf(text) !== model.language)
            return { available: false, score: null, verdict: 'insufficient', wordCount, explanation: 'زبان متن با زبان مدل محلی متفاوت است. برای هر زبان باید مدل جداگانه آموزش داده شود.' };
        if (wordCount < 80)
            return { available: false, score: null, verdict: 'insufficient', wordCount, explanation: 'برای برآورد مدل، دست‌کم ۸۰ واژه لازم است. متن کوتاه احتمال خطای بیشتری دارد.' };
        const score = sigmoid(rawScore(vector(text), model.weights, model.bias)) * 100;
        const verdict = score >= 65 ? 'ai' : score <= 35 ? 'human' : 'uncertain';
        return { available: true, score: Math.round(score * 10) / 10, verdict, wordCount,
            explanation: 'این عدد خروجی طبقه‌بند محلیِ آموزش‌دیده روی داده‌های شماست، نه احتمال قطعی منشأ متن. اختلاف سبک و موضوع، دقت را کاهش می‌دهد.' };
    }
    NevisEngine.predictLocal = predictLocal;
    // Bottom-k minhash sketches of 7-word shingles reject near-identical documents
    // even when a different filename, header or paragraph order is used.
    function contentSketch(text) {
        const toks = (normText(text).replace(/[0-9۰-۹]/g, '').match(tokenRE) || []);
        if (toks.length < 25)
            return [];
        const set = new Set();
        for (let i = 0; i + 7 <= toks.length; i++)
            set.add(hash(toks.slice(i, i + 7).join(' ')));
        return [...set].sort((a, b) => a - b).slice(0, 40);
    }
    function nearDuplicate(a, b) {
        if (!a.length || !b.length)
            return false;
        const bs = new Set(b);
        const shared = a.reduce((s, h) => s + Number(bs.has(h)), 0);
        return shared / Math.min(a.length, b.length) >= 0.56;
    }
    function trainLocal(examples, language) {
        const valid = examples.filter(e => e.text && e.text.length >= 160 && languageOf(e.text) === language);
        const count = (label) => valid.filter(e => e.label === label).length;
        if (count('ai') < MIN_TRAIN_CLASS || count('human') < MIN_TRAIN_CLASS)
            return { model: null, error: `برای زبان انتخابی، حداقل ${MIN_TRAIN_CLASS} نمونه انسانی و ${MIN_TRAIN_CLASS} نمونه ماشینی لازم است. فعلاً ${count('human')} انسانی و ${count('ai')} ماشینی دارید.` };
        const byGroup = new Map();
        for (const ex of valid) {
            const key = ex.group ? 'g:' + ex.group : 't:' + hash(normText(ex.text)).toString(16);
            if (!byGroup.has(key))
                byGroup.set(key, []);
            byGroup.get(key).push(ex);
        }
        const groups = [...byGroup.entries()].sort((a, b) => hash('split:' + a[0]) - hash('split:' + b[0]));
        const test = [], train = [];
        const wanted = { ai: Math.max(7, Math.floor(count('ai') * 0.2)), human: Math.max(7, Math.floor(count('human') * 0.2)) };
        let heldAI = 0, heldHuman = 0;
        for (const [, members] of groups) {
            const a = members.filter(x => x.label === 'ai').length, h = members.length - a;
            if ((heldAI < wanted.ai || heldHuman < wanted.human) &&
                (heldAI + a <= count('ai') - 15) && (heldHuman + h <= count('human') - 15) &&
                (a === 0 || heldAI < wanted.ai) && (h === 0 || heldHuman < wanted.human)) {
                test.push(...members);
                heldAI += a;
                heldHuman += h;
            }
            else
                train.push(...members);
        }
        if (heldAI < 5 || heldHuman < 5)
            return { model: null, error: 'گروه‌بندی داده‌ها اجازه نمی‌دهد نمونه آزمایشی کافی از هر دو کلاس کنار گذاشته شود. شناسه group را اصلاح کنید یا داده بیشتری وارد کنید.' };
        // Near-duplicate protection across training and evaluation, not only exact prefixes.
        // Sketches are local and never stored in the model or shared outside this process.
        const trainingSketches = train.map(e => contentSketch(e.text));
        const cleanTest = test.filter(e => {
            const sketch = contentSketch(e.text);
            return !trainingSketches.some(existing => nearDuplicate(sketch, existing));
        });
        const positive = cleanTest.filter(x => x.label === 'ai').length;
        const negative = cleanTest.filter(x => x.label === 'human').length;
        if (positive < 5 || negative < 5)
            return { model: null, error: 'پس از حذف نمونه‌های تکراری، داده مستقل کافی برای ارزیابی وجود ندارد.' };
        const dataset = train.map(e => ({ y: e.label === 'ai' ? 1 : 0, vec: vector(e.text) }));
        const w = new Array(DIMS + NUMERIC).fill(0);
        let bias = 0;
        const weights = { ai: train.length / (2 * Math.max(1, train.filter(e => e.label === 'ai').length)), human: train.length / (2 * Math.max(1, train.filter(e => e.label === 'human').length)) };
        const gradientSquares = new Float64Array(w.length);
        let biasSum = 0;
        for (let epoch = 0; epoch < 28; epoch++) {
            // Deterministic alternating order: no random or source order dependence.
            const start = epoch % dataset.length;
            for (let shift = 0; shift < dataset.length; shift++) {
                const item = dataset[(start + shift) % dataset.length];
                const error = (sigmoid(rawScore(item.vec, w, bias)) - item.y) * (item.y ? weights.ai : weights.human);
                const learningRate = 1.25;
                for (const [k, x] of item.vec) {
                    const g = error * x + 0.00018 * w[k];
                    gradientSquares[k] += g * g;
                    w[k] -= learningRate * g / Math.sqrt(1 + gradientSquares[k]);
                }
                biasSum += error * error;
                bias -= 0.18 * error / Math.sqrt(1 + biasSum);
            }
        }
        let tp = 0, tn = 0, fp = 0, fn = 0;
        for (const item of cleanTest) {
            const pred = sigmoid(rawScore(vector(item.text), w, bias)) >= 0.5;
            if (item.label === 'ai')
                pred ? tp++ : fn++;
            else
                pred ? fp++ : tn++;
        }
        const model = { version: 1, dimensions: DIMS, weights: w.map(v => Number(v.toFixed(6))), bias: Number(bias.toFixed(6)), language,
            trainedOn: train.length, validationCount: cleanTest.length, accuracy: (tp + tn) / cleanTest.length,
            aiRecall: tp / (tp + fn), humanRecall: tn / (tn + fp), falsePositiveRate: fp / (tn + fp),
            validationAI: tp + fn, validationHuman: tn + fp, grouped: valid.every(x => !!x.group), trainedAt: new Date().toISOString() };
        return { model, error: '' };
    }
    NevisEngine.trainLocal = trainLocal;
    function isModel(x) {
        return !!x && x.version === 1 && x.dimensions === DIMS && (x.language === 'fa' || x.language === 'en') &&
            Array.isArray(x.weights) && x.weights.length === DIMS + NUMERIC && x.weights.every((y) => typeof y === 'number' && Number.isFinite(y)) &&
            typeof x.bias === 'number' && Number.isFinite(x.bias) && Number.isFinite(x.accuracy) && Number.isFinite(x.falsePositiveRate);
    }
    NevisEngine.isModel = isModel;
})(NevisEngine || (NevisEngine = {}));
/** Public, browser-only inference contract shared with python/ml.py. */
var NevisEngine;
(function (NevisEngine) {
    function isPublishedModel(m) {
        return !!m && m.schema === 2 && (m.language === 'fa' || m.language === 'en') && m.dimensions === 2048 && m.numeric_dimensions === 8 &&
            Array.isArray(m.weights) && m.weights.length === 2056 && m.weights.every((n) => typeof n === 'number' && Number.isFinite(n)) && Number.isFinite(m.bias);
    }
    NevisEngine.isPublishedModel = isPublishedModel;
    function modelLanguage(s) {
        const fa = (s.match(/[\u0600-\u06ff]/g) || []).length, en = (s.match(/[A-Za-z]/g) || []).length;
        return fa > en * 2 ? 'fa' : en > fa * 2 ? 'en' : 'mixed';
    }
    NevisEngine.modelLanguage = modelLanguage;
    function normalizeML(s) {
        return s.normalize('NFKC').toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u200e\u200f]/g, ' ')
            .replace(/[ًٌٍَُِّْـ]/g, '').replace(/\s+/g, ' ').trim();
    }
    function fnv(s) {
        let hash = 2166136261;
        for (let i = 0; i < s.length; i++) {
            hash ^= s.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }
    function browserFeatures(source) {
        const text = normalizeML(source).slice(0, 8000);
        const wordRE = /[\p{L}\p{N}]+/gu;
        const words = (text.match(wordRE) || []).slice(0, 1200);
        const accum = new Map();
        function add(key, v) { const idx = fnv(key) % 2048; accum.set(idx, (accum.get(idx) || 0) + v); }
        words.forEach((w, i) => { add('w:' + w, 1); if (i)
            add('b:' + words[i - 1] + ' ' + w, .75); });
        const flat = text.replace(/\s+/g, ' ');
        for (const n of [3, 4])
            for (let i = 0; i + n <= flat.length; i += 2)
                add('c' + n + ':' + flat.slice(i, i + n), .3);
        const items = [...accum].map(([k, v]) => [k, Math.sqrt(v)]);
        const magnitude = Math.sqrt(items.reduce((s, [, v]) => s + v * v, 0)) || 1;
        items.forEach(x => x[1] /= magnitude);
        const sents = text.split(/[.!?؟]+/).map(t => (t.match(wordRE) || []).length).filter(n => n >= 3);
        const mean = sents.length ? sents.reduce((a, b) => a + b, 0) / sents.length : 0;
        const cv = mean > 0 ? Math.sqrt(sents.reduce((sum, x) => sum + (x - mean) ** 2, 0) / sents.length) / mean : 0;
        const metrics = [Math.min(1, words.length / 400), Math.min(1, new Set(words).size / Math.max(1, words.length)), Math.min(1, mean / 40), Math.min(1, cv / 1.6),
            Math.min(1, sents.length / 25), Math.min(1, words.filter(x => x.length <= 3).length / Math.max(1, words.length)),
            Math.min(1, (text.match(/[،؛,:;]/g) || []).length / Math.max(1, words.length) * 3),
            Math.min(1, (text.match(/\n\s*\n/g) || []).length / 10 + 0.1)];
        metrics.forEach((v, i) => items.push([2048 + i, (v - .5) * .45]));
        return items;
    }
    NevisEngine.browserFeatures = browserFeatures;
    function publishedPredict(source, model) {
        if (!model)
            return { score: null, reason: 'هنوز مدل آموزش‌دیده‌ای برای این زبان منتشر نشده است.', verdict: 'unavailable' };
        if (modelLanguage(source) !== model.language)
            return { score: null, reason: 'زبان متن با مدل منتشرشده سازگار نیست.', verdict: 'unavailable' };
        const words = (normalizeML(source).match(/[\p{L}\p{N}]+/gu) || []).length;
        if (words < 80)
            return { score: null, reason: 'برای ارزیابی مدل، حداقل ۸۰ واژه وارد کنید.', verdict: 'unavailable' };
        let raw = model.bias;
        for (const [k, x] of browserFeatures(source))
            raw += model.weights[k] * x;
        const score = 1 / (1 + Math.exp(-Math.min(20, Math.max(-20, raw))));
        return { score: Math.round(score * 1000) / 10, reason: 'امتیاز طبقه‌بند بر اساس مدل انتشار‌یافته است، نه احتمال قطعی منشأ متن.', verdict: score >= .65 ? 'ai' : score <= .35 ? 'human' : 'uncertain' };
    }
    NevisEngine.publishedPredict = publishedPredict;
    const sessions = {};
    /** Use ONNX Runtime Web when deployed with local WASM assets; otherwise the
        portable TypeScript linear-inference path remains fully functional. */
    async function predictOnnx(source, language) {
        const globalWindow = window;
        const ort = globalWindow.ort;
        if (!ort?.InferenceSession || !ort?.Tensor)
            return null;
        if (modelLanguage(source) !== language)
            return null;
        try {
            ort.env.wasm.wasmPaths = new URL('./vendor/', location.href).href;
            ort.env.wasm.numThreads = 1;
            if (!sessions[language])
                sessions[language] = ort.InferenceSession.create('./models/' + language + '.onnx', { executionProviders: ['wasm'] });
            const session = await sessions[language];
            const data = new Float32Array(2056);
            browserFeatures(source).forEach(([idx, v]) => { data[idx] = v; });
            const result = await session.run({ input: new ort.Tensor('float32', data, [1, 2056]) });
            const value = Number(result.output?.data?.[0]);
            return Number.isFinite(value) ? Math.round(Math.max(0, Math.min(1, value)) * 1000) / 10 : null;
        }
        catch (_) { // Keep the portable local inference functional if WASM/ONNX fails.
            delete sessions[language];
            return null;
        }
    }
    NevisEngine.predictOnnx = predictOnnx;
})(NevisEngine || (NevisEngine = {}));
/** NevisSanj public product — detection flow only; no training or administration routes. */
var NevisApp;
(function (NevisApp) {
    const sample = 'در دنیای امروز استفاده از فناوری‌های نوین در سازمان‌ها نقش مهمی ایفا می‌کند. از سوی دیگر، توجه به تجربه کاربران و تحلیل اطلاعات می‌تواند به تصمیم‌گیری بهتر منجر شود. با این حال، نمی‌توان برای همه کسب‌وکارها یک مسیر ثابت پیشنهاد کرد. انتخاب ابزار مناسب به اندازه تیم، نوع مسئله و محدودیت منابع بستگی دارد. علاوه بر این، مدیران باید میزان تأثیر تغییرات را با شاخص‌های مشخص بررسی کنند. در نهایت می‌توان گفت ترکیب برنامه‌ریزی دقیق، گفت‌وگو با کاربران و بازبینی مستمر نتایج، به ایجاد یک مسیر توسعه پایدار کمک خواهد کرد. این نمونه صرفاً برای نمایش فرایند تحلیل در نویس‌سنج تهیه شده است و نباید برای نتیجه‌گیری درباره منشأ قطعی متن به کار رود. کاربران می‌توانند با قراردادن یک متن تازه و طولانی‌تر، الگوهای نوشتار و ارزیابی مدل محلی را مشاهده کنند.';
    const labels = { fa: 'فارسی', en: 'انگلیسی', mixed: 'چندزبانه', unknown: 'نامشخص' };
    class App extends React.Component {
        constructor(props) {
            super(props);
            this.upload = null;
            this.analyze = () => {
                if (!this.state.value.trim()) {
                    this.setState({ error: 'ابتدا متن موردنظر را وارد کنید.' });
                    return;
                }
                if (this.state.value.length > 80000) {
                    this.setState({ error: 'برای تحلیل، حداکثر ۸۰ هزار نویسه وارد کنید.' });
                    return;
                }
                const report = NevisEngine.analyze(this.state.value);
                this.setState({ report, hasAnalyzed: true, error: '', busy: false, onnxScore: null });
                const lang = report.language;
                if ((lang === 'fa' || lang === 'en') && this.state.models[lang]) {
                    const requested = this.state.value;
                    NevisEngine.predictOnnx(requested, lang).then(score => {
                        if (this.state.value === requested && score !== null)
                            this.setState({ onnxScore: score });
                    });
                }
            };
            this.fileChanged = (event) => {
                const file = event.target.files && event.target.files[0];
                if (!file)
                    return;
                if (!/\.(txt|md)$/i.test(file.name) || file.size > 400000) {
                    this.setState({ error: 'فقط فایل TXT یا MD با حجم حداکثر ۴۰۰ کیلوبایت مجاز است.' });
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => this.setState({ value: String(reader.result || ''), report: null, hasAnalyzed: false, onnxScore: null, error: '' });
                reader.onerror = () => this.setState({ error: 'خواندن فایل ممکن نشد.' });
                reader.readAsText(file, 'utf-8');
                event.target.value = '';
            };
            this.exportReport = () => {
                if (!this.state.report)
                    return;
                const report = this.state.report;
                const lang = report.language === 'fa' || report.language === 'en' ? report.language : null;
                const pred = lang ? NevisEngine.publishedPredict(this.state.value, this.state.models[lang]) : null;
                const text = `نویس‌سنج | گزارش تحلیل\nتعداد واژه: ${report.wordCount}\nزبان: ${labels[report.language]}\n${pred && pred.score !== null ? 'امتیاز مدل: ' + pred.score + ' / 100' : 'نتیجه مدل: در دسترس نیست'}\nتوضیح: امتیاز طبقه‌بند اثبات منشأ متن نیست.\n\nشواهد متن:\n${report.findings.map(f => '- ' + f.title + ': ' + f.description).join('\n')}`;
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'nevis-sanj-report.txt';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            };
            this.state = { value: '', report: null, busy: false, dark: false, models: { fa: null, en: null }, status: 'در حال بررسی مدل‌های منتشرشده...', error: '', hasAnalyzed: false, onnxScore: null };
        }
        componentDidMount() { this.loadModels(); }
        async loadModels() {
            const fetched = { fa: null, en: null };
            for (const lang of ['fa', 'en']) {
                try {
                    const res = await fetch('./models/' + lang + '.json', { cache: 'no-store' });
                    if (res.ok) {
                        const data = await res.json();
                        if (NevisEngine.isPublishedModel(data) && data.language === lang)
                            fetched[lang] = data;
                    }
                }
                catch (_) { /* No model is a legitimate and visible state; never manufacture a percentage. */ }
            }
            const count = Number(!!fetched.fa) + Number(!!fetched.en);
            this.setState({ models: fetched, status: count ? `${count.toLocaleString('fa-IR')} مدل فعال، آماده بررسی محلی` : 'هنوز مدل آموزش‌دیده‌ای منتشر نشده؛ شواهد نگارشی قابل بررسی‌اند.' });
        }
        render() {
            const { value, report, models, status, error, onnxScore } = this.state;
            const language = report?.language;
            const model = (language === 'fa' || language === 'en') ? models[language] : null;
            const prediction = report && (language === 'fa' || language === 'en') ? NevisEngine.publishedPredict(value, model) : null;
            const score = prediction?.score === null ? null : onnxScore ?? prediction?.score ?? null;
            const finalVerdict = score === null ? 'unavailable' : score >= 65 ? 'ai' : score <= 35 ? 'human' : 'uncertain';
            const verdict = finalVerdict === 'ai' ? 'شواهد مدل به نفع تولید ماشینی' : finalVerdict === 'human' ? 'شواهد مدل به نفع نگارش انسانی' : finalVerdict === 'uncertain' ? 'نتیجه مدل نامشخص' : 'مدل قابل استفاده نیست';
            return React.createElement("div", { className: "public-shell" },
                React.createElement("header", { className: "pub-header" },
                    React.createElement("div", { className: "brand" },
                        React.createElement("div", { className: "logo-mark" }, "\u0646"),
                        React.createElement("div", null,
                            React.createElement("strong", null, "\u0646\u0648\u06CC\u0633\u200C\u0633\u0646\u062C"),
                            React.createElement("small", null, "\u062A\u062D\u0644\u06CC\u0644 \u0647\u0648\u0634\u0645\u0646\u062F \u0646\u0648\u0634\u062A\u0627\u0631"))),
                    React.createElement("div", { className: "header-right" },
                        React.createElement("span", { className: "privacy" },
                            React.createElement("span", { className: "live-dot" }),
                            "\u067E\u0631\u062F\u0627\u0632\u0634 \u0645\u062A\u0646 \u0631\u0648\u06CC \u062F\u0633\u062A\u06AF\u0627\u0647 \u0634\u0645\u0627"))),
                React.createElement("main", { className: "pub-main" },
                    React.createElement("section", { className: "hero" },
                        React.createElement("div", { className: "eyebrow" }, "NEVIS SANJ \u00B7 WRITING INTELLIGENCE"),
                        React.createElement("h1", null, "\u0645\u062A\u0646 \u0631\u0627 \u0639\u0645\u06CC\u0642\u200C\u062A\u0631 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F."),
                        React.createElement("p", null, "\u0646\u0634\u0627\u0646\u0647\u200C\u0647\u0627\u06CC \u0646\u0648\u0634\u062A\u0627\u0631\u06CC \u0631\u0627 \u06A9\u0634\u0641 \u06A9\u0646\u06CC\u062F \u0648 \u062F\u0631 \u0635\u0648\u0631\u062A \u0648\u062C\u0648\u062F \u0645\u062F\u0644 \u0622\u0645\u0648\u0632\u0634\u200C\u062F\u06CC\u062F\u0647\u060C \u0627\u0631\u0632\u06CC\u0627\u0628\u06CC \u0645\u0633\u062A\u0642\u0644 \u0645\u0646\u0634\u0623 \u0645\u062A\u0646 \u0631\u0627 \u0628\u0628\u06CC\u0646\u06CC\u062F.")),
                    React.createElement("section", { className: "workspace" },
                        React.createElement("div", { className: "panel input-panel" },
                            React.createElement("div", { className: "panel-head" },
                                React.createElement("div", null,
                                    React.createElement("h2", null, "\u0645\u062A\u0646 \u0628\u0631\u0627\u06CC \u062A\u062D\u0644\u06CC\u0644"),
                                    React.createElement("p", null, "\u0645\u062A\u0646 \u0641\u0627\u0631\u0633\u06CC \u06CC\u0627 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.")),
                                React.createElement("span", { className: "step" }, "\u06F0\u06F1 / \u0648\u0631\u0648\u062F\u06CC")),
                            React.createElement("textarea", { className: "pub-editor", dir: "auto", value: value, onChange: (e) => this.setState({ value: e.target.value, report: null, hasAnalyzed: false, onnxScore: null, error: '' }), placeholder: "\u0645\u062A\u0646 \u062E\u0648\u062F \u0631\u0627 \u0627\u06CC\u0646\u062C\u0627 \u0628\u0646\u0648\u06CC\u0633\u06CC\u062F \u06CC\u0627 \u062C\u0627\u06CC\u200C\u06AF\u0630\u0627\u0631\u06CC \u06A9\u0646\u06CC\u062F...", maxLength: 80000 }),
                            React.createElement("div", { className: "editor-footer" },
                                React.createElement("span", null,
                                    (value.match(/[\p{L}\p{N}]+/gu) || []).length.toLocaleString('fa-IR'),
                                    " \u0648\u0627\u0698\u0647 \u00B7 ",
                                    value.length.toLocaleString('fa-IR'),
                                    " \u0646\u0648\u06CC\u0633\u0647"),
                                React.createElement("div", { className: "inline-actions" },
                                    React.createElement("input", { ref: (el) => this.upload = el, type: "file", accept: ".txt,.md,text/plain,text/markdown", onChange: this.fileChanged, style: { display: 'none' } }),
                                    React.createElement("button", { className: "text-button", onClick: () => this.upload?.click() }, "\u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u0641\u0627\u06CC\u0644"),
                                    React.createElement("button", { className: "text-button", onClick: () => this.setState({ value: sample, report: null, hasAnalyzed: false, onnxScore: null, error: '' }) }, "\u0645\u062A\u0646 \u0646\u0645\u0648\u0646\u0647"),
                                    React.createElement("button", { className: "text-button", onClick: () => this.setState({ value: '', report: null, hasAnalyzed: false, onnxScore: null, error: '' }) }, "\u067E\u0627\u06A9\u200C\u06A9\u0631\u062F\u0646"))),
                            error ? React.createElement("p", { className: "form-error", role: "alert" }, error) : null,
                            React.createElement("button", { className: "primary-button", onClick: this.analyze, disabled: !value.trim() },
                                "\u0628\u0631\u0631\u0633\u06CC \u0645\u062A\u0646 ",
                                React.createElement("span", null, "\u2190"))),
                        React.createElement("div", { className: "panel result-panel" },
                            React.createElement("div", { className: "panel-head" },
                                React.createElement("div", null,
                                    React.createElement("h2", null, "\u0646\u062A\u06CC\u062C\u0647 \u0628\u0631\u0631\u0633\u06CC"),
                                    React.createElement("p", null, "\u062E\u0631\u0648\u062C\u06CC \u0645\u0633\u062A\u0642\u0644 \u0648 \u0634\u0641\u0627\u0641 \u062A\u062D\u0644\u06CC\u0644")),
                                React.createElement("span", { className: "step" }, "\u06F0\u06F2 / \u0646\u062A\u06CC\u062C\u0647")),
                            !report ? React.createElement("div", { className: "empty-result" },
                                React.createElement("div", { className: "empty-glyph" }, "\u25CE"),
                                React.createElement("h3", null, "\u0647\u0646\u0648\u0632 \u0645\u062A\u0646\u06CC \u062A\u062D\u0644\u06CC\u0644 \u0646\u0634\u062F\u0647"),
                                React.createElement("p", null, "\u0645\u062A\u0646 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F \u0648 \u062F\u06A9\u0645\u0647 \u0628\u0631\u0631\u0633\u06CC \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F. \u0646\u062A\u06CC\u062C\u0647 \u062F\u0631 \u0647\u0645\u06CC\u0646 \u0628\u062E\u0634 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F.")) : React.createElement("div", { className: "analysis-content" },
                                React.createElement("div", { className: 'verdict ' + (score === null ? 'no-model' : finalVerdict) },
                                    React.createElement("div", { className: "verdict-top" },
                                        React.createElement("span", null, "\u0627\u0631\u0632\u06CC\u0627\u0628\u06CC \u0645\u0646\u0634\u0623 \u0645\u062A\u0646"),
                                        React.createElement("span", { className: "tiny" },
                                            "\u0645\u062F\u0644 ",
                                            labels[language])),
                                    React.createElement("strong", null, verdict),
                                    score !== null ? React.createElement(React.Fragment, null,
                                        React.createElement("div", { className: "score-line" },
                                            React.createElement("b", null,
                                                score.toLocaleString('fa-IR'),
                                                React.createElement("small", null, " / \u06F1\u06F0\u06F0")),
                                            React.createElement("span", null, onnxScore !== null ? 'پردازش ONNX در مرورگر' : 'امتیاز مدل؛ نه احتمال قطعی')),
                                        React.createElement("div", { className: "meter" },
                                            React.createElement("div", { style: { width: score + '%' } }))) : React.createElement("p", { className: "no-model-text" }, prediction?.reason || 'برای متن ترکیبی، مدل منتشرشده در دسترس نیست.')),
                                React.createElement("div", { className: "report-stats" },
                                    React.createElement("div", null,
                                        React.createElement("strong", null, report.wordCount.toLocaleString('fa-IR')),
                                        React.createElement("span", null, "\u0648\u0627\u0698\u0647")),
                                    React.createElement("div", null,
                                        React.createElement("strong", null, report.findings.length.toLocaleString('fa-IR')),
                                        React.createElement("span", null, "\u0646\u0634\u0627\u0646\u0647")),
                                    React.createElement("div", null,
                                        React.createElement("strong", null, labels[report.language]),
                                        React.createElement("span", null, "\u0632\u0628\u0627\u0646"))),
                                React.createElement("div", { className: "section-label" }, "\u0634\u0648\u0627\u0647\u062F \u0642\u0627\u0628\u0644 \u0628\u0631\u0631\u0633\u06CC"),
                                React.createElement("div", { className: "findings" }, report.findings.length ? report.findings.slice(0, 8).map(f => React.createElement("article", { className: "finding", key: f.id },
                                    React.createElement("div", { className: "finding-top" },
                                        React.createElement("b", null, f.title),
                                        React.createElement("span", null, f.hits.length ? f.hits.length.toLocaleString('fa-IR') + ' مورد' : 'الگوی ساختاری')),
                                    React.createElement("p", null, f.description),
                                    f.hits.length ? React.createElement("blockquote", { dir: "auto" },
                                        "\u00AB",
                                        f.hits[0].text.slice(0, 150),
                                        "\u00BB") : null)) : React.createElement("p", { className: "muted" }, "\u062F\u0631 \u0627\u06CC\u0646 \u0645\u062A\u0646\u060C \u0646\u0634\u0627\u0646\u0647 \u0642\u0627\u0628\u0644\u200C\u06AF\u0632\u0627\u0631\u0634\u06CC \u0627\u0632 \u0642\u0648\u0627\u0639\u062F \u0641\u0639\u0644\u06CC \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F. \u0627\u06CC\u0646 \u0628\u0647 \u0645\u0639\u0646\u0627\u06CC \u0627\u0646\u0633\u0627\u0646\u06CC\u200C\u0628\u0648\u062F\u0646 \u0645\u062A\u0646 \u0646\u06CC\u0633\u062A.")),
                                React.createElement("button", { className: "secondary-button", onClick: this.exportReport }, "\u062F\u0631\u06CC\u0627\u0641\u062A \u06AF\u0632\u0627\u0631\u0634 \u0645\u062A\u0646\u06CC")))),
                    React.createElement("div", { className: "status-line" },
                        React.createElement("span", { className: "status-bullet" }),
                        status),
                    React.createElement("p", { className: "disclaimer" }, "\u0646\u062A\u06CC\u062C\u0647 \u0646\u0648\u06CC\u0633\u200C\u0633\u0646\u062C \u0635\u0631\u0641\u0627\u064B \u06CC\u06A9 \u0627\u0631\u0632\u06CC\u0627\u0628\u06CC \u0622\u0645\u0627\u0631\u06CC \u0648 \u0632\u0628\u0627\u0646\u06CC \u0627\u0633\u062A \u0648 \u0628\u0631\u0627\u06CC \u0627\u062B\u0628\u0627\u062A \u0647\u0648\u06CC\u062A \u0646\u0648\u06CC\u0633\u0646\u062F\u0647 \u06CC\u0627 \u062A\u0635\u0645\u06CC\u0645\u200C\u0647\u0627\u06CC \u062A\u0646\u0628\u06CC\u0647\u06CC \u0648 \u062D\u0642\u0648\u0642\u06CC \u06A9\u0627\u0641\u06CC \u0646\u06CC\u0633\u062A.")),
                React.createElement("footer", { className: "pub-footer" },
                    "\u0646\u0648\u06CC\u0633\u200C\u0633\u0646\u062C ",
                    React.createElement("span", null, "\u00A9 \u06F2\u06F0\u06F2\u06F6"),
                    React.createElement("span", null, "\u00B7"),
                    " \u0646\u0633\u062E\u0647 \u06F2.\u06F4.\u06F0"));
        }
    }
    NevisApp.App = App;
    ReactDOM.render(React.createElement(App, null), document.getElementById('root'));
})(NevisApp || (NevisApp = {}));
//# sourceMappingURL=app.js.map