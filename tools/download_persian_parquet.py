import urllib.request,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
dest=ROOT/'admin_data/imports/parquet';dest.mkdir(parents=True,exist_ok=True)
for label,ds in [('ai','ibnsina-llm/synthetic-persian-v1'),('human','codersan/Persian-Wikipedia-Corpus')]:
 with urllib.request.urlopen(urllib.request.Request('https://datasets-server.huggingface.co/parquet?dataset='+ds,headers={'User-Agent':'NevisSanj/1.0'}),timeout=30) as response:lst=json.load(response)['parquet_files']
 x=next(a for a in lst if a['split']=='train' and a['filename']=='0000.parquet')
 out=dest/(label+'-0000.parquet')
 if out.exists() and out.stat().st_size==x['size']:print('REUSED',label,out.stat().st_size,flush=True);continue
 print('DOWNLOADING',label,x['size'],flush=True)
 req=urllib.request.Request(x['url'],headers={'User-Agent':'NevisSanj/1.0'})
 with urllib.request.urlopen(req,timeout=100) as inp,open(str(out)+'.partial','wb') as f:
  while True:
   buf=inp.read(1048576)
   if not buf:break
   f.write(buf)
   if f.tell()%(40*1048576)<1048576:print('PROGRESS',label,f.tell(),flush=True)
 partial=Path(str(out)+'.partial')
 if partial.stat().st_size!=x['size']:raise ValueError('Incomplete parquet')
 partial.replace(out)
 print('SAVED',label,out.stat().st_size,flush=True)
