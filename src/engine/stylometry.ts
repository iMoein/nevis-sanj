/**
 * Language-neutral, explainable stylometry; no authorship inference.
 * Every value is descriptive and must not be interpreted as an AI probability.
 * Source text never leaves this module/browser.
 */
namespace NevisEngine {
  export type StyleMetricId = 'rollingVocabulary' | 'wordEntropy' | 'repeatedTrigrams' | 'sentenceRhythm' | 'paragraphRhythm' | 'functionWords' | 'punctuation' | 'hapax';
  export interface StyleMetric {
    id: StyleMetricId;
    title: string;
    value: number;
    display: string;
    detail: string;
    available: boolean;
  }
  export interface StyleProfile {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    language: Language;
    validForComparison: boolean;
    metrics: StyleMetric[];
  }
  export interface StyleDelta { id: StyleMetricId; title: string; current: string; reference: string; difference: number; }
  export interface StyleComparison {
    comparable: boolean;
    explanation: string;
    languageMatches: boolean;
    differences: StyleDelta[];
  }
  const STYLO_TOKEN_RE = /[\p{L}\p{N}]+(?:[\u200c'’-][\p{L}\p{N}]+)*/gu;
  const FA_FUNCTION = new Set('از به در با برای که این آن و یا اما اگر تا را بر هم نیز چون سپس پس یک هر همه خود ما من تو او شما آنها آن‌ها است هست بود بودند می شود می‌شود شده می‌کند کند خواهد باید مثل بین بدون روی زیر دیگر چنین همان زیرا حتی'.split(' ').map(norm));
  const EN_FUNCTION = new Set('the a an and or but if for to of in on at with by from as is are was were be been being it this that these those i you he she we they not do does did have has had can could will would should may might about into over under than then there here their his her our your its'.split(' '));
  const TITLES: Record<StyleMetricId, string> = {
    rollingVocabulary: 'تنوع واژگان در بخش‌های هم‌اندازه', wordEntropy: 'آنتروپی واژگان',
    repeatedTrigrams: 'تکرار توالی سه‌واژه‌ای', sentenceRhythm: 'نوسان طول جمله‌ها',
    paragraphRhythm: 'نوسان طول پاراگراف‌ها', functionWords: 'سهم واژه‌های دستوری',
    punctuation: 'تراکم نشانه‌گذاری', hapax: 'واژه‌های تک‌بار مصرف'
  };
  const DETAILS: Record<StyleMetricId, string> = {
    rollingVocabulary: 'میانگین نسبت واژه‌های متفاوت در پنجره‌های ۵۰واژه‌ای؛ اثر طول متن را تا حدی کاهش می‌دهد.',
    wordEntropy: 'آنتروپی نرمال‌شده توزیع واژه‌ها؛ مقدار بالاتر یعنی پراکندگی بیشتر انتخاب واژگان.',
    repeatedTrigrams: 'سهم توالی‌های سه‌واژه‌ای که بیش از یک بار آمده‌اند؛ موضوع و اصطلاحات تخصصی بر آن اثر می‌گذارند.',
    sentenceRhythm: 'ضریب تغییرات طول جملات؛ عدد بالاتر یعنی تغییرپذیری بیشتر ریتم نوشتار.',
    paragraphRhythm: 'ضریب تغییرات طول بندها؛ متن فهرستی و Markdown می‌تواند آن را تغییر دهد.',
    functionWords: 'سهم واژه‌های پرکاربرد دستوری در متن؛ موضوع و زبان روی آن اثر دارند.',
    punctuation: 'تعداد نشانه‌های نگارشی به ازای هر صد واژه؛ سبک و قالب سند بر آن اثر دارد.',
    hapax: 'نسبت انواع واژه‌هایی که فقط یک بار رخ داده‌اند؛ در متن کوتاه ناپایدار است.'
  };
  const SCALE: Record<StyleMetricId, number> = {
    rollingVocabulary: 0.16, wordEntropy: 0.12, repeatedTrigrams: 0.11,
    sentenceRhythm: 0.35, paragraphRhythm: 0.45, functionWords: 0.13, punctuation: 12, hapax: 0.22
  };
  function norm(w: string): string {
    return w.normalize('NFKC').toLocaleLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
      .replace(/[ًٌٍَُِّْـ]/g, '').replace(/[\u200c’'-]/g, '');
  }
  function toks(raw: string): string[] { return (raw.match(STYLO_TOKEN_RE) || []).map(norm); }
  function avg(data: number[]): number { return data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0; }
  function cv(data: number[]): number {
    const a = avg(data);
    return a > 0 ? Math.sqrt(avg(data.map(v => (v - a) ** 2))) / a : 0;
  }
  function fix(num: number): number { return Number(num.toFixed(4)); }
  function metric(id: StyleMetricId, value: number, available: boolean, unit: 'percentage' | 'number' | 'count'): StyleMetric {
    const display = !available ? 'داده ناکافی' : unit === 'percentage' ? `${(value * 100).toFixed(1)}٪` : unit === 'count' ? value.toFixed(1) : value.toFixed(3);
    return { id, title: TITLES[id], value: fix(value), available, display, detail: DETAILS[id] };
  }
  export function getStyleProfile(text: string, language: Language): StyleProfile {
    const tokens = toks(text), n = tokens.length;
    const counts = new Map<string, number>();
    tokens.forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
    const types = [...counts.values()];
    const windows: number[] = [];
    // MATTR: all windows for short/medium texts; fixed stride for large texts.
    if (n >= 50) for (let i = 0; i <= n - 50; i += n > 2000 ? 10 : 1) {
      windows.push(new Set(tokens.slice(i, i + 50)).size / 50);
    }
    const entropy = n > 0 ? -types.reduce((sum, count) => {
      const p = count / n;
      return sum + p * Math.log2(p);
    }, 0) : 0;
    const maxEntropy = types.length > 1 ? Math.log2(types.length) : 0;
    const triCount = new Map<string, number>();
    for (let i = 0; i < n - 2; i++) {
      const key = `${tokens[i]}\u0001${tokens[i + 1]}\u0001${tokens[i + 2]}`;
      triCount.set(key, (triCount.get(key) || 0) + 1);
    }
    const occurrencesInRepeatedTrigrams = [...triCount.values()].reduce((sum, count) => sum + (count > 1 ? count : 0), 0);
    const sentenceLengths: number[] = [];
    for (const part of text.split(/\n+/u)) for (const sentence of part.split(/[.!?؟]+/u)) {
      const len = toks(sentence).length;
      if (len >= 3) sentenceLengths.push(len);
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
  export function compareStyleProfiles(target: StyleProfile, reference: StyleProfile): StyleComparison {
    const languageMatches = target.language === reference.language && (target.language === 'fa' || target.language === 'en');
    const comparable = target.validForComparison && reference.validForComparison && languageMatches;
    if (!comparable) return { comparable: false, languageMatches, differences: [],
      explanation: !languageMatches ? 'برای مقایسه، هر دو متن باید به یک زبان اصلی باشند (فارسی یا انگلیسی).'
        : 'برای مقایسه قابل استفاده، هر متن دست‌کم به ۱۵۰ واژه و ۸ جمله نیاز دارد.' };
    const differences: StyleDelta[] = [];
    for (const current of target.metrics) {
      const baseline = reference.metrics.find(x => x.id === current.id);
      if (!current.available || !baseline || !baseline.available) continue;
      differences.push({ id: current.id, title: current.title, current: current.display, reference: baseline.display,
        difference: fix(Math.abs(current.value - baseline.value) / SCALE[current.id]) });
    }
    differences.sort((a, b) => b.difference - a.difference);
    return { comparable: true, languageMatches, differences,
      explanation: 'اختلاف‌ها براساس ویژگی‌های آماری مرتب شده‌اند؛ این مقایسه هویت نویسنده یا استفاده از AI را تعیین نمی‌کند. موضوع و نوع سند را همسان انتخاب کنید.' };
  }
}
