/**
 * NevisSanj: transparent, local-only writing-pattern inspector.
 * This is not a classifier of authorship. No network calls, models, or training data.
 */
namespace NevisEngine {
  export type Severity = 'low' | 'medium' | 'high';
  export type Category = 'cliche' | 'transition' | 'repetition' | 'structure' | 'self-reference' | 'specificity' | 'rhetoric' | 'attribution' | 'formatting' | 'residue';
  export type Language = 'fa' | 'en' | 'mixed' | 'unknown';
  export interface Span { start: number; end: number; text: string; }
  export interface Finding {
    id: string;
    category: Category;
    title: string;
    description: string;
    caveat: string;
    severity: Severity;
    weight: number;
    hits: Span[];
    evidenceKind?: 'stylistic' | 'artifact';
  }
  export interface Analysis {
    text: string;
    wordCount: number;
    characterCount: number;
    sentenceCount: number;
    paragraphCount: number;
    language: Language;
    lexicalDiversity: number;
    averageSentenceWords: number;
    index: number;
    level: 'insufficient' | 'low' | 'medium' | 'high';
    findings: Finding[];
    totalHighlights: number;
    categoryCount: number;
    note: string;
    style: StyleProfile;
  }
  interface PhraseRule {
    id: string;
    category: Category;
    title: string;
    description: string;
    caveat: string;
    severity: Severity;
    weight: number;
    phrases: string[];
    minHits?: number;
  }
  interface MappedText { normalized: string; offsets: number[]; }

  const RULES: PhraseRule[] = [
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

  const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

  function cleanChar(char: string): string {
    if (/\p{M}/u.test(char)) return '';
    const map: Record<string, string> = { 'ي': 'ی', 'ى': 'ی', 'ك': 'ک', 'ة': 'ه', 'ۀ': 'ه', 'أ': 'ا', 'إ': 'ا', 'ٱ': 'ا', 'ؤ': 'و', 'ئ': 'ی', 'ـ': '', '\u200c': ' ', '\u200f': ' ', '\u200e': ' ' };
    return (map[char] === undefined ? char : map[char]).toLocaleLowerCase();
  }

  function mappedNormalize(text: string): MappedText {
    let normalized = '';
    const offsets: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const replacement = cleanChar(text[i]);
      for (let j = 0; j < replacement.length; j++) {
        normalized += replacement[j];
        offsets.push(i);
      }
    }
    return { normalized, offsets };
  }

