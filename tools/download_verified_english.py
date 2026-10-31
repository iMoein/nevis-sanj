from pathlib import Path
import urllib.request,json
ROOT=Path(__file__).resolve().parent.parent
base=ROOT/'admin_data/imports/parquet';base.mkdir(parents=True,exist_ok=True)
src='acmc/multi_domain_ai_human_text'
with urllib.request.urlopen(urllib.request.Request('https://datasets-server.huggingface.co/parquet?dataset='+src,headers={'User-Agent':'NevisSanj/1.0'}),timeout=20) as f:files=json.load(f)['parquet_files']
for label in ('small_train','test'):
 item=next(x for x in files if x['split']==label)
 dest=base/('en-acmc-'+label+'.parquet')
 if dest.exists() and dest.stat().st_size==item['size']:print('CACHED',label,flush=True);continue
 print('DOWNLOADING',label,item['size'],flush=True)
 with urllib.request.urlopen(urllib.request.Request(item['url'],headers={'User-Agent':'NevisSanj/1.0'}),timeout=90) as f,open(str(dest)+'.writing','wb') as out:
  while True:
   b=f.read(1024*1024)
   if not b:break
   out.write(b)
 p=Path(str(dest)+'.writing')
 if p.stat().st_size!=item['size']:raise ValueError('Incomplete '+label)
 p.replace(dest)
 print('SAVED',label,dest.stat().st_size,flush=True)
