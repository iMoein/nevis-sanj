import json,hashlib,sys,collections
from pathlib import Path
import pyarrow.parquet as pq
ROOT=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(ROOT/'python'))
from ml import normalized,tokens,lang_of
INPUT=ROOT/'admin_data/imports/parquet/en-acmc-small_train.parquet'
TEST=ROOT/'admin_data/imports/parquet/en-acmc-test.parquet'
OUT=ROOT/'training/approved/training-en-expanded.jsonl'
BENCH=ROOT/'admin_data/benchmark-en';BENCH.mkdir(parents=True,exist_ok=True)
def sha(text):return hashlib.sha256(normalized(text).encode()).hexdigest()
def main():
 prior=[json.loads(x) for x in (ROOT/'admin_data/en.jsonl').read_text().splitlines() if x]
 target={'human':14100,'ai':14220};prior_counts=collections.Counter(x['label'] for x in prior)
 need={c:target[c]-prior_counts[c] for c in target}
 reserved=[];seen={sha(x['text']) for x in prior};excluded=collections.Counter()
 for b in pq.ParquetFile(TEST).iter_batches(batch_size=250,columns=['text','label','label_text','language','is_adversarial','source','domain','generator_family']):
  for r in b.to_pylist():
   txt=r.get('text','')
   if not isinstance(txt,str) or r.get('language')!='en' or r.get('is_adversarial') or r.get('label_text') not in ('human','ai'):continue
   if len(reserved)>=2000:break
   h=sha(txt)
   if h in seen:continue
   seen.add(h)
   reserved.append({'text':txt,'label':r['label_text'],'source':r.get('source'),'domain':r.get('domain')})
  if len(reserved)>=2000:break
 examples={'human':[],'ai':[]}
 for batch in pq.ParquetFile(INPUT).iter_batches(batch_size=500,columns=['text','label','label_text','is_adversarial','domain','generator_family','language','source','ai_fraction']):
  for r in batch.to_pylist():
   c=r.get('label_text');txt=r.get('text')
   if c not in need or len(examples[c])>=need[c]:continue
   if r.get('language')!='en' or r.get('label')!=(1 if c=='ai' else 0) or r.get('is_adversarial'):excluded['unsafe_label_or_adversarial']+=1;continue
   if not isinstance(txt,str) or len(txt)>25000 or not 40<=len(tokens(txt))<=1600 or lang_of(txt)!='en':excluded['text_quality']+=1;continue
   h=sha(txt)
   if h in seen:excluded['duplicate_or_test_overlap']+=1;continue
   seen.add(h)
   examples[c].append({'text':txt,'label':c,'group':'acmc-'+h[:22],'source_id':'acmc/multi_domain_ai_human_text','upstream_source':r.get('source'),'domain':r.get('domain'),'generator_family':r.get('generator_family'),'license':'CC BY 4.0 declared at dataset level'})
  if all(len(examples[c])>=need[c] for c in need):break
 OUT.write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for c in ('human','ai') for x in examples[c]))
 (BENCH/'heldout-test-en.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in reserved))
 report={'prior':dict(prior_counts),'target':target,'new':{k:len(v) for k,v in examples.items()},'available_final':{k:prior_counts[k]+len(examples[k]) for k in target},'heldout_test':dict(collections.Counter(x['label'] for x in reserved)),'excluded':dict(excluded),'license':'CC BY 4.0 stated on aggregate dataset; individual upstream licenses still require legal validation','published_model_changed':False}
 (BENCH/'expansion-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
if __name__=='__main__':main()