  function escapeRegex(input: string): string { return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function words(text: string): string[] {
    return text.match(/[\p{L}\p{N}]+(?:[\u200c'’-][\p{L}\p{N}]+)*/gu) || [];
  }
  function average(values: number[]): number { return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length); }
  function variation(values: number[]): number {
    const mean = average(values);
    if (mean === 0) return 0;
    return Math.sqrt(average(values.map(v => (v - mean) ** 2))) / mean;
  }
  function asSpan(text: string, start: number, end: number): Span {
    return { start, end, text: text.slice(start, end) };
  }
  function dedupeSpans(spans: Span[]): Span[] {
    const seen = new Set<string>();
    return spans.filter(s => {
      const key = `${s.start}:${s.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.start - b.start);
  }
  function ruleMatches(raw: string, mapped: MappedText, phrase: string): Span[] {
    const normalizedPhrase = mappedNormalize(phrase).normalized.trim();
    const regex = new RegExp(escapeRegex(normalizedPhrase).replace(/\s+/g, '[\\s\\u200c]+'), 'gu');
    const spans: Span[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(mapped.normalized)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const before = start > 0 ? mapped.normalized[start - 1] : '';
      const after = end < mapped.normalized.length ? mapped.normalized[end] : '';
      if (/[\p{L}\p{N}]/u.test(before) || /[\p{L}\p{N}]/u.test(after)) continue;
      const sourceStart = mapped.offsets[start];
      const sourceEnd = mapped.offsets[end - 1] + 1;
      if (sourceStart !== undefined && sourceEnd !== undefined) spans.push(asSpan(raw, sourceStart, sourceEnd));
    }
    return spans;
  }
  function getParagraphs(text: string): Span[] {
    const found: Span[] = [];
    const regex = /[^\n]+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const trimmed = match[0].trim();
      if (trimmed) {
        const lead = match[0].indexOf(trimmed);
        found.push(asSpan(text, match.index + lead, match.index + lead + trimmed.length));
      }
    }
    return found;
  }
  function getSentences(text: string): Span[] {
    const output: Span[] = [];
    for (const p of getParagraphs(text)) {
      const regex = /[^.!?؟]+(?:[.!?؟]+|$)/g;
      let match: RegExpExecArray | null;
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
  function regexMatches(raw: string, regex: RegExp, maximum = 15): Span[] {
    const hits: Span[] = [];
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(raw)) !== null && hits.length < maximum) {
      if (!match[0].length) { regex.lastIndex++; continue; }
      hits.push(asSpan(raw, match.index, match.index + match[0].length));
    }
    return dedupeSpans(hits);
  }
  function patternFinding(results: Finding[], text: string, params: Omit<Finding, 'hits'>, regex: RegExp, minimum: number): void {
    const hits = regexMatches(text, regex);
    if (hits.length >= minimum) makeFinding({ ...params, hits }, results);
  }

  function makeFinding(f: Finding, output: Finding[]) {
    f.hits = dedupeSpans(f.hits);
    if (f.hits.length) {
      f.evidenceKind ||= f.category === 'self-reference' ? 'artifact' : 'stylistic';
      output.push(f);
    }
  }

  export function analyze(text: string): Analysis {
    const allWords = words(text);
    const paragraphs = getParagraphs(text);
    const sentences = getSentences(text);
    const mapped = mappedNormalize(text);
    const results: Finding[] = [];
    const faLetters = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const enLetters = (text.match(/[A-Za-z]/g) || []).length;
    const language: Language = (faLetters + enLetters) < 6 ? 'unknown' : faLetters > enLetters * 2 ? 'fa' : enLetters > faLetters * 2 ? 'en' : 'mixed';

    for (const rule of RULES) {
      const hits = dedupeSpans(rule.phrases.flatMap(phrase => ruleMatches(text, mapped, phrase)));
      // Transition words are only interesting if they recur several times.
      if (hits.length < (rule.minHits || (rule.category === 'transition' ? 3 : 1))) continue;
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
    if (allWords.length >= 90) patternFinding(results, text, {
      id: 'markdown-heavy', category: 'formatting', title: 'قالب‌بندی پرتراکم با Markdown',
      description: 'چند تیتر، تأکید یا مورد فهرستی با نشانه‌های Markdown وجود دارد؛ در اسناد متنی ساده می‌تواند ردپای کپی خروجی چت باشد.',
      caveat: 'در فایل Markdown، مستندات فنی و نوشته توسعه‌دهندگان این نشانه کاملاً طبیعی است؛ سند را در زمینه خودش بررسی کنید.',
      severity: 'low', weight: 2
    }, /^(?:#{1,4}\s+.{3,80}|\s{0,3}[-*]\s+\*\*[^\n*]{3,55}\*\*|\*\*[^\n*]{5,80}\*\*)/gmu, 4);

    // Fragile punctuation clues intentionally receive a very low weight.
    if (language === 'en' && allWords.length >= 160) patternFinding(results, text, {
      id: 'em-dash-density', category: 'formatting', title: 'استفاده پرتکرار از خط تیره بلند',
      description: 'از em dash به دفعات استفاده شده؛ این الگو در برخی مدل‌ها و دوره‌ها دیده شده است.',
      caveat: 'قواعد نگارش، سبک نویسنده و نسخه مدل آن را تغییر می‌دهند؛ هیچ خط تیره‌ای به‌تنهایی شاهد تولید AI نیست.',
      severity: 'low', weight: 1
    }, /—/gu, Math.max(5, Math.ceil(allWords.length / 100)));

    // Repeated paragraph openings (2-4 initial words) are independent of preset phrase rules.
    if (paragraphs.length >= 4) {
      const starters = new Map<string, Span[]>();
      for (const p of paragraphs) {
        const prefix = words(p.text).slice(0, 3).map(w => mappedNormalize(w).normalized);
        if (prefix.length < 2) continue;
        const key = prefix.join(' ');
        const found = starters.get(key) || [];
        found.push(asSpan(text, p.start, Math.min(p.end, p.start + 65)));
        starters.set(key, found);
      }
      const frequent = [...starters.values()].filter(v => v.length >= 3).flat();
      if (frequent.length) makeFinding({
        id: 'repeated-openings', category: 'repetition', title: 'شروع مشابه چند پاراگراف',
        description: 'دست‌کم سه پاراگراف با واژه‌های یکسان شروع شده‌اند؛ این می‌تواند از تکرار یک قالب نوشتاری خبر بدهد.',
        caveat: 'تکرار آغاز پاراگراف گاهی انتخاب آگاهانه نویسنده برای انسجام یا تأکید است.',
        severity: 'medium', weight: 7, hits: frequent
      }, results);
    }

    // Repeated sequences of five words across different sentences.
    if (allWords.length >= 90 && sentences.length >= 4) {
      const ngrams = new Map<string, { sentences: Set<number>; spans: Span[] }>();
      for (let s = 0; s < sentences.length; s++) {
        const sentence = sentences[s];
        const tokens = [...sentence.text.matchAll(/[\p{L}\p{N}]+(?:[\u200c'’-][\p{L}\p{N}]+)*/gu)];
        for (let i = 0; i <= tokens.length - 5; i++) {
          const chunk = tokens.slice(i, i + 5);
          const key = chunk.map(t => mappedNormalize(t[0]).normalized).join(' ');
          if (key.length < 22) continue;
          const existing = ngrams.get(key) || { sentences: new Set<number>(), spans: [] };
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
      if (repeated.length) makeFinding({
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

    const typePriority: Record<Category, number> = { 'residue': 0, 'self-reference': 1, 'repetition': 2, 'attribution': 3, 'rhetoric': 4, 'cliche': 5, 'structure': 6, 'transition': 7, 'formatting': 8, 'specificity': 9 };
    results.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || typePriority[a.category] - typePriority[b.category] || b.hits.length - a.hits.length);

    const uniqueCategories = new Set(results.map(r => r.category)).size;
    // Cap contributions by category: repeating many weak buzzwords cannot create a proof-like score.
    const categories = new Map<Category, number>();
    const categoryCaps: Record<Category, number> = {
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
      index, level, findings: results, style: getStyleProfile(text, language),
      totalHighlights: results.reduce((sum, r) => sum + r.hits.length, 0),
      categoryCount: uniqueCategories,
      note: reportNote
    };
  }

  export function createReadableReport(a: Analysis): string {
    const levelNames: Record<Analysis['level'], string> = { insufficient: 'شواهد ناکافی', low: 'نشانه‌های محدود', medium: 'نیازمند بررسی', high: 'نشانه‌های متعدد' };
    const rows: string[] = [
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
}
