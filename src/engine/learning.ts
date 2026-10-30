/**
 * NevisSanj local supervised learning. No preset AI scores and no network access.
 * Learns from explicitly labelled AI/Human examples supplied by the user.
 * The score is an uncalibrated model score, NOT an authorship probability.
 */
namespace NevisEngine {
  export type Label = 'ai' | 'human';
  export interface LabeledExample { text: string; label: Label; group?: string; language?: 'fa' | 'en'; }
  export interface ImportResult { examples: LabeledExample[]; skipped: number; error: string; }
  export interface LocalModel {
    version: 1; dimensions: number; weights: number[]; bias: number;
    language: 'fa' | 'en'; trainedOn: number; validationCount: number;
    accuracy: number; aiRecall: number; falsePositiveRate: number; humanRecall: number;
    validationAI: number; validationHuman: number; grouped: boolean; trainedAt: string;
  }
  export interface LocalPrediction {
    available: boolean; score: number | null; verdict: 'ai' | 'human' | 'uncertain' | 'insufficient';
    explanation: string; wordCount: number;
  }
  export interface TrainingResult { model: LocalModel | null; error: string; }
  const DIMS = 4096;
  const NUMERIC = 8;
  const MIN_TRAIN_CLASS = 24;
  const tokenRE = /[\p{L}\p{N}]+(?:[\u200c'’-][\p{L}\p{N}]+)*/gu;
  function normText(t: string): string {
    return t.normalize('NFKC').toLocaleLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g,'ک').replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[\u200c\u200f\u200e]/g,' ').replace(/\s+/g,' ').trim();
  }
  export function labelOf(x: unknown): Label | null {
    const s = String(x ?? '').trim().toLowerCase();
    if (['ai','machine','generated','llm','1','synthetic','ماشینی','هوش مصنوعی'].includes(s)) return 'ai';
    if (['human','person','written','0','real','انسانی','انسان'].includes(s)) return 'human';
    return null;
  }
  function exampleFromRow(row: any): LabeledExample | null {
    if (!row || typeof row !== 'object') return null;
    const label = labelOf(row.label ?? row.origin ?? row.class ?? row.source);
    const raw = row.text ?? row.content ?? row.generated_text ?? row.writing;
    const content = typeof raw === 'string' ? raw.trim() : '';
    if (!label || content.length < 160 || content.length > 24000) return null;
    const normalized = normText(content);
    if ((normalized.match(tokenRE) || []).length < 35) return null;
    const explicitLang = row.language ?? row.lang;
    const lang = explicitLang === 'fa' || explicitLang === 'en' ? explicitLang : undefined;
    const group = row.group ?? row.topic_id ?? row.human_id ?? row.topic;
    return { text: content, label, language: lang, group: group === undefined || group === null || group === '' ? undefined : String(group).slice(0, 140) };
  }
  function csvRows(content: string): string[][] {
    const lines: string[][] = [];
    let field = '', cells: string[] = [], quoted = false;
    for (let i=0; i<content.length; i++) {
      const c = content[i];
      if (c === '"') {
        if (quoted && content[i+1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (c === ',' && !quoted) { cells.push(field); field = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && content[i+1] === '\n') i++;
        cells.push(field); if (cells.some(x => x.trim())) lines.push(cells);
        cells=[];field='';
      } else field += c;
    }
    if (quoted) throw new Error('ساختار CSV ناقص است؛ علامت نقل‌قول بسته نشده.');
    cells.push(field); if (cells.some(x=>x.trim())) lines.push(cells);
    return lines;
  }
  export function parseLabeledData(content: string, filename='data.jsonl'): ImportResult {
    let raw: any[] = [];
    try {
      if (/\.csv$/i.test(filename)) {
        const rows = csvRows(content.replace(/^\uFEFF/, ''));
        if (rows.length < 2) return { examples:[], skipped:0, error:'فایل CSV ردیف داده ندارد.' };
        const headers = rows[0].map(x=>x.trim().toLowerCase());
        raw = rows.slice(1).map(row => Object.fromEntries(headers.map((k,i) => [k, row[i] || ''])));
      } else if (/\.json$/i.test(filename)) {
        const parsed = JSON.parse(content);
        raw = Array.isArray(parsed) ? parsed : Array.isArray(parsed.examples) ? parsed.examples : [];
      } else {
        raw = content.split(/\r?\n/).filter(s=>s.trim()).map(line=>JSON.parse(line));
      }
      if (raw.length > 20000) return { examples: [], skipped: 0, error:'حداکثر ۲۰ هزار ردیف قابل ورود است.' };
      const seen = new Set<string>(), examples: LabeledExample[] = [];
      let skipped = 0;
      for (const row of raw) {
        const item = exampleFromRow(row);
        if (!item) { skipped++; continue; }
        const key = normText(item.text);
        if (seen.has(key)) { skipped++; continue; }
        seen.add(key);
        examples.push(item);
      }
      return { examples, skipped, error: examples.length ? '' : 'نمونه معتبر پیدا نشد. ستون‌های text و label با مقدار ai یا human لازم‌اند؛ متن هر ردیف باید دست‌کم ۳۵ واژه داشته باشد.' };
    } catch (e) { return { examples:[], skipped:0, error:e instanceof Error ? e.message : 'فایل قابل خواندن نیست.' }; }
  }
  function hash(s: string): number {
    let h=2166136261;
    for (let i=0;i<s.length;i++) {h ^= s.charCodeAt(i); h = Math.imul(h,16777619);}
    return h>>>0;
  }
  function languageOf(text: string): 'fa' | 'en' | 'mixed' {
    const fa=(text.match(/[\u0600-\u06FF]/g)||[]).length, en=(text.match(/[A-Za-z]/g)||[]).length;
    return fa > en*2 ? 'fa' : en > fa*2 ? 'en' : 'mixed';
  }
  function vector(text: string): [number,number][] {
    const normalized=normText(text).slice(0,8000);
    const counts = new Map<number,number>();
    const add=(key: string, factor: number) => {
      const h=hash(key)%DIMS;
      counts.set(h,(counts.get(h)||0)+factor);
    };
    // Word unigrams + bigrams, character 3-5 grams; no hand-written phrase whitelist.
    const ws=(normalized.match(tokenRE)||[]).slice(0,1400);
    for (let i=0;i<ws.length;i++) {
      add('w:'+ws[i],1.5);
      if (i>0) add('b:'+ws[i-1]+' '+ws[i],1.0);
    }
    const flat=normalized.replace(/\s+/g,' ');
    for (let size=3;size<=5;size++) for(let i=0;i+size<=flat.length;i++) {
      if (i%2===1 && flat.length>3000) continue;
      add('c'+size+':'+flat.slice(i,i+size),0.4);
    }
    const items=[...counts].map(([idx,count]):[number,number]=>[idx,Math.sqrt(count)]);
    const magnitude=Math.sqrt(items.reduce((s,x)=>s+x[1]*x[1],0))||1;
    for (const item of items) item[1] /= magnitude;
    // Stylometric features in a separate partition, standardized to bounded values.
    const sents=normalized.split(/[.!?؟]+/).map(s=>(s.match(tokenRE)||[]).length).filter(v=>v>=3);
    const mean=sents.length?sents.reduce((a,b)=>a+b,0)/sents.length:0;
    const cv=mean>0?Math.sqrt(sents.reduce((s,x)=>s+(x-mean)**2,0)/Math.max(1,sents.length))/mean:0;
    const unique=new Set(ws).size;
    const short=ws.filter(w=>w.length<=3).length;
    const numeric=[
      Math.min(1,ws.length/400), Math.min(1,unique/Math.max(1,ws.length)),
      Math.min(1,mean/40), Math.min(1,cv/1.6),
      Math.min(1,sents.length/25), Math.min(1,short/Math.max(1,ws.length)),
      Math.min(1,(normalized.match(/[،؛,:;]/g)||[]).length/Math.max(1,ws.length)*3),
      Math.min(1,normalized.split(/\n\s*\n/).length/10)
    ];
    numeric.forEach((v,i)=>items.push([DIMS+i,(v-0.5)*0.45]));
    return items;
  }
  function rawScore(v: [number,number][], w: number[], bias: number): number {
    let z=bias;
    for(const [k,x] of v) z+=w[k]*x;
    return Math.max(-20,Math.min(20,z));
  }
  function sigmoid(z:number):number {return 1/(1+Math.exp(-z));}
  export function predictLocal(text: string, model: LocalModel | null): LocalPrediction {
    const wordCount=(normText(text).match(tokenRE)||[]).length;
    if (!model) return { available:false, score:null, verdict:'insufficient', wordCount, explanation:'مدل اختصاصی هنوز آموزش ندیده است. یک مجموعه داده انسانی و ماشینی وارد کنید.' };
    if (languageOf(text)!==model.language) return { available:false, score:null, verdict:'insufficient', wordCount, explanation:'زبان متن با زبان مدل محلی متفاوت است. برای هر زبان باید مدل جداگانه آموزش داده شود.' };
    if (wordCount<80) return { available:false, score:null, verdict:'insufficient', wordCount, explanation:'برای برآورد مدل، دست‌کم ۸۰ واژه لازم است. متن کوتاه احتمال خطای بیشتری دارد.' };
    const score = sigmoid(rawScore(vector(text),model.weights,model.bias))*100;
    const verdict = score>=65?'ai':score<=35?'human':'uncertain';
    return { available:true, score:Math.round(score*10)/10, verdict, wordCount,
      explanation:'این عدد خروجی طبقه‌بند محلیِ آموزش‌دیده روی داده‌های شماست، نه احتمال قطعی منشأ متن. اختلاف سبک و موضوع، دقت را کاهش می‌دهد.' };
  }
  // Bottom-k minhash sketches of 7-word shingles reject near-identical documents
  // even when a different filename, header or paragraph order is used.
  function contentSketch(text:string):number[] {
    const toks=(normText(text).replace(/[0-9۰-۹]/g,'').match(tokenRE)||[]);
    if(toks.length<25)return [];
    const set=new Set<number>();
    for(let i=0;i+7<=toks.length;i++) set.add(hash(toks.slice(i,i+7).join(' ')));
    return [...set].sort((a,b)=>a-b).slice(0,40);
  }
  function nearDuplicate(a:number[],b:number[]):boolean {
    if(!a.length||!b.length)return false;
    const bs=new Set(b);
    const shared=a.reduce((s,h)=>s+Number(bs.has(h)),0);
    return shared/Math.min(a.length,b.length)>=0.56;
  }
  export function trainLocal(examples:LabeledExample[], language:'fa'|'en'): TrainingResult {
    const valid=examples.filter(e=>e.text && e.text.length>=160 && languageOf(e.text)===language);
    const count=(label:Label)=>valid.filter(e=>e.label===label).length;
    if(count('ai')<MIN_TRAIN_CLASS || count('human')<MIN_TRAIN_CLASS) return {model:null,error:`برای زبان انتخابی، حداقل ${MIN_TRAIN_CLASS} نمونه انسانی و ${MIN_TRAIN_CLASS} نمونه ماشینی لازم است. فعلاً ${count('human')} انسانی و ${count('ai')} ماشینی دارید.`};
    const byGroup=new Map<string,LabeledExample[]>();
    for(const ex of valid) {
      const key=ex.group ? 'g:'+ex.group : 't:'+hash(normText(ex.text)).toString(16);
      if(!byGroup.has(key)) byGroup.set(key,[]);
      byGroup.get(key)!.push(ex);
    }
    const groups=[...byGroup.entries()].sort((a,b)=>hash('split:'+a[0])-hash('split:'+b[0]));
    const test:LabeledExample[]=[], train:LabeledExample[]=[];
    const wanted={ai:Math.max(7,Math.floor(count('ai')*0.2)),human:Math.max(7,Math.floor(count('human')*0.2))};
    let heldAI=0,heldHuman=0;
    for(const [,members] of groups) {
      const a=members.filter(x=>x.label==='ai').length,h=members.length-a;
      if((heldAI<wanted.ai || heldHuman<wanted.human) &&
        (heldAI+a<=count('ai')-15) && (heldHuman+h<=count('human')-15) &&
        (a===0||heldAI<wanted.ai) && (h===0||heldHuman<wanted.human)) {
        test.push(...members); heldAI+=a;heldHuman+=h;
      } else train.push(...members);
    }
    if(heldAI<5||heldHuman<5) return {model:null,error:'گروه‌بندی داده‌ها اجازه نمی‌دهد نمونه آزمایشی کافی از هر دو کلاس کنار گذاشته شود. شناسه group را اصلاح کنید یا داده بیشتری وارد کنید.'};
    // Near-duplicate protection across training and evaluation, not only exact prefixes.
    // Sketches are local and never stored in the model or shared outside this process.
    const trainingSketches=train.map(e=>contentSketch(e.text));
    const cleanTest=test.filter(e=>{
      const sketch=contentSketch(e.text);
      return !trainingSketches.some(existing=>nearDuplicate(sketch,existing));
    });
    const positive=cleanTest.filter(x=>x.label==='ai').length;
    const negative=cleanTest.filter(x=>x.label==='human').length;
    if(positive<5||negative<5) return {model:null,error:'پس از حذف نمونه‌های تکراری، داده مستقل کافی برای ارزیابی وجود ندارد.'};
    const dataset=train.map(e=>({y:e.label==='ai'?1:0,vec:vector(e.text)}));
    const w=new Array<number>(DIMS+NUMERIC).fill(0);
    let bias=0;
    const weights={ai:train.length/(2*Math.max(1,train.filter(e=>e.label==='ai').length)),human:train.length/(2*Math.max(1,train.filter(e=>e.label==='human').length))};
    const gradientSquares=new Float64Array(w.length);
    let biasSum=0;
    for(let epoch=0;epoch<28;epoch++) {
      // Deterministic alternating order: no random or source order dependence.
      const start=epoch%dataset.length;
      for(let shift=0;shift<dataset.length;shift++) {
        const item=dataset[(start+shift)%dataset.length];
        const error=(sigmoid(rawScore(item.vec,w,bias))-item.y)*(item.y?weights.ai:weights.human);
        const learningRate=1.25;
        for(const [k,x] of item.vec) {
          const g=error*x + 0.00018*w[k];
          gradientSquares[k]+=g*g;
          w[k]-=learningRate*g/Math.sqrt(1+gradientSquares[k]);
        }
        biasSum+=error*error;
        bias-=0.18*error/Math.sqrt(1+biasSum);
      }
    }
    let tp=0,tn=0,fp=0,fn=0;
    for(const item of cleanTest) {
      const pred=sigmoid(rawScore(vector(item.text),w,bias))>=0.5;
      if(item.label==='ai') pred?tp++:fn++;
      else pred?fp++:tn++;
    }
    const model:LocalModel={version:1,dimensions:DIMS,weights:w.map(v=>Number(v.toFixed(6))),bias:Number(bias.toFixed(6)),language,
      trainedOn:train.length,validationCount:cleanTest.length,accuracy:(tp+tn)/cleanTest.length,
      aiRecall:tp/(tp+fn),humanRecall:tn/(tn+fp),falsePositiveRate:fp/(tn+fp),
      validationAI:tp+fn,validationHuman:tn+fp,grouped:valid.every(x=>!!x.group),trainedAt:new Date().toISOString()};
    return {model,error:''};
  }
  export function isModel(x: any): x is LocalModel {
    return !!x && x.version===1 && x.dimensions===DIMS && (x.language==='fa'||x.language==='en') &&
      Array.isArray(x.weights) && x.weights.length===DIMS+NUMERIC && x.weights.every((y:unknown)=>typeof y==='number'&&Number.isFinite(y)) &&
      typeof x.bias==='number' && Number.isFinite(x.bias) && Number.isFinite(x.accuracy) && Number.isFinite(x.falsePositiveRate);
  }
}
