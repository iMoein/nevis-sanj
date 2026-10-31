import json,urllib.request,urllib.parse,hashlib,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(ROOT/'python'))
from ml import normalized,tokens,lang_of
DEST=ROOT/'training/approved/training-fa-ai-expanded.jsonl'
BENCH=ROOT/'admin_data/benchmark-fa'
SRC='ibnsina-llm/synthetic-persian-v1'
def fetch(offset):
 q=urllib.parse.urlencode(dict(dataset=SRC,config='default',split='train',offset=offset,length=100))
 u='https://datasets-server.huggingface.co/rows?'+q
 for i in range(4):
  try:
   with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'NevisSanjPersianTraining/1.0'}),timeout=25) as f:return json.load(f).get('rows',[])
  except Exception as e:
   if i==3:raise
   time.sleep(1.5*(i+1))
def main():
 current=[json.loads(x) for x in (ROOT/'admin_data/fa.jsonl').read_text().splitlines() if x]
 used={hashlib.sha256(normalized(x['text']).encode()).hexdigest() for x in current}
 rows=[];offset=0;skips=0;limit=4300
 while len(rows)<limit and offset<18000:
  batch=fetch(offset)
  if not batch:break
  for item in batch:
   r=item.get('row') or {};txt=r.get('text','')
   if not isinstance(txt,str) or len(txt)>25000 or not 35<=len(tokens(txt)) or lang_of(txt)!='fa':skips+=1;continue
   if r.get('source')!='synth_v1' or not str(r.get('teacher','')).lower().startswith('gemini'):skips+=1;continue
   h=hashlib.sha256(normalized(txt).encode()).hexdigest()
   if h in used:continue
   used.add(h)
   rows.append(dict(text=txt,label='ai',group='synth-'+str(r.get('topic') or r.get('id') or h[:20])[:100],
      source_id=SRC,teacher=r.get('teacher'),source_license='apache-2.0',domain=r.get('domain')))
  offset+=len(batch)
  if offset%1000==0:print('scanned',offset,'accepted',len(rows),flush=True)
 DEST.parent.mkdir(parents=True,exist_ok=True);DEST.write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
 BENCH.mkdir(parents=True,exist_ok=True)
 manifest=dict(source=SRC,license='apache-2.0',new_ai_samples=len(rows),rows_scanned=offset,skipped=skips,
  generated_by='Gemini',warning='One generator family; not independent AI holdout; do not publish without out-of-source benchmark')
 (BENCH/'ai-expansion-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 print('RESULT',json.dumps(manifest,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
