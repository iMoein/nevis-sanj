import urllib.request,urllib.parse,json,hashlib,sys,time,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(ROOT/'python'))
from ml import normalized,tokens,lang_of
SRC='codersan/Persian-Wikipedia-Corpus';DEST=ROOT/'training/approved/training-fa-human-2018.jsonl'
MANIFEST=ROOT/'admin_data/benchmark-fa/human-2018-expansion.json'
def fetch(offset):
 q=urllib.parse.urlencode(dict(dataset=SRC,config='default',split='train',offset=offset,length=100))
 for i in range(4):
  try:
   with urllib.request.urlopen(urllib.request.Request('https://datasets-server.huggingface.co/rows?'+q,headers={'User-Agent':'NevisSanjPersianTraining/1.0'}),timeout=25) as f:return json.load(f).get('rows',[])
  except Exception:
   if i==3:raise
   time.sleep(1.5*(i+1))
def main():
 current=[json.loads(x) for x in (ROOT/'admin_data/fa.jsonl').read_text().splitlines() if x]
 reserved=[json.loads(x) for fn in ['human-test.jsonl','human-val.jsonl'] for x in (ROOT/'admin_data/benchmark-fa'/fn).read_text().splitlines()]
 used={hashlib.sha256(normalized(x['text']).encode()).hexdigest() for x in current+reserved}
 result=[];offset=0;rejected=0;limit=6600
 while len(result)<limit and offset<110000:
  batch=fetch(offset)
  if not batch:break
  for item in batch:
   r=item.get('row') or {};txt=r.get('Text','')
   if r.get('Namespace')!=0 or r.get('IsDisambiguationPage') or not isinstance(txt,str):continue
   if not 60<=len(tokens(txt))<=1800 or len(txt)>25000 or lang_of(txt)!='fa':rejected+=1;continue
   if re.search(r'(?:link=|\[\[|\{\{|(?:http[s]?://))',txt):rejected+=1;continue
   h=hashlib.sha256(normalized(txt).encode()).hexdigest()
   if h in used:continue
   used.add(h)
   result.append(dict(text=txt,label='human',group='wiki2018-'+str(r.get('Id')),
     source_id=SRC,source_license='CC BY-SA 4.0',snapshot='fawiki-20181001',article_title=r.get('Title'),
     attribution_url='https://fa.wikipedia.org/?curid='+str(r.get('Id'))))
  offset+=len(batch)
  if offset%5000==0:print('scanned',offset,'accepted',len(result),flush=True)
 DEST.parent.mkdir(parents=True,exist_ok=True)
 DEST.write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in result))
 meta=dict(source=SRC,license='CC BY-SA 4.0',snapshot='2018-10-01',new_human=len(result),scanned=offset,excluded=rejected,
  warning='Encyclopedic domain; date 2018 verified from dataset description, individual revisions not verified. No claims of authorship for each individual article.')
 MANIFEST.write_text(json.dumps(meta,ensure_ascii=False,indent=2))
 print('RESULT',json.dumps(meta,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
