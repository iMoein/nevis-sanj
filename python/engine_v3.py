"""Experimental NevisSanj v3: sparse text features, grouped evaluation, no auto-publish."""
from __future__ import annotations
import argparse,hashlib,json,math,random,sqlite3,unicodedata
from collections import Counter
from pathlib import Path
import numpy as np
from scipy.sparse import hstack
from scipy.special import expit
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.metrics import roc_auc_score
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'admin_data'/'experiments'/'v3'
def normal(text):
    return ' '.join(unicodedata.normalize('NFKC',text).lower().replace('ي','ی').replace('ى','ی').replace('ك','ک').split())
def digest(t):return hashlib.sha256(normal(t).encode()).hexdigest()
def read_corpus(lang,limit):
    con=sqlite3.connect(str(ROOT/'admin_data'/'corpus.sqlite3'))
    rows=con.execute('SELECT text,label,group_id FROM examples WHERE language=?',(lang,)).fetchall();con.close()
    from corpus_store import holdout_digests, digest as corpus_digest
    reserved=holdout_digests(lang)
    by_label={'human':[],'ai':[]}
    for text,label,group in rows:
        if label not in by_label or len(text)<180 or corpus_digest(text) in reserved:continue
        by_label[label].append((text,label,group))
    selected=[]
    for label,items in by_label.items():
        items.sort(key=lambda r:hashlib.sha256(('v3-reservoir-'+str(r[2])).encode()).digest())
        selected.extend(items[:limit])
    return selected,dict((k,len(v)) for k,v in by_label.items())
def split(rows,lang):
    parts={'train':[],'validation':[],'test':[]}
    for row in rows:
        key=int.from_bytes(hashlib.sha256(('split-v3|'+lang+'|'+row[2]).encode()).digest()[:8],'big')%100
        name='train' if key<70 else 'validation' if key<85 else 'test'
        parts[name].append(row)
    for name,items in parts.items():
        counts=Counter(r[1] for r in items)
        if min(counts.get('ai',0),counts.get('human',0))<20:raise ValueError('Insufficient '+name+' examples '+str(counts))
    return parts
def make_features(train,validation,test):
    word=TfidfVectorizer(preprocessor=normal,token_pattern=r'(?u)\b\w+\b',ngram_range=(1,2),min_df=2,max_features=7000,sublinear_tf=False,dtype=np.float32)
    char=TfidfVectorizer(preprocessor=normal,analyzer='char',ngram_range=(3,4),min_df=3,max_features=5000,sublinear_tf=False,dtype=np.float32)
    words=[r[0] for r in train]
    word.fit(words);char.fit(words)
    def transform(rows):
        texts=[r[0] for r in rows]
        return hstack((word.transform(texts),char.transform(texts)),format='csr',dtype=np.float32)
    return (word,char),(transform(train),transform(validation),transform(test))
def measurements(y,s,t=0.5):
    y=np.asarray(y,dtype=np.int32);s=np.asarray(s,dtype=float);pred=s>=t
    tp=int(np.sum(pred & (y==1)));tn=int(np.sum(~pred & (y==0)))
    fp=int(np.sum(pred & (y==0)));fn=int(np.sum(~pred & (y==1)))
    return {'n':len(y),'ai':int(sum(y)),'human':int(len(y)-sum(y)),'tp':tp,'tn':tn,'fp':fp,'fn':fn,
            'balanced_accuracy':round(((tp/max(1,tp+fn))+(tn/max(1,tn+fp)))/2,4),
            'human_false_positive_rate':round(fp/max(1,tn+fp),4),'ai_recall':round(tp/max(1,tp+fn),4),
            'auc':round(float(roc_auc_score(y,s)),4) if len(set(y))==2 else None}
