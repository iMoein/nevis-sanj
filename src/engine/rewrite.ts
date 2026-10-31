/**
 * Persian writing editor — independent of the authorship/detection engine.
 * A conservative, auditable style editor, NOT an LLM and NOT an AI-origin eraser.
 */
namespace NevisRewrite {
  export type Origin = 'unknown' | 'human' | 'ai';
  export type Style = 'professional-natural';
  export type Edit = { before: string; after: string; start: number; end: number; reason: string };
  export type Review = { ok: boolean; warnings: string[] };
  export type Result = {
    original: string; text: string; style: Style; strength: number;
    changes: Edit[]; candidates: number; review: Review;
    provenance: { originalOrigin: Origin; transformation: 'local-rule-based'; aiModelUsed: false; authorshipClaim: false };
  };
  type Rule = { before: string; after: string; reason: string };
  const RULES: Rule[] = [
    {before:'نمی شوند',after:'نمی‌شوند',reason:'نیم‌فاصله درست در فعل منفی'},
    {before:'نمی شود',after:'نمی‌شود',reason:'نیم‌فاصله درست در فعل منفی'},
    {before:'نمی کنند',after:'نمی‌کنند',reason:'نیم‌فاصله درست در فعل منفی'},
    {before:'نمی کند',after:'نمی‌کند',reason:'نیم‌فاصله درست در فعل منفی'},
    {before:'می شوند',after:'می‌شوند',reason:'نیم‌فاصله درست در فعل'},
    {before:'می شود',after:'می‌شود',reason:'نیم‌فاصله درست در فعل'},
    {before:'می کنند',after:'می‌کنند',reason:'نیم‌فاصله درست در فعل'},
    {before:'می کند',after:'می‌کند',reason:'نیم‌فاصله درست در فعل'},
    {before:'از اهمیت بالایی برخوردار است',after:'اهمیت زیادی دارد',reason:'بیان مستقیم‌تر'},
    {before:'از اهمیت بالایی برخوردار هستند',after:'اهمیت زیادی دارند',reason:'بیان مستقیم‌تر'},
    {before:'مورد بررسی قرار گرفت',after:'بررسی شد',reason:'کاهش فعل مرکب طولانی'},
    {before:'مورد بررسی قرار می‌گیرد',after:'بررسی می‌شود',reason:'کاهش فعل مرکب طولانی'},
    {before:'مورد استفاده قرار می‌گیرد',after:'استفاده می‌شود',reason:'فعل مستقیم‌تر'},
    {before:'مورد استفاده قرار می‌گیرند',after:'استفاده می‌شوند',reason:'فعل مستقیم‌تر'},
    {before:'این امکان را فراهم می‌سازد',after:'این امکان را فراهم می‌کند',reason:'فعل روان‌تر'},
    {before:'این امکان را فراهم می‌نماید',after:'این امکان را فراهم می‌کند',reason:'فعل روان‌تر'},
    {before:'به منظور',after:'برای',reason:'حذف عبارت اداری زائد'},
    {before:'در خصوص',after:'درباره',reason:'انتخاب واژه رایج‌تر'},
    {before:'در رابطه با',after:'درباره',reason:'انتخاب واژه رایج‌تر'},
    {before:'بهره‌گیری از',after:'استفاده از',reason:'واژه رایج‌تر'},
    {before:'بهره گیری از',after:'استفاده از',reason:'واژه رایج‌تر'},
    {before:'به طور کلی',after:'در مجموع',reason:'پیوند طبیعی‌تر'},
    {before:'به‌طور کلی',after:'در مجموع',reason:'پیوند طبیعی‌تر'},
    {before:'بدین ترتیب',after:'به این ترتیب',reason:'نوشتار روان‌تر'},
    {before:'می‌باشد',after:'است',reason:'فعل ساده‌تر'},
    {before:'می‌باشند',after:'هستند',reason:'فعل ساده‌تر'},
    {before:'می باشد',after:'است',reason:'فعل ساده‌تر'},
    {before:'می باشند',after:'هستند',reason:'فعل ساده‌تر'},
    {before:'می‌نماید',after:'می‌کند',reason:'فعل ساده‌تر'},
    {before:'می نماید',after:'می‌کند',reason:'فعل ساده‌تر'}
  ];
  const lexicalWord = '[\\p{L}\\p{N}\\u200c]';
  const QUOTED = /«[^»]*»|“[^”]*”|"[^"\n]*"|'[^'\n]*'|`[^`\n]*`|https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu;
  const NUMBERS = /[+-]?[0-9۰-۹٠-٩]+(?:[.,٬٫][0-9۰-۹٠-٩]+)*/gu;
  const LATIN = /\b[A-Za-z][A-Za-z0-9_-]*\b/g;
  const NEGATION = /(?:^|[^\p{L}])(?:نمی[\u200c ]?[\p{L}]+|نخواهد|نیست|نبود|نشد|نکرد[\p{L}]*|نباید|هرگز|بدون|هیچ|نه)(?=$|[^\p{L}])/gu;

  function blocks(text: string): Array<{start:number;end:number}> {
    return Array.from(text.matchAll(QUOTED), m => ({ start:m.index || 0,end:(m.index||0)+m[0].length }));
  }
  function intersects(a:number,b:number, items:Array<{start:number;end:number}>):boolean {
    return items.some(x=>a<x.end&&b>x.start);
  }
  function invariants(text: string): {numbers:string[];latin:string[];quotes:string[];negations:string[]} {
    const sorted=(items:string[])=>items.sort();
    return {
      numbers: sorted(text.match(NUMBERS)||[]),
      latin: sorted(text.match(LATIN)||[]),
      quotes: Array.from(text.matchAll(QUOTED),m=>m[0]),
      negations: sorted((text.match(NEGATION)||[]).map(x=>x.replace(/[\s\u200c]/gu,'')))
    };
  }
  export function review(original:string, revision:string): Review {
    const warnings:string[]=[];
    if(!original.trim()||!revision.trim())warnings.push('متن ورودی یا خروجی خالی است.');
    const a=invariants(original),b=invariants(revision);
    if(JSON.stringify(a.numbers)!==JSON.stringify(b.numbers))warnings.push('عدد یا مقدار در بازنویسی تغییر کرده است.');
    if(JSON.stringify(a.latin)!==JSON.stringify(b.latin))warnings.push('یک نام یا عبارت لاتین تغییر کرده است.');
    if(JSON.stringify(a.quotes)!==JSON.stringify(b.quotes))warnings.push('نقل‌قول، آدرس یا متن محافظت‌شده تغییر کرده است.');
    if(JSON.stringify(a.negations)!==JSON.stringify(b.negations))warnings.push('ساختار نفی تغییر کرده است؛ معنا را دستی بررسی کنید.');
    const originalWords=original.trim().split(/\s+/u).length;
    const revisionWords=revision.trim().split(/\s+/u).length;
    if(originalWords>9 && Math.abs(revisionWords-originalWords)/originalWords>.30)
      warnings.push('طول متن بیش از ۳۰٪ تغییر کرده و باید از نظر حذف اطلاعات بررسی شود.');
    return {ok:warnings.length===0,warnings};
  }
  export function rewrite(text:string, strength=45, origin:Origin='unknown'):Result {
    if(!Number.isFinite(strength)||strength<0||strength>100)
      throw new RangeError('شدت بازنویسی باید عددی بین صفر و صد باشد.');
    const original=text.slice(0,40000);
    const protectedBlocks=blocks(original);
    const candidates:Edit[]=[];
    for(const rule of RULES){
      const escaped=rule.before.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const pattern=new RegExp('(^|[^'+lexicalWord.slice(1,-1)+'])('+escaped+')(?=$|[^'+lexicalWord.slice(1,-1)+'])','gu');
      for(const m of original.matchAll(pattern)){
        const start=(m.index||0)+m[1].length,end=start+m[2].length;
        // Never alter literal quotations, URLs, code, identifiers or negated verbs.
        if(intersects(start,end,protectedBlocks))continue;
        if(start>0 && /[ن]/u.test(original[start-1]) && /^می/u.test(rule.before))continue;
        candidates.push({before:m[2],after:rule.after,start,end,reason:rule.reason});
      }
    }
    // Stable original-order selection; longer competing phrases take precedence.
    candidates.sort((a,b)=>a.start-b.start||b.end-a.end);
    const clean:Edit[]=[];
    for(const item of candidates)if(!intersects(item.start,item.end,clean))clean.push(item);
    const limit=strength===0?0:Math.max(1,Math.round(clean.length*strength/100));
    // Choose spaced occurrences to avoid changing just one paragraph in longer texts.
    const selected:Edit[]=[];
    for(let i=0;i<limit;i++){
      const idx=Math.min(clean.length-1,Math.floor((i+.5)*clean.length/limit));
      if(clean[idx])selected.push(clean[idx]);
    }
    let next=original;
    for(const edit of selected.slice().reverse()){
      next=next.slice(0,edit.start)+edit.after+next.slice(edit.end);
    }
    const quality=review(original,next);
    if(!quality.ok)next=original;
    return {original,text:next,style:'professional-natural',strength,changes:quality.ok?selected:[],
      candidates:clean.length,review:quality,provenance:{originalOrigin:origin,
        transformation:'local-rule-based',aiModelUsed:false,authorshipClaim:false}};
  }
}
