"""Score external, never-trained GPT/Claude samples against experimental v3 JSON."""
import argparse,collections,json,math,sys
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.special import expit
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'python'))
from engine_v3 import normal
BENCH=ROOT/'admin_data/benchmark-chatgpt-claude'
def evaluator(path):
 model=json.loads(Path(path).read_text(encoding='utf-8'))
 layers=[]
 for feat in model['features']:
  kw={'preprocessor':normal,'ngram_range':(1,2),'token_pattern':r'(?u)\b\w+\b'} if feat['kind']=='word' else {'preprocessor':normal,'analyzer':'char','ngram_range':(3,4)}
  analyze=TfidfVectorizer(**kw).build_analyzer()
  lookup={t:(float(feat['idf'][i]),float(feat['weights'][i])) for i,t in enumerate(feat['terms'])}
  layers.append((analyze,lookup))
 def predict(text):
  linear=float(model['bias'])
  for analyze,lookup in layers:
   counts=collections.Counter(t for t in analyze(text) if t in lookup)
   square=sum((c*lookup[t][0])**2 for t,c in counts.items())
   if square:
    linear+=sum(c*lookup[t][0]*lookup[t][1] for t,c in counts.items())/math.sqrt(square)
  score=float(expit(linear))
  return score,score>=model['thresholds']['ai']
 return predict
def main():
 p=argparse.ArgumentParser();p.add_argument('--label',required=True);p.add_argument('--en-model',required=True);p.add_argument('--fa-model',required=True)
 args=p.parse_args();report={'candidate':args.label,'models':{},'note':'only source/topic-disjoint evaluation; model family is source-declared, not verified'}
 for lang,path in [('en',args.en_model),('fa',args.fa_model)]:
  pred=evaluator(path);path=BENCH/(lang+'-external-heldout.jsonl')
  data=[json.loads(x) for x in path.read_text(encoding='utf-8').splitlines() if x]
  if lang=='fa':
   ref=ROOT/'admin_data/benchmark-fa/human-test.jsonl'
   data.extend(dict(x,model='independent_human',source_id='persian-historical-holdout') for x in (json.loads(line) for line in ref.read_text().splitlines() if line))
  metrics=collections.defaultdict(lambda:collections.Counter())
  for i,row in enumerate(data):
   score,is_ai=pred(row['text']);label=row['label']
   for key in {'ALL','model:'+str(row.get('model','unknown')),'family:'+str(row.get('generator_family','unknown'))}:
    s=metrics[key];s['total']+=1
    s['ai_count' if label=='ai' else 'human_count']+=1
    if is_ai and label=='ai':s['tp']+=1
    if is_ai and label=='human':s['fp']+=1
    if not is_ai and label=='human':s['tn']+=1
    if not is_ai and label=='ai':s['fn']+=1
   if (i+1)%500==0:print('SCORE',lang,i+1,flush=True)
  result={}
  for key,c in metrics.items():
   d=dict(c)
   if c['ai_count']:d['ai_recall']=round(c['tp']/c['ai_count'],4)
   if c['human_count']:d['human_false_positive_rate']=round(c['fp']/c['human_count'],4)
   result[key]=d
  report['models'][lang]=dict(artifact=args.en_model if lang=='en' else args.fa_model,metrics=result)
  print('METRICS',lang,json.dumps(result,ensure_ascii=False),flush=True)
 BENCH.mkdir(parents=True,exist_ok=True)
 (BENCH/(args.label+'-evaluation.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
