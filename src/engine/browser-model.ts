/** Public, browser-only inference contract shared with python/ml.py. */
namespace NevisEngine {
  export interface PublishedModel {
    schema: 2; language: 'fa' | 'en'; dimensions: number; numeric_dimensions: number;
    weights: number[]; bias: number; metrics: { train_count: number; test_count: number; false_positive_rate: number; ai_recall: number; accuracy: number };
    created_at: string; notice: string;
  }
  export function isPublishedModel(m: any): m is PublishedModel {
    return !!m && m.schema===2 && (m.language==='fa'||m.language==='en') && m.dimensions===2048 && m.numeric_dimensions===8 &&
      Array.isArray(m.weights) && m.weights.length===2056 && m.weights.every((n:any)=>typeof n==='number' && Number.isFinite(n)) && Number.isFinite(m.bias);
  }
  export function modelLanguage(s: string): 'fa'|'en'|'mixed' {
    const fa=(s.match(/[\u0600-\u06ff]/g)||[]).length, en=(s.match(/[A-Za-z]/g)||[]).length;
    return fa>en*2?'fa':en>fa*2?'en':'mixed';
  }
  function normalizeML(s:string) {
    return s.normalize('NFKC').toLowerCase().replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200e\u200f]/g,' ')
      .replace(/[ًٌٍَُِّْـ]/g,'').replace(/\s+/g,' ').trim();
  }
  function fnv(s:string) {
    let hash=2166136261;
    for(let i=0;i<s.length;i++){hash^=s.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return hash>>>0;
  }
  export function browserFeatures(source: string): [number,number][] {
    const text=normalizeML(source).slice(0,8000);
    const wordRE=/[\p{L}\p{N}]+/gu;
    const words=(text.match(wordRE)||[]).slice(0,1200);
    const accum=new Map<number,number>();
    function add(key:string,v:number){const idx=fnv(key)%2048;accum.set(idx,(accum.get(idx)||0)+v);}
    words.forEach((w,i)=>{add('w:'+w,1);if(i)add('b:'+words[i-1]+' '+w,.75);});
    const flat=text.replace(/\s+/g,' ');
    for(const n of [3,4])for(let i=0;i+n<=flat.length;i+=2)add('c'+n+':'+flat.slice(i,i+n),.3);
    const items:[number,number][]=[...accum].map(([k,v])=>[k,Math.sqrt(v)]);
    const magnitude=Math.sqrt(items.reduce((s,[,v])=>s+v*v,0))||1;
    items.forEach(x=>x[1]/=magnitude);
    const sents=text.split(/[.!?؟]+/).map(t=>(t.match(wordRE)||[]).length).filter(n=>n>=3);
    const mean=sents.length?sents.reduce((a,b)=>a+b,0)/sents.length:0;
    const cv=mean>0?Math.sqrt(sents.reduce((sum,x)=>sum+(x-mean)**2,0)/sents.length)/mean:0;
    const metrics=[Math.min(1,words.length/400),Math.min(1,new Set(words).size/Math.max(1,words.length)),Math.min(1,mean/40),Math.min(1,cv/1.6),
      Math.min(1,sents.length/25),Math.min(1,words.filter(x=>x.length<=3).length/Math.max(1,words.length)),
      Math.min(1,(text.match(/[،؛,:;]/g)||[]).length/Math.max(1,words.length)*3),
      Math.min(1,(text.match(/\n\s*\n/g)||[]).length/10+0.1)];
    metrics.forEach((v,i)=>items.push([2048+i,(v-.5)*.45]));
    return items;
  }
  export function publishedPredict(source:string,model:PublishedModel|null):{score:number|null;reason:string;verdict:'ai'|'human'|'uncertain'|'unavailable'} {
    if(!model)return {score:null,reason:'هنوز مدل آموزش‌دیده‌ای برای این زبان منتشر نشده است.',verdict:'unavailable'};
    if(modelLanguage(source)!==model.language)return {score:null,reason:'زبان متن با مدل منتشرشده سازگار نیست.',verdict:'unavailable'};
    const words=(normalizeML(source).match(/[\p{L}\p{N}]+/gu)||[]).length;
    if(words<80)return {score:null,reason:'برای ارزیابی مدل، حداقل ۸۰ واژه وارد کنید.',verdict:'unavailable'};
    let raw=model.bias;
    for(const [k,x] of browserFeatures(source))raw+=model.weights[k]*x;
    const score=1/(1+Math.exp(-Math.min(20,Math.max(-20,raw))));
    return {score:Math.round(score*1000)/10,reason:'امتیاز طبقه‌بند بر اساس مدل انتشار‌یافته است، نه احتمال قطعی منشأ متن.',verdict:score>=.65?'ai':score<=.35?'human':'uncertain'};
  }

  const sessions: {[key: string]: Promise<any>} = {};
  /** Use ONNX Runtime Web when deployed with local WASM assets; otherwise the
      portable TypeScript linear-inference path remains fully functional. */
  export async function predictOnnx(source:string,language:'fa'|'en'):Promise<number|null> {
    const globalWindow=window as any;
    const ort=globalWindow.ort;
    if(!ort?.InferenceSession || !ort?.Tensor) return null;
    if(modelLanguage(source)!==language)return null;
    try {
      ort.env.wasm.wasmPaths=new URL('./vendor/',location.href).href;
      ort.env.wasm.numThreads=1;
      if(!sessions[language])sessions[language]=ort.InferenceSession.create('./models/'+language+'.onnx',{executionProviders:['wasm']});
      const session=await sessions[language];
      const data=new Float32Array(2056);
      browserFeatures(source).forEach(([idx,v])=>{data[idx]=v;});
      const result=await session.run({input:new ort.Tensor('float32',data,[1,2056])});
      const value=Number(result.output?.data?.[0]);
      return Number.isFinite(value)?Math.round(Math.max(0,Math.min(1,value))*1000)/10:null;
    } catch (_) { // Keep the portable local inference functional if WASM/ONNX fails.
      delete sessions[language];
      return null;
    }
  }

}
