import urllib.request,urllib.parse,urllib.error,json,hashlib,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(ROOT/'python'))
from ml import normalized,tokens,lang_of
OUT=ROOT/'training/approved/training-en-expanded.jsonl'
def digest(t):return hashlib.sha256(normalized(t).encode()).hexdigest()
def main():
 rows=[json.loads(x) for x in OUT.read_text().split('\n') if x]
 prior=[json.loads(x) for x in (ROOT/'admin_data/en.jsonl').read_text().splitlines() if x]
 reserved=[json.loads(x) for x in (ROOT/'admin_data/benchmark-en/heldout-test-en.jsonl').read_text().splitlines() if x]
 seen={digest(r['text']) for r in rows+prior+reserved}
 got=[];offset=0
 while len(got)<545 and offset<4000:
  q=urllib.parse.urlencode(dict(dataset='R-obi/ai-text-detection-pile-cleaned',config='default',split='train',offset=offset,length=100))
  u='https://datasets-server.huggingface.co/rows?'+q
  try:
   with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'NevisSanj/1.0'}),timeout=25) as f:batch=json.load(f).get('rows',[])
  except urllib.error.HTTPError as e:
   if e.code==429:print('RATE_LIMIT_REACHED',offset,flush=True);break
   raise
  if not batch:break
  for item in batch:
   r=item.get('row') or {};text=r.get('text','');label=str(r.get('label'))
   if label!='1' or str(r.get('source')).lower()!='ai' or not isinstance(text,str):continue
   if not 40<=len(tokens(text))<=1600 or len(text)>25000 or lang_of(text)!='en':continue
   h=digest(text)
   if h in seen:continue
   seen.add(h);got.append(dict(text=text,label='ai',group='robi-'+str(item.get('row_idx',offset)),source_id='R-obi/ai-text-detection-pile-cleaned',license='MIT declared by dataset',source='ai'))
   if len(got)>=545:break
  offset+=len(batch);time.sleep(.9)
 OUT.write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in rows+got))
 p=ROOT/'admin_data/benchmark-en/completion.json';p.write_text(json.dumps(dict(additional_ai=len(got),scanned=offset,source='R-obi/ai-text-detection-pile-cleaned'),indent=2))
 print('ADDED',len(got),'SCAN',offset,flush=True)
if __name__=='__main__':main()
