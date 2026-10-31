import sqlite3,time,json,hashlib,os,tempfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
paths=[root/'admin_data/fa.jsonl',root/'admin_data/en.jsonl']
work=Path(tempfile.mkdtemp(prefix='nevis-sqlite-bench-'));db=work/'pilot.db'
conn=sqlite3.connect(db);conn.execute('PRAGMA journal_mode=WAL');conn.execute('PRAGMA synchronous=NORMAL')
conn.execute('CREATE TABLE examples (id TEXT PRIMARY KEY, lang TEXT NOT NULL, label TEXT NOT NULL, group_id TEXT, source_id TEXT, text TEXT NOT NULL, metadata TEXT)')
conn.execute('CREATE INDEX ex_lang_label ON examples(lang,label)');conn.execute('CREATE INDEX ex_group ON examples(group_id)')
t=time.perf_counter();n=0
for lang,p in zip(('fa','en'),paths):
 with p.open(encoding='utf-8') as f:
  batch=[]
  for line in f:
   x=json.loads(line);txt=x['text'];h=hashlib.sha256(txt.encode()).hexdigest()
   extra={k:v for k,v in x.items() if k not in ('text','label','group','source_id')}
   batch.append((h,lang,x['label'],x.get('group'),x.get('source_id'),txt,json.dumps(extra,ensure_ascii=False)))
   if len(batch)==500:
    conn.executemany('INSERT OR IGNORE INTO examples VALUES(?,?,?,?,?,?,?)',batch);n+=len(batch);batch=[]
  if batch:conn.executemany('INSERT OR IGNORE INTO examples VALUES(?,?,?,?,?,?,?)',batch);n+=len(batch)
conn.commit();import_time=time.perf_counter()-t
t=time.perf_counter();sql_counts=conn.execute('SELECT lang,label,count(*) FROM examples GROUP BY lang,label').fetchall();sql_count_time=time.perf_counter()-t
t=time.perf_counter();rows=0
for p in paths:
 with p.open() as f:
  for line in f:
   x=json.loads(line);rows+=1
json_count_time=time.perf_counter()-t
target=conn.execute('SELECT id FROM examples LIMIT 1').fetchone()[0]
t=time.perf_counter()
for _ in range(100):doc=conn.execute('SELECT text FROM examples WHERE id=?',(target,)).fetchone()
lookup_time=(time.perf_counter()-t)/100
print(json.dumps({'records_seen':n,'records_stored':sum(x[2] for x in sql_counts),'db_size_mb':round(db.stat().st_size/1048576,2),'import_seconds':round(import_time,3),'sqlite_aggregate_ms':round(sql_count_time*1000,3),'json_scan_ms':round(json_count_time*1000,3),'indexed_lookup_ms_average':round(lookup_time*1000,4),'counts':sql_counts},ensure_ascii=False))
conn.close()
for p in work.glob('*'):p.unlink()
work.rmdir()
