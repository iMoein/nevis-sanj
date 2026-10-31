import sqlite3,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;DB=ROOT/'admin_data/corpus.sqlite3'
def connect():
 DB.parent.mkdir(parents=True,exist_ok=True);c=sqlite3.connect(str(DB),timeout=30)
 c.execute('PRAGMA journal_mode=WAL');c.execute('PRAGMA busy_timeout=30000')
 c.execute("CREATE TABLE IF NOT EXISTS examples (digest TEXT PRIMARY KEY,language TEXT NOT NULL,label TEXT NOT NULL,group_id TEXT NOT NULL,text TEXT NOT NULL,metadata TEXT NOT NULL)")
 c.execute("CREATE INDEX IF NOT EXISTS by_class ON examples(language,label)")
 c.execute("CREATE INDEX IF NOT EXISTS by_group ON examples(language,group_id)")
 c.execute("CREATE TABLE IF NOT EXISTS revisions (id TEXT PRIMARY KEY,parent_digest TEXT REFERENCES examples(digest),text TEXT NOT NULL,transform TEXT NOT NULL,generator TEXT,created_at TEXT,metadata TEXT)")
 return c
def digest(text):
 from ml import normalized
 return hashlib.sha256(normalized(text).encode('utf-8')).hexdigest()
def insert_rows(c,lang,rows):
 batch=[];added=0
 for r in rows:
  if r.get('label') not in ('human','ai') or not isinstance(r.get('text'),str):continue
  h=digest(r['text']);meta={k:v for k,v in r.items() if k not in ('text','label','group','language')}
  batch.append((h,lang,r['label'],str(r.get('group') or h),r['text'],json.dumps(meta,ensure_ascii=False)))
  if len(batch)==250:
   before=c.total_changes;c.executemany('INSERT OR IGNORE INTO examples VALUES (?,?,?,?,?,?)',batch);added+=c.total_changes-before;batch=[]
 if batch:
  before=c.total_changes;c.executemany('INSERT OR IGNORE INTO examples VALUES (?,?,?,?,?,?)',batch);added+=c.total_changes-before
 return added
def import_jsonl(lang,path):
 c=connect()
 try:
  with c:
   with Path(path).open(encoding='utf-8-sig') as f:return insert_rows(c,lang,(json.loads(s) for s in f if s.strip()))
 finally:c.close()
def stats():
 if not DB.exists():return None
 c=connect()
 try:
  return {lang:{'counts':{k:v for k,v in c.execute('SELECT label,COUNT(*) FROM examples WHERE language=? GROUP BY label',(lang,))},'groups':c.execute('SELECT COUNT(DISTINCT group_id) FROM examples WHERE language=?',(lang,)).fetchone()[0]} for lang in ('fa','en')}
 finally:c.close()
def rows(lang):
 c=connect()
 try:
  for label,group,text in c.execute('SELECT label,group_id,text FROM examples WHERE language=? ORDER BY rowid',(lang,)):
   yield {'label':label,'group':group,'text':text,'language':lang}
 finally:c.close()
