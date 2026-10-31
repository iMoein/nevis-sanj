import sys,json,hashlib,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'python'))
from ml import prediction
BENCH=ROOT/'admin_data/benchmark-en';samples=[json.loads(x) for x in (BENCH/'heldout-test-en.jsonl').read_text().split('\n') if x]
results={}
for name,path in [('published',ROOT/'models/published/en.json'),('candidate',ROOT/'admin_data/candidates/en.json')]:
 model=json.loads(path.read_text())
 stats=collections.Counter()
 for row in samples:
  score=prediction(model,row['text']);truth=row['label'];pred='ai' if score>=.5 else 'human'
  stats['total']+=1;stats[truth]+=1;stats['correct']+=(pred==truth);stats['false_positive']+=(truth=='human' and pred=='ai');stats['false_negative']+=(truth=='ai' and pred=='human')
 results[name]=dict(stats,accuracy=round(stats['correct']/stats['total'],4),human_false_positive_rate=round(stats['false_positive']/max(1,stats['human']),4),ai_recall=round(1-stats['false_negative']/max(1,stats['ai']),4),model_sha256=hashlib.sha256(path.read_bytes()).hexdigest()[:16])
 print(name,results[name],flush=True)
(BENCH/'training-comparison.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
