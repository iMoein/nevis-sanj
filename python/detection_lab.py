"""Private experimental evaluation lab. Frozen test data never enters training."""
from __future__ import annotations
import importlib.util,json,sqlite3,hashlib,math
from collections import Counter,defaultdict
from datetime import datetime,timezone
from pathlib import Path
import numpy as np
from scipy.special import expit
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from engine_v3 import normal,measurements,digest
ROOT=Path(__file__).resolve().parent.parent
DB=ROOT/'admin_data/corpus.sqlite3'
EXP=ROOT/'admin_data/experiments/v3'
LAB=ROOT/'admin_data/detection-lab'
LANGS=('fa','en')
def utc():return datetime.now(timezone.utc).isoformat()
def connection():
 c=sqlite3.connect(str(DB),timeout=30)
 c.row_factory=sqlite3.Row
 c.execute('PRAGMA busy_timeout=30000')
 c.execute('CREATE TABLE IF NOT EXISTS lab_review (digest TEXT NOT NULL, language TEXT NOT NULL, expected TEXT NOT NULL, predicted TEXT NOT NULL, score REAL NOT NULL, source TEXT, state TEXT NOT NULL DEFAULT \'pending\', confirmed_label TEXT, note TEXT, reviewed_at TEXT, PRIMARY KEY(digest,language), FOREIGN KEY(digest) REFERENCES examples(digest))')
 c.execute('CREATE INDEX IF NOT EXISTS lab_review_language_state ON lab_review(language,state)')
 c.commit()
 return c
def source_name(group,meta):
 meta=json.loads(meta or '{}')
 source=meta.get('source_id') or meta.get('upstream_source')
 if source:return str(source)
 if group.startswith('wiki2018-'):return 'inferred:wikipedia-2018'
 if group.startswith('gemini-'):return 'inferred:gemini'
 if group.startswith('acmc-'):return 'inferred:acmc'
 if group.startswith('robi-'):return 'inferred:robi'
 if group.startswith('R-obi/'):return 'inferred:R-obi'
 return 'unknown'
def report(lang):
 path=EXP/(lang+'-report.json')
 return json.loads(path.read_text()) if path.is_file() else None
def model(lang):
 path=EXP/(lang+'.json')
 if not path.exists():raise ValueError('مدل آزمایشی نسخه ۳ پیدا نشد.')
 obj=json.loads(path.read_text())
 if obj.get('schema')!=3 or obj.get('language')!=lang:raise ValueError('ساختار مدل معتبر نیست.')
 return obj
def _vectorizer(part):
 names=part['terms']
 obj=TfidfVectorizer(preprocessor=normal,analyzer='char' if part['kind']=='char' else 'word',
    ngram_range=(3,4) if part['kind']=='char' else (1,2),token_pattern=r'(?u)\b\w+\b',
    vocabulary={term:i for i,term in enumerate(names)},dtype=np.float32)
 obj.idf_=np.array(part['idf'],dtype=np.float32)
 return obj
class Predictor:
 def __init__(self,language):
  m=model(language);self.m=m;self.features=m['features'];self.vectors=[_vectorizer(f) for f in self.features]
  self.weights=np.array([w for f in self.features for w in f['weights']],dtype=np.float64)
  self.bias=float(m['bias']);self.threshold=float(m['thresholds']['ai'])
 def scores(self,texts):
  if not texts:return np.array([])
  mat=hstack([v.transform(texts) for v in self.vectors],format='csr')
  return np.asarray(expit(np.asarray(mat.dot(self.weights)).ravel()+self.bias))
 def verdict(self,score):return 'ai' if score>=self.threshold else 'human' if score<=float(self.m['thresholds'].get('human',.35)) else 'uncertain'
