import json,hashlib,re,sys
from pathlib import Path
from collections import Counter
import pyarrow.parquet as pq
ROOT=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(ROOT/'python'))
from ml import normalized,tokens,lang_of
BASE=ROOT/'admin_data/imports/parquet';OUT=ROOT/'training/approved/training-fa.jsonl'
def digest(t):return hashlib.sha256(normalized(t).encode()).hexdigest()
def main():
 original=[json.loads(x) for x in OUT.read_text().splitlines() if x]
 prior=[json.loads(x) for x in (ROOT/'admin_data/fa.jsonl').read_text().splitlines() if x]
 reserved=[json.loads(x) for p in ('human-test.jsonl','human-val.jsonl') for x in (ROOT/'admin_data/benchmark-fa'/p).read_text().splitlines()]
 seen={digest(r['text']) for r in original+prior+reserved}
 goal={'human':max(0,7230-sum(r['label']=='human' for r in prior)),'ai':max(0,4280-sum(r['label']=='ai' for r in prior))}
 added={'human':[],'ai':[]};reject=Counter()
 for kind,files in [('human',['human-0000.parquet']),('ai',['ai-0000.parquet','ai-0001.parquet'])]:
  for name in files:
   file=BASE/name;pf=pq.ParquetFile(file)
   cols=['Id','Title','Text','Namespace','IsDisambiguationPage'] if kind=='human' else ['id','text','source','teacher','topic','domain']
   for batch in pf.iter_batches(batch_size=400,columns=cols):
    for row in batch.to_pylist():
     if len(added[kind])>=goal[kind]:break
     txt=(row.get('Text') if kind=='human' else row.get('text')) or ''
     if kind=='human' and (row.get('Namespace')!=0 or row.get('IsDisambiguationPage') or re.search(r'link=|\[\[|\{\{|https?://',txt)):reject['article_excluded']+=1;continue
     if kind=='ai' and (row.get('source')!='synth_v1' or 'gemini' not in str(row.get('teacher','')).lower()):reject['provenance_excluded']+=1;continue
     if not isinstance(txt,str) or len(txt)>25000 or not 60<=len(tokens(txt))<=1600 or lang_of(txt)!='fa':reject['quality']+=1;continue
     key=digest(txt)
     if key in seen:reject['duplicate']+=1;continue
     seen.add(key)
     item=dict(text=txt,label=kind,group=('wiki2018-'+str(row['Id']) if kind=='human' else 'gemini-'+str(row.get('topic') or row.get('id'))[:100]),source_id=('codersan/Persian-Wikipedia-Corpus' if kind=='human' else 'ibnsina-llm/synthetic-persian-v1'),license=('CC BY-SA 4.0' if kind=='human' else 'Apache-2.0'))
     if kind=='human':item.update(snapshot='fawiki-20181001',title=row.get('Title'),attribution_url='https://fa.wikipedia.org/?curid='+str(row['Id']))
     else:item.update(generator=row.get('teacher'),topic=row.get('topic'),domain=row.get('domain'))
     added[kind].append(item)
    if len(added[kind])>=goal[kind]:break
   print('READ',name,'added',len(added[kind]),'goal',goal[kind],flush=True)
   if len(added[kind])>=goal[kind]:break
 tmp=OUT.with_suffix('.jsonl.writing');tmp.write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in original+added['human']+added['ai']));tmp.replace(OUT)
 report=dict(target={'human':7230,'ai':4280},prior_counts=dict(Counter(r['label'] for r in prior)),new_counts={k:len(v) for k,v in added.items()},rejected=dict(reject),sources=['Persian Wikipedia 2018, CC BY-SA 4.0','IbnSina synthetic Gemini, Apache-2.0'],limitations=['Same-source style confounding','Unseen generator validation required','AI rewrites must keep ai label and parent-group'])
 p=ROOT/'admin_data/benchmark-fa/tenfold-expansion.json';p.write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print('RESULT',json.dumps(report,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
