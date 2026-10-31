"""Source-disjoint probe, results are never eligible for direct publication."""
import json,sqlite3,hashlib,time,math
from collections import Counter
from pathlib import Path
import numpy as np
from scipy.sparse import hstack
from scipy.special import expit
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from engine_v3 import normal,measurements,cutoff,ROOT
from detection_lab import source_name,LAB

def source_samples(language,source,per_label):
 db=sqlite3.connect(str(ROOT/'admin_data/corpus.sqlite3'));found={'ai':[],'human':[]}
 try:
  for text,label,group,metadata in db.execute('SELECT text,label,group_id,metadata FROM examples WHERE language=?',(language,)):
   if label not in found or len(text)<180 or source_name(group,metadata)!=source:continue
   found[label].append((text,label,group))
 finally:db.close()
 selected=[]
 for label,rows in found.items():
  rows.sort(key=lambda r:hashlib.sha256(('cross-source:'+r[2]).encode()).digest())
  selected.extend(rows[:per_label])
 return selected

def benchmark_en():
 t=time.monotonic()
 train_source='acmc/multi_domain_ai_human_text'
 holdout_source='jist2009/human_ai_generated_text'
 samples=source_samples('en',train_source,2000)
 blind=source_samples('en',holdout_source,450)
 if len(samples)<1500 or len(blind)<500:raise ValueError('Insufficient class-balanced source-disjoint samples')
 # Group-preserving validation; all blind rows from an unseen aggregate source.
 fit=[];val=[]
 for row in samples:
  key=int.from_bytes(hashlib.sha256(('sourceval|'+row[2]).encode()).digest()[:8],'big')%100
  (fit if key<80 else val).append(row)
 if min(Counter(x[1] for x in val).values())<25:raise ValueError('Insufficient validation rows')
 word=TfidfVectorizer(preprocessor=normal,token_pattern=r'(?u)\b\w+\b',ngram_range=(1,2),min_df=2,max_features=6000,dtype=np.float32)
 char=TfidfVectorizer(preprocessor=normal,analyzer='char',ngram_range=(3,4),min_df=3,max_features=4500,dtype=np.float32)
 word.fit([r[0] for r in fit]);char.fit([r[0] for r in fit])
 def features(rows):
  texts=[r[0] for r in rows]
  return hstack([word.transform(texts),char.transform(texts)],format='csr',dtype=np.float32)
 X,Y,Z=features(fit),features(val),features(blind)
 y_fit=np.array([int(r[1]=='ai') for r in fit]);y_val=np.array([int(r[1]=='ai') for r in val]);y_blind=np.array([int(r[1]=='ai') for r in blind])
 candidates=[]
 for name,clf in [('logistic',LogisticRegression(solver='liblinear',class_weight='balanced',max_iter=150,random_state=42)),
                  ('linear_svm',LinearSVC(C=.5,class_weight='balanced',random_state=42,max_iter=2000))]:
  clf.fit(X,y_fit)
  score=clf.predict_proba(Y)[:,1] if name=='logistic' else expit(clf.decision_function(Y))
  gate=cutoff(y_val,score,.05)
  validation=measurements(y_val,score,gate)
  candidates.append((validation['ai_recall'],validation['balanced_accuracy'],name,clf,gate,validation))
 winner=max(candidates,key=lambda r:(r[0],r[1],r[2]))
 _,_,name,model,gate,validation=winner
 scores=model.predict_proba(Z)[:,1] if name=='logistic' else expit(model.decision_function(Z))
 result={'language':'en','experiment':'source-disjoint','state':'complete','trained_source':train_source,'unseen_test_source':holdout_source,
  'selected_algorithm':name,'validation':validation,'unseen_test':measurements(y_blind,scores,gate),
  'class_counts':{'fit':dict(Counter(r[1] for r in fit)),'validation':dict(Counter(r[1] for r in val)),'blind':dict(Counter(r[1] for r in blind))},
  'threshold':round(float(gate),6),'duration_seconds':round(time.monotonic()-t,2),
  'warning':'Different aggregate dataset is a proxy for source independence. Upstream text/model overlap and source effects are not fully audited. Not for automatic publication.'}
 LAB.mkdir(exist_ok=True,parents=True);(LAB/'en-cross-source.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
 print(json.dumps(result,ensure_ascii=False,indent=2),flush=True)
 return result
if __name__=='__main__':benchmark_en()