def provenance_summary(lang):
 c=connection()
 try:
  # Indexed group aggregation; avoid loading all text or metadata into Python.
  sql="""SELECT COALESCE(NULLIF(json_extract(metadata,'$.source_id'),''),
             NULLIF(json_extract(metadata,'$.upstream_source'),''),
             CASE WHEN group_id LIKE 'wiki2018-%' THEN 'inferred:wikipedia-2018'
                  WHEN group_id LIKE 'gemini-%' THEN 'inferred:gemini'
                  WHEN group_id LIKE 'acmc-%' THEN 'inferred:acmc'
                  WHEN group_id LIKE 'robi-%' THEN 'inferred:robi'
                  WHEN group_id LIKE 'R-obi/%' THEN 'inferred:R-obi'
                  ELSE 'unknown' END) AS source,
             label,COUNT(*) AS n
       FROM examples WHERE language=? GROUP BY source,label"""
  counts=defaultdict(Counter)
  for source,label,n in c.execute(sql,(lang,)):counts[source][label]+=n
  sorted_counts=sorted(counts.items(),key=lambda pair:sum(pair[1].values()),reverse=True)
  unknown=sum(sum(v.values()) for k,v in counts.items() if k=='unknown' or k.startswith('inferred:'))
  return {'total':sum(sum(v.values()) for v in counts.values()),'missing_or_inferred_source':unknown,
    'sources':[{'name':k,'human':v['human'],'ai':v['ai'],'count':sum(v.values())} for k,v in sorted_counts[:14]],
    'unique_sources':len(counts)}
 finally:c.close()

def gate(lang,source=None):
 r=report(lang);source=source if source is not None else provenance_summary(lang)
 blockers=[]
 if not r:blockers.append('گزارش ارزیابی نسخه ۳ وجود ندارد.')
 else:
  t=r.get('heldout_external') or {}
  if t.get('human',0)<200 or t.get('ai',0)<200:blockers.append('آزمون مستقل با حداقل ۲۰۰ نمونه از هر کلاس لازم است.')
  if t.get('human_false_positive_rate',1)>.05:blockers.append('خطای مثبت انسان از حد ۵٪ بیشتر است.')
  if t.get('ai_recall',0)<.8:blockers.append('Recall متن AI به ۸۰٪ نرسیده است.')
 if source['missing_or_inferred_source']:
  blockers.append('منشأ بخشی از داده‌ها ناقص یا استنباطی است؛ جداسازی منابع تأیید نشده.')
 source_trial=LAB/(lang+'-cross-source.json')
 if source_trial.exists():
  trial=json.loads(source_trial.read_text())
  result=trial.get('unseen_test',{})
  if result.get('human_false_positive_rate',1)>.05:blockers.append('خطای مثبت روی منبع تازه به حد مجاز نرسیده است.')
  if result.get('ai_recall',0)<.8:blockers.append('Recall روی منبع تازه کمتر از ۸۰٪ است.')
  blockers.append('استقلال کامل مجموعه‌های بالادستی هنوز ممیزی نشده است.')
 else:blockers.append('آزمون مستقل منابع و مدل‌های تولیدکننده دیده‌نشده هنوز ثبت نشده است.')
 blockers.append('سازگاری و برابری پیش‌بینی Python و مرورگر برای Schema 3 تأیید نشده است.')
 return {'eligible':not blockers,'blockers':blockers,'test':r.get('heldout_external') if r else None,'model':r.get('winner') if r else None}
def overview():
 result={}
 for lang in LANGS:
  r=report(lang);provenance=provenance_summary(lang);cross_source=LAB/(lang+'-cross-source.json')
  result[lang]={'gate':gate(lang,provenance),'provenance':provenance,
    'cross_source':json.loads(cross_source.read_text()) if cross_source.exists() else None,
    'comparison':r.get('validation_comparison',[]) if r else [],
    'internal_test':r.get('test_frozen') if r else None}
 c=connection()
 try:
  for lang in LANGS:
   result[lang]['queue']=dict(Counter(row[0] for row in c.execute('SELECT state FROM lab_review WHERE language=?',(lang,))))
 finally:c.close()
 return {'languages':result,'transformer_available':bool(importlib.util.find_spec('torch') and importlib.util.find_spec('transformers')),
    'transformer_note':'آزمایش Transformer نیازمند مدل مجاز، منابع محاسباتی و آزمون مستقل است؛ بدون دانلود خودکار.',
    'policy':'هیچ ارزیابی یا تأیید نمونه‌ای به‌طور خودکار باعث آموزش یا انتشار مدل نمی‌شود.'}
