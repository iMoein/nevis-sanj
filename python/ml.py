"""NevisSanj training/inference contract. All training happens locally or on CI.

Models are *uncalibrated classifier scores*, never proof of authorship.
Only published models are copied to the public static site.
"""
from __future__ import annotations
import csv, hashlib, json, math, re, unicodedata
from collections import Counter
from pathlib import Path

DIM=2048
NUM=8
MIN_WORDS=35
MAX_TEXT=25000
TOKEN=re.compile(r'[^\W_]+', re.UNICODE)


def normalized(s: str) -> str:
    s=unicodedata.normalize('NFKC',s).lower().replace('ي','ی').replace('ى','ی').replace('ك','ک')
    s=s.replace('\u200c',' ').replace('\u200e',' ').replace('\u200f',' ')
    s=re.sub(r'[ًٌٍَُِّْـ]', '',s)
    return ' '.join(s.split())


def tokens(s: str) -> list[str]: return TOKEN.findall(normalized(s))

def lang_of(text: str) -> str:
    fa=len(re.findall(r'[\u0600-\u06ff]',text)); en=len(re.findall('[a-zA-Z]',text))
    return 'fa' if fa>en*2 else ('en' if en>fa*2 else 'mixed')


def fnv1a(s:str)->int:
    v=2166136261
    # Match JS charCodeAt (UTF-16 code units).
    b=s.encode('utf-16-le')
    for i in range(0,len(b),2):
        v ^= b[i]|(b[i+1]<<8)
        v=(v*16777619)&0xffffffff
    return v


def features(text: str):
    text=normalized(text)[:8000]
    words=TOKEN.findall(text)[:1200]
    weights=Counter()
    def add(k,val): weights[fnv1a(k)%DIM]+=val
    for i,w in enumerate(words):
        add('w:'+w,1.0)
        if i: add('b:'+words[i-1]+' '+w,.75)
    # Feature hashing is shared byte-for-byte with TypeScript browser engine.
    flat=' '.join(text.split())
    for n in (3,4):
        for i in range(0,max(0,len(flat)-n+1),2): add('c'+str(n)+':'+flat[i:i+n],.3)
    items={k:math.sqrt(v) for k,v in weights.items()}
    norm=math.sqrt(sum(v*v for v in items.values())) or 1
    for k in items: items[k]/=norm
    sentences=[len(TOKEN.findall(x)) for x in re.split(r'[.!?؟]+',text) if len(TOKEN.findall(x))>=3]
    mean=sum(sentences)/len(sentences) if sentences else 0
    cv=(math.sqrt(sum((x-mean)**2 for x in sentences)/len(sentences))/mean) if mean>0 else 0
    extras=[min(1,len(words)/400),min(1,len(set(words))/max(1,len(words))),min(1,mean/40),min(1,cv/1.6),
        min(1,len(sentences)/25),min(1,sum(len(x)<=3 for x in words)/max(1,len(words))),
        min(1,len(re.findall(r'[،؛,:;]',text))/max(1,len(words))*3),min(1,(len(re.findall(r'\n\s*\n',text))+1)/10)]
    for i,v in enumerate(extras):items[DIM+i]=(v-.5)*.45
    return items


def load_dataset(content:str, filename:str):
    if filename.lower().endswith('.csv'):
        import io
        data=list(csv.DictReader(io.StringIO(content)))
    elif filename.lower().endswith('.json'):
        obj=json.loads(content)
        data=obj if isinstance(obj,list) else obj.get('examples',[])
    else:
        data=[json.loads(line) for line in content.splitlines() if line.strip()]
    if len(data)>50000: raise ValueError('حداکثر ۵۰ هزار نمونه در هر فایل مجاز است.')
    output=[]; seen=set(); skipped=0
    for row in data:
        if not isinstance(row,dict): skipped+=1;continue
        s=row.get('text') or row.get('content') or row.get('writing')
        label=str(row.get('label',row.get('source',''))).strip().lower()
        label='ai' if label in ('ai','machine','generated','llm','1') else 'human' if label in ('human','real','0') else None
        if not isinstance(s,str) or not label or len(s)>MAX_TEXT or len(tokens(s))<MIN_WORDS:skipped+=1;continue
        key=hashlib.sha256(normalized(s).encode()).hexdigest()
        if key in seen: skipped+=1;continue
        seen.add(key)
        group=str(row.get('group') or row.get('topic_id') or row.get('human_id') or row.get('topic') or key)[:120]
        output.append({'text':s,'label':label,'group':group,'language':lang_of(s)})
    return output,skipped


def as_matrix(rows):
    import numpy as np
    mat=np.zeros((len(rows), DIM+NUM),dtype=np.float64)
    for i,row in enumerate(rows):
        for k,v in features(row['text']).items():mat[i,k]=v
    return mat


def _sketch(s:str):
    w=tokens(s)
    return {fnv1a(' '.join(w[i:i+6])) for i in range(len(w)-5)}


