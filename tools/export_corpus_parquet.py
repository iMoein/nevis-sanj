"""Export a bounded SQLite cursor to Parquet for batch analytics/training."""
import json,sys
from pathlib import Path
import pyarrow as pa
import pyarrow.parquet as pq
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'python'))
import corpus_store as store
OUT=ROOT/'admin_data/exports'
def export(lang):
 OUT.mkdir(parents=True,exist_ok=True)
 path=OUT/('training-'+lang+'.parquet')
 tmp=path.with_suffix('.parquet.writing')
 conn=store.connect();writer=None;n=0
 try:
  cur=conn.execute('SELECT digest,label,group_id,text,metadata FROM examples WHERE language=? ORDER BY rowid',(lang,))
  while True:
   rows=cur.fetchmany(500)
   if not rows:break
   table=pa.Table.from_pylist([dict(digest=h,label=l,group=g,text=t,metadata=m,language=lang) for h,l,g,t,m in rows])
   if writer is None:writer=pq.ParquetWriter(str(tmp),table.schema,compression='zstd')
   writer.write_table(table);n+=len(rows)
 finally:
  if writer:writer.close()
  conn.close()
 if n:tmp.replace(path)
 print(lang,{'rows':n,'bytes':path.stat().st_size},flush=True)
if __name__=='__main__':
 for lang in ('fa','en'):export(lang)