def frozen_rows(lang):
 p=ROOT/'admin_data'/('benchmark-en' if lang=='en' else 'benchmark-fa')/('heldout-test-en.jsonl' if lang=='en' else 'human-test.jsonl')
 if not p.exists():return []
 return [json.loads(x) for x in p.read_text(encoding='utf-8').split('\n') if x.strip()]
def wilson(success,total,z=1.96):
 if total<=0:return None
 p=success/total;z2=z*z;denom=1+z2/total
 center=(p+z2/(2*total))/denom
 margin=z*math.sqrt((p*(1-p)+z2/(4*total))/total)/denom
 return [round(max(0,center-margin),4),round(min(1,center+margin),4)]

def suite(lang):
 if lang not in LANGS:raise ValueError('زبان نامعتبر است.')
 rows=frozen_rows(lang)
 if not rows:raise ValueError('آزمون قفل‌شده‌ای برای این زبان وجود ندارد.')
 c=connection()
 try:
  # Frozen IDs must not be trained on; this count is an explicit leakage diagnostic.
  overlaps=sum(c.execute('SELECT COUNT(*) FROM examples WHERE digest=?',(digest(x['text']),)).fetchone()[0] for x in rows)
 finally:c.close()
 predictor=Predictor(lang);labels=np.array([int(x['label']=='ai') for x in rows]);scores=predictor.scores([x['text'] for x in rows]);threshold=predictor.threshold
 lengths=[len(x['text'].split()) for x in rows]
 slices={'all':list(range(len(rows))),'short':[],'medium':[],'long':[]}
 for i,n in enumerate(lengths):slices['short' if n<150 else 'medium' if n<400 else 'long'].append(i)
 domains=defaultdict(list)
 for i,row in enumerate(rows):
  name=str(row.get('domain') or 'unknown')
  domains[name].append(i)
 output={}
 for key,ids in slices.items():
  if not ids:continue
  y=labels[ids];score=scores[ids]
  output[key]=measurements(y,score,threshold)
  # Do not report recall or balanced accuracy for missing classes.
  if not np.any(y==1):output[key]['ai_recall']=None;output[key]['balanced_accuracy']=None
  if not np.any(y==0):output[key]['human_false_positive_rate']=None;output[key]['balanced_accuracy']=None
  output[key]['human_fpr_95ci']=wilson(output[key]['fp'],output[key]['human'])
  output[key]['ai_recall_95ci']=wilson(output[key]['tp'],output[key]['ai'])
 domain_results={}
 for name,indices in sorted(domains.items(),key=lambda item:-len(item[1])):
  if len(domain_results)>=8:break
  y=labels[indices]
  if min(int(np.sum(y==0)),int(np.sum(y==1)))<20:continue
  domain_results[name]=measurements(y,scores[indices],threshold)
 result={'language':lang,'created_at':utc(),'origin':'FROZEN_HOLDOUT_DIAGNOSTIC_ONLY',
  'source_overlap_warning':True,'exact_training_overlap_count':overlaps,'length_slices':output,'domain_slices':domain_results,
  'uncalibrated_brier_diagnostic':round(float(np.mean((scores-labels)**2)),5),
  'suites':{'cross_model':{'state':'needs_data','reason':'مدل تولیدکننده برای نمونه‌های آزمون مستقل کامل ثبت نشده.'},
    'cross_source':{'state':'needs_data','reason':'مجموعه آزمون منبع‌کاملاً‌جدید با منشأ تأییدشده لازم است.'},
    'matched_topic':{'state':'needs_data','reason':'جفت‌های انسانی و ماشینی هم‌موضوع معتبر لازم است.'},
    'paraphrase':{'state':'needs_data','reason':'متن اصلی، بازنویسی و شناسه parent باید ثبت شود.'},
    'hybrid':{'state':'needs_data','reason':'نمونه‌های ترکیبی با سهم مشارکت انسان و AI لازم است.'},
    'length':{'state':'measured','result':output}},
  'gate':gate(lang),'note':'آزمون قفل‌شده فقط برای سنجش؛ نباید برای تنظیم ابرپارامترها یا ورود نمونه به آموزش استفاده شود.'}
 LAB.mkdir(parents=True,exist_ok=True);(LAB/(lang+'-suite.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2))
 return result
def enqueue(lang,max_items=30):
    """Find high-value labelled CORPUS audit cases, not heldout rows or pseudo-labels."""
    if lang not in LANGS:raise ValueError('زبان نامعتبر است.')
    max_items=max(1,min(int(max_items),60));c=connection()
    try:
        samples=[]
        for label in ('ai','human'):
            samples.extend(list(c.execute('SELECT digest,text,label,group_id,metadata FROM examples WHERE language=? AND label=? ORDER BY rowid DESC LIMIT 180',(lang,label))))
        if not samples:return {'queued':0,'reason':'داده‌ای وجود ندارد.'}
        predictor=Predictor(lang);scores=predictor.scores([r['text'] for r in samples]);candidates=[]
        for row,score in zip(samples,scores):
            predicted=predictor.verdict(float(score))
            if predicted==row['label']:continue
            candidates.append((0 if predicted!='uncertain' else 1,abs(float(score)-predictor.threshold),row,score,predicted))
        candidates.sort(key=lambda x:(x[0],x[1],x[2]['digest']))
        added=0
        with c:
            for _,_,row,score,predicted in candidates[:max_items]:
                cur=c.execute('INSERT OR IGNORE INTO lab_review(digest,language,expected,predicted,score,source) VALUES(?,?,?,?,?,?)',
                     (row['digest'],lang,row['label'],predicted,float(score),source_name(row['group_id'],row['metadata'])))
                added+=cur.rowcount
        return {'queued':added,'evaluated':len(samples),'candidates':len(candidates),
                'note':'نمونه‌های منتخب از بانک آموزش/بازبینی‌اند، نه مجموعه آزمون ثابت. نتیجه مدل برچسب صحیح تلقی نمی‌شود.'}
    finally:c.close()
def queue(lang,limit=30):
    if lang not in LANGS:raise ValueError('زبان نامعتبر است.')
    c=connection()
    try:
        rows=c.execute('SELECT r.digest,r.expected,r.predicted,r.score,r.source,r.state,r.confirmed_label,r.note,substr(e.text,1,600) AS snippet FROM lab_review r JOIN examples e ON e.digest=r.digest WHERE r.language=? ORDER BY CASE WHEN r.state=\'pending\' THEN 0 ELSE 1 END,r.score DESC LIMIT ?', (lang,max(1,min(int(limit),50)))).fetchall()
        return [dict(row) for row in rows]
    finally:c.close()
def review(lang,key,decision,confirmed_label=None,note=''):
    if lang not in LANGS or decision not in ('verified','needs_review','rejected'):
        raise ValueError('درخواست بازبینی نامعتبر است.')
    if confirmed_label not in ('human','ai',None):raise ValueError('برچسب معتبر نیست.')
    if len(note.strip())<12:raise ValueError('برای بازبینی توضیح مستند حداقل ۱۲ نویسه وارد کنید.')
    c=connection()
    try:
        with c:
            cur=c.execute('UPDATE lab_review SET state=?,confirmed_label=?,note=?,reviewed_at=? WHERE digest=? AND language=? AND state IN (\'pending\',\'needs_review\')',
             (decision,confirmed_label,note.strip()[:2000],utc(),key,lang))
        if not cur.rowcount:raise ValueError('نمونه باز یا قابل‌تغییر نیست.')
        return {'reviewed':True,'training_updated':False,'published':False,
          'note':'بازبینی ثبت شد؛ تغییر برچسب در بانک اصلی و آموزش مجدد نیازمند فرایند مستقل با تأیید منشأ است.'}
    finally:c.close()
