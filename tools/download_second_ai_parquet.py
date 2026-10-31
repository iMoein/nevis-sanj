import urllib.request,json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
dest=root/'admin_data/imports/parquet';dest.mkdir(parents=True,exist_ok=True)
ds='ibnsina-llm/synthetic-persian-v1'
with urllib.request.urlopen(urllib.request.Request('https://datasets-server.huggingface.co/parquet?dataset='+ds,headers={'User-Agent':'NevisSanj/1.0'}),timeout=20) as f:files=json.load(f)['parquet_files']
file=next(a for a in files if a['filename']=='0001.parquet' and a['split']=='train')
out=dest/'ai-0001.parquet'
if out.exists() and out.stat().st_size==file['size']:print('REUSED',out.stat().st_size);quit()
print('DOWNLOADING',file['size'],flush=True)
req=urllib.request.Request(file['url'],headers={'User-Agent':'NevisSanj/1.0'})
with urllib.request.urlopen(req,timeout=150) as f,open(str(out)+'.partial','wb') as w:
 while True:
  chunk=f.read(1024*1024)
  if not chunk:break
  w.write(chunk)
  if w.tell()%(25*1024*1024)<1024*1024:print('PROGRESS',w.tell(),flush=True)
p=Path(str(out)+'.partial')
if p.stat().st_size!=file['size']:raise ValueError('Incomplete parquet')
p.replace(out)
print('SAVED',out.stat().st_size,flush=True)