def train(rows:list[dict],language:str):
    import numpy as np
    from sklearn.linear_model import LogisticRegression
    if language not in ('fa','en'):raise ValueError('زبان باید فارسی یا انگلیسی باشد')
    data=[r for r in rows if r.get('language',lang_of(r['text']))==language and lang_of(r['text'])==language]
    humans=sum(r['label']=='human' for r in data); ais=sum(r['label']=='ai' for r in data)
    if min(humans,ais)<24:raise ValueError(f'برای {language} حداقل ۲۴ نمونه از هر کلاس لازم است (human={humans}, ai={ais}).')
    groups={}
    for r in data:groups.setdefault(r['group'],[]).append(r)
    if len(groups)<12:raise ValueError('شناسه‌های group تنوع کافی ندارند. حداقل ۱۲ گروه مستقل لازم است.')
    # Hash-independent deterministic group shuffle: paired topics remain together.
    keys=sorted(groups,key=lambda x:hashlib.sha256(('nevis-v2.4:'+x).encode()).hexdigest())
    train_rows=[]; holdout=[]; hold_counts={'ai':0,'human':0}
    wants={'ai':max(5,round(ais*.22)),'human':max(5,round(humans*.22))}
    for key in keys:
        g=groups[key];gcounts=Counter(x['label'] for x in g)
        if (any(hold_counts[t]<wants[t] for t in ('ai','human')) and
            all(hold_counts[t]+gcounts[t] <= {'ai':ais,'human':humans}[t]-15 for t in ('ai','human'))):
            holdout.extend(g)
            for t in hold_counts:hold_counts[t]+=gcounts[t]
        else:train_rows.extend(g)
    if min(hold_counts.values())<5:raise ValueError('داده کافی برای ارزیابی مستقل وجود ندارد.')
    # Reject validation items nearly identical to training texts, irrespective of group label.
    train_sketches=[_sketch(r['text']) for r in train_rows]
    def safe(r):
        s=_sketch(r['text'])
        return not any(len(s&other)/max(1,min(len(s),len(other))) >= .48 for other in train_sketches)
    clean=[r for r in holdout if safe(r)]
    if min(Counter(r['label'] for r in clean).values(),default=0)<5 or len(Counter(r['label'] for r in clean))<2:
        raise ValueError('نمونه مستقل کافی پس از حذف متن‌های مشابه باقی نمانده است.')
    classifier=LogisticRegression(C=.8,max_iter=500,class_weight='balanced',random_state=42)
    classifier.fit(as_matrix(train_rows),np.array([int(r['label']=='ai') for r in train_rows]))
    score=classifier.predict_proba(as_matrix(clean))[:,1]
    labels=[int(r['label']=='ai') for r in clean]
    pred=(score>=.5).astype(int)
    tp=int(sum(p==1 and y==1 for p,y in zip(pred,labels)));tn=int(sum(p==0 and y==0 for p,y in zip(pred,labels)))
    fp=int(sum(p==1 and y==0 for p,y in zip(pred,labels)));fn=int(sum(p==0 and y==1 for p,y in zip(pred,labels)))
    metrics={'train_count':len(train_rows),'test_count':len(clean),'test_human':tn+fp,'test_ai':tp+fn,
             'accuracy':round((tp+tn)/len(clean),4),'ai_recall':round(tp/max(1,tp+fn),4),
             'human_recall':round(tn/max(1,tn+fp),4),'false_positive_rate':round(fp/max(1,tn+fp),4),
             'precision':round(tp/max(1,tp+fp),4),'heldout_groups':len(set(r['group'] for r in clean)),
             'warning':'این ارزیابی با تعداد نمونه کم، برآورد دقت عمومی یا کالیبراسیون احتمال نیست.'}
    from datetime import datetime,timezone
    model={'schema':2,'language':language,'dimensions':DIM,'numeric_dimensions':NUM,
           'weights':[round(float(v),8) for v in classifier.coef_[0]], 'bias':round(float(classifier.intercept_[0]),8),
           'metrics':metrics,'created_at':datetime.now(timezone.utc).isoformat(),
           'notice':'امتیاز طبقه‌بند؛ نه احتمال قطعی منشأ متن'}
    return model


def prediction(model, text:str):
    z=model['bias'] + sum(model['weights'][k]*v for k,v in features(text).items())
    return 1/(1+math.exp(-max(-20,min(20,z))))


def export_onnx(model:dict,path:Path):
    """Optional ONNX for WebGPU/WASM deployments; standard JS linear inference is the fallback."""
    import numpy as np
    import onnx
    from onnx import helper, TensorProto, numpy_helper
    dim=len(model['weights'])
    W=numpy_helper.from_array(np.asarray(model['weights'],dtype=np.float32).reshape(dim,1),name='W')
    B=numpy_helper.from_array(np.asarray([model['bias']],dtype=np.float32),name='B')
    graph=helper.make_graph([helper.make_node('MatMul',['input','W'],['product']),
        helper.make_node('Add',['product','B'],['linear']),helper.make_node('Sigmoid',['linear'],['output'])],
        'nevis-sanj-'+model['language'],[helper.make_tensor_value_info('input',TensorProto.FLOAT,[1,dim])],
        [helper.make_tensor_value_info('output',TensorProto.FLOAT,[1,1])],[W,B])
    obj=helper.make_model(graph,opset_imports=[helper.make_opsetid('',13)],producer_name='NevisSanj')
    obj.ir_version=9
    onnx.checker.check_model(obj)
    onnx.save(obj,str(path))
