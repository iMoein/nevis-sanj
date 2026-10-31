"""Provenance-labelled GPT/Claude corpus import; never publish models automatically."""
import argparse,collections,hashlib,json,sqlite3,sys,time,urllib.parse,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'python'))
from corpus_store import digest,import_jsonl
from ml import lang_of
EN="artnitolog/llm-generated-texts"
CLAUDE_FA="shahryars/vazirweb-persian-social-media-content"
GPT_FA="https://raw.githubusercontent.com/asrinvakili/persian-ai-text-corpus/main/data/full/ai_texts.jsonl"
OUT=ROOT/'training/research/chatgpt-claude';BENCH=ROOT/'admin_data/benchmark-chatgpt-claude'
def get(url):
 for i in range(4):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"NevisSanj-research/1.0"}),timeout=40) as f:return json.load(f)
  except Exception:
   if i==3:raise
   time.sleep(2**i)
def pages(ds,total):
 for off in range(0,total,100):
  q=urllib.parse.urlencode(dict(dataset=ds,config='default',split='train',offset=off,length=min(100,total-off)))
  items=get('https://datasets-server.huggingface.co/rows?'+q).get('rows',[])
  if not items:break
  for item in items:yield item['row']
  print('FETCH',ds,off+len(items),flush=True)
  time.sleep(.1)
def good(t,lang):
 return isinstance(t,str) and 180<=len(t)<=24000 and len(t.split())>=18 and lang_of(t)==lang
def row(t,lang,model,family,ds,group,license,**meta):
 return dict(text=t.strip(),label='ai',language=lang,model=model,generator_family=family,
             source_id=ds,group=group,source_license=license,provenance='dataset_author_reported',**meta)
def english():
 output=[]
 for r in pages(EN,3000):
  group='arnitolog:'+str(r.get('dataset_name'))+':'+str(r.get('id'));domain=r.get('dataset_name')
  if good(r.get('human'),'en'):
   output.append(dict(text=r['human'].strip(),label='human',language='en',model='human',
                      generator_family='human',source_id=EN,group=group,source_license='unspecified; research only',domain=domain))
  for field,model,family in [('GPT4 Turbo 2024-04-09','gpt-4-turbo-2024-04-09','ChatGPT'),
                              ('GPT4 Omni','gpt-4o','ChatGPT'),('Claude 3 Opus','claude-3-opus','Claude')]:
   if good(r.get(field),'en'):
    output.append(row(r[field],'en',model,family,EN,group,'unspecified; research only',domain=domain))
 return output
def persian_gpt():
 output=[]
 with urllib.request.urlopen(urllib.request.Request(GPT_FA,headers={'User-Agent':'NevisSanj-research/1.0'}),timeout=60) as f:
  for line in f:
   r=json.loads(line);t=r.get('text')
   if str(r.get('model','')).startswith('gpt-') and good(t,'fa'):
    output.append(row(t,'fa',r['model'],'ChatGPT','asrinvakili/persian-ai-text-corpus',
                      'vakili:'+str(r.get('human_id') or r.get('id')),'AI data: provider terms, research only',domain=r.get('category')))
 return output
def persian_claude():
 output=[]
 for r in pages(CLAUDE_FA,550):
  try:
   content=next(x['content'] for x in r['messages'] if x.get('role')=='assistant')
   t=json.loads(content).get('output')
  except (KeyError,StopIteration,TypeError,ValueError):continue
  if good(t,'fa'):
   output.append(row(t,'fa','claude-sonnet-4.x-unverified','Claude',CLAUDE_FA,
               'vazirweb:'+str(r['id']),'CC BY 4.0',domain=r.get('category'),style=r.get('tone')))
 return output
def write(path,rows):
 path.parent.mkdir(parents=True,exist_ok=True)
 with path.open('w',encoding='utf-8') as f:
  for item in rows:f.write(json.dumps(item,ensure_ascii=False)+'\n')
def legacy_holdout_digests(lang):
 root=ROOT/'admin_data'
 paths=[root/'benchmark-en/heldout-test-en.jsonl'] if lang=='en' else [root/'benchmark-fa/human-test.jsonl',root/'benchmark-fa/human-val.jsonl']
 excluded=set()
 for path in paths:
  if not path.exists():continue
  for line in path.read_text(encoding='utf-8').splitlines():
   if line.strip():
    obj=json.loads(line)
    if isinstance(obj.get('text'),str):excluded.add(digest(obj['text']))
 return excluded

def execute(import_corpus):
 raw={'en':english(),'fa':persian_gpt()+persian_claude()}
 manifest={'purpose':'experimental-only; do not publish','generator_identity':'third-party attributed, not independently verified',
           'split':'20 percent deterministic topic-group holdout','sources':[
             {'source':EN,'license':'unspecified, research-only'},
             {'source':'asrinvakili/persian-ai-text-corpus','license':'provider terms, research-only'},
             {'source':CLAUDE_FA,'license':'CC BY 4.0; dataset model version inconsistent'}],'counts':{}}
 for lang,all_rows in raw.items():
  train=[];test=[];seen=set();reserved=legacy_holdout_digests(lang)
  for r in all_rows:
   d=digest(r['text'])
   if d in reserved or d in seen:continue
   seen.add(d);group=r['group']
   bucket=int.from_bytes(hashlib.sha256(('external-holdout-v1|'+group).encode()).digest()[:4],'big')%100
   (test if bucket<20 else train).append(r)
  assert not ({r['group'] for r in train}&{r['group'] for r in test})
  # A different source may already contain the same test text; drop its whole topic group.
  with sqlite3.connect(str(ROOT/'admin_data/corpus.sqlite3')) as db:
   contaminated={r['group'] for r in test if db.execute('SELECT 1 FROM examples WHERE digest=?',(digest(r['text']),)).fetchone()}
  test=[r for r in test if r['group'] not in contaminated]
  write(OUT/(lang+'-train.jsonl'),train);write(BENCH/(lang+'-external-heldout.jsonl'),test)
  stats={'train':len(train),'heldout':len(test),
         'train_models':dict(collections.Counter(r['model'] for r in train)),
         'heldout_models':dict(collections.Counter(r['model'] for r in test))}
  if import_corpus:stats['imported_to_sqlite']=import_jsonl(lang,OUT/(lang+'-train.jsonl'))
  manifest['counts'][lang]=stats;print('RESULT',lang,json.dumps(stats,ensure_ascii=False),flush=True)
 (BENCH/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--import-corpus',action='store_true');args=p.parse_args()
 execute(args.import_corpus)