def cutoff(y,s,target_fpr=0.05):
    humans=np.sort(np.asarray(s)[np.asarray(y)==0]);allowed=math.floor(len(humans)*target_fpr)
    if len(humans)<20:raise ValueError('At least 20 human validation examples required')
    idx=max(0,len(humans)-allowed-1)
    return min(1.0,max(0.0,float(np.nextafter(humans[idx],1.0))))
def vectors_to_json(word,char,coef):
    result=[];base=0
    for kind,v in [('word',word),('char',char)]:
        names=v.get_feature_names_out();ids=[float(x) for x in v.idf_]
        result.append({'kind':kind,'terms':[str(x) for x in names],'idf':ids,
                       'weights':[round(float(x),8) for x in coef[base:base+len(names)]]})
        base+=len(names)
    return result
def external_rows(lang,train_digests,limit=600):
    path=(ROOT/'admin_data'/'benchmark-en'/'heldout-test-en.jsonl') if lang=='en' else (ROOT/'admin_data'/'benchmark-fa'/'human-test.jsonl')
    if not path.exists():return [],{'available':False}
    saved=[];overlaps=0
    for line in path.open(encoding='utf-8'):
        if not line.strip():continue
        r=json.loads(line);label=r.get('label');text=r.get('text','')
        if label not in ('ai','human') or not isinstance(text,str):continue
        if digest(text) in train_digests:overlaps+=1;continue
        saved.append((text,label,str(r.get('group','external'))))
    human=sorted((r for r in saved if r[1]=='human'),key=lambda r:digest(r[0]))[:limit//2]
    ai=sorted((r for r in saved if r[1]=='ai'),key=lambda r:digest(r[0]))[:limit//2]
    return human+ai,{'available':True,'file':str(path.relative_to(ROOT)),'exact_overlaps_removed':overlaps,
                     'warning':'Held-out file; upstream source/domain overlap may remain; not an independent cross-generator benchmark.'}
def evaluate_external(lang,predict,items,threshold):
    if not items:return None
    y=[int(r[1]=='ai') for r in items];s=predict([r[0] for r in items])
    return measurements(y,s,threshold)
def run(lang,limit):
    import time
    started=time.monotonic();rows,available=read_corpus(lang,limit);parts=split(rows,lang)
    print(lang,'selected',len(rows),'source',available,'splits',{x:len(v) for x,v in parts.items()},flush=True)
    (word,char),(X,Y,Z)=make_features(parts['train'],parts['validation'],parts['test'])
    train=np.array([int(r[1]=='ai') for r in parts['train']]);dev=np.array([int(r[1]=='ai') for r in parts['validation']]);test=np.array([int(r[1]=='ai') for r in parts['test']])
    # Keep model calibration and threshold selection on different grouped subsets.
    cal_idx=[];select_idx=[]
    for i,row in enumerate(parts['validation']):
        h=int.from_bytes(hashlib.sha256(('calibration|'+row[2]).encode()).digest()[:8],'big')%100
        (cal_idx if h<50 else select_idx).append(i)
    cal_y=dev[cal_idx];select_y=dev[select_idx]
    if min(Counter(cal_y).values())<20 or min(Counter(select_y).values())<20:
        raise ValueError('Insufficient grouped calibration or threshold examples')
    models=[('logistic',LogisticRegression(C=1.0,max_iter=150,solver='liblinear',class_weight='balanced',random_state=42)),
            ('linear_svm',LinearSVC(C=.5,class_weight='balanced',random_state=42,max_iter=2000))]
    comparisons=[];choices=[]
    for name,clf in models:
        clf.fit(X,train)
        raw_cal=np.asarray(clf.decision_function(Y[cal_idx])).reshape(-1,1)
        calibrator=LogisticRegression(solver='lbfgs',max_iter=400,random_state=42).fit(raw_cal,cal_y)
        alpha=float(calibrator.coef_[0,0]);beta=float(calibrator.intercept_[0])
        raw_select=np.asarray(clf.decision_function(Y[select_idx]))
        validation_scores=expit(alpha*raw_select+beta)
        gate=cutoff(select_y,validation_scores)
        m=measurements(select_y,validation_scores,gate);m['threshold_ai']=round(float(gate),6)
        comparisons.append({'algorithm':name,'validation':m,'calibration_count':len(cal_idx),'threshold_count':len(select_idx)})
        choices.append((m['ai_recall'],m['balanced_accuracy'],name,clf,gate,alpha,beta))
        print(lang,name,'validation',m,'calibration_n',len(cal_idx),flush=True)
    _,_,name,winner,threshold,alpha,beta=max(choices,key=lambda z:(z[0],z[1],z[2]))
    test_scores=expit(alpha*np.asarray(winner.decision_function(Z))+beta)
    evaluated=measurements(test,test_scores,threshold)
    print(lang,'winner',name,'untouched test',evaluated,flush=True)
    # Fold Platt calibration coefficients into the portable linear+sigmoid artifact.
    weights=winner.coef_[0]*alpha;bias=float(winner.intercept_[0])*alpha+beta
    safe_digest={digest(r[0]) for group in parts.values() for r in group}
    external,provenance=external_rows(lang,safe_digest)
    def score_texts(texts):
        mat=hstack((word.transform(texts),char.transform(texts)),format='csr')
        return expit(mat.dot(weights)+bias)
    external_metrics=evaluate_external(lang,score_texts,external,threshold)
    print(lang,'heldout',external_metrics,flush=True)
    # Auditable model-level feature importance, not per-text proof of origin.
    features_ranked=[]
    for kind,vectorizer,start in [('word',word,0),('char',char,len(word.get_feature_names_out()))]:
        names=vectorizer.get_feature_names_out()
        indices=sorted(range(len(names)),key=lambda i:abs(float(weights[start+i])),reverse=True)[:12]
        features_ranked.extend({'kind':kind,'term':str(names[i]),'weight':round(float(weights[start+i]),5)} for i in indices)
    artifact={'schema':3,'language':lang,'algorithm':name,'version':'v3.0-experimental','dimensions':int(X.shape[1]),
              'features':vectors_to_json(word,char,weights),'top_weighted_features':features_ranked,'bias':round(bias,8),
              'thresholds':{'ai':round(float(threshold),6),'human':0.35},
              'metrics':evaluated,'calibration':{'method':'platt_sigmoid','calibration_examples':len(cal_idx),'threshold_examples':len(select_idx)},'created_at':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
              'notice':'Group-held-out sigmoid calibration; still not a validated probability of authorship on unseen sources. Unpublished.'}
    report={'status':'experimental_not_published','language':lang,'sample_count':len(rows),'available_counts':available,
            'splits':{k:dict(Counter(r[1] for r in v)) for k,v in parts.items()},
            'validation_comparison':comparisons,'selection_based_on':'separate grouped threshold subset, recall at <=5% human FPR','calibration_method':'Platt sigmoid on disjoint group subset',
            'winner':name,'test_frozen':evaluated,'heldout_external':external_metrics,'heldout_provenance':provenance,
            'runtime_seconds':round(time.monotonic()-started,1),
            'limitations':['No definitive human-vs-AI authorship identification','Same-source learning and group leakage beyond exact duplicates still possible',
                           'No independent diverse GPT/Claude/Gemini benchmark','Model not deployed or published']}
    OUT.mkdir(parents=True,exist_ok=True)
    dest=OUT/(lang+'.json');tmp=OUT/(lang+'.json.writing');tmp.write_text(json.dumps(artifact,ensure_ascii=False,separators=(',',':')));tmp.replace(dest)
    (OUT/(lang+'-report.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(lang,'SAVED',dest,'seconds',report['runtime_seconds'],flush=True)
    return report
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--lang',choices=['fa','en'],required=True);a.add_argument('--limit-per-class',type=int,default=5000)
    args=a.parse_args();run(args.lang,args.limit_per_class)
