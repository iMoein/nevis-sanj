"""Discovery and supervised ingestion of public text corpora.

Only metadata is discovered automatically. Approval requires verifying license,
provenance and column semantics; never infer class labels from model predictions.
Previously approved sources can be synced and trigger supervised retraining.
"""
from __future__ import annotations
import hashlib
import json
import os
import re
import time
import fcntl
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parent.parent
PRIVATE=ROOT/'admin_data'
STORE=PRIVATE/'source-registry.json'
DEST=PRIVATE/'discovered'
# Persian-first discovery, with independent English discovery. Queries are
# general search terms, never hardcoded dataset IDs.
PERSIAN_QUERIES=('persian-ai','persian-generated','synthetic-persian',
                 'farsi','persian-human','persian-text')
ENGLISH_QUERIES=('ai-generated','ai-text-detection','human-ai','synthetic-text')
QUERY_TERMS=PERSIAN_QUERIES+ENGLISH_QUERIES
PERMITTED_LICENSES={'apache-2.0','mit','cc0-1.0','cc-by-4.0','cc-by-3.0','bsd-3-clause','bsd-2-clause'}
HEADERS={'User-Agent':'NevisSanj-SourceDiscovery/2.5 (+public dataset metadata; local evaluation)','Accept':'application/json'}
MAX_CANDIDATES=240
MAX_APPROVED=12


def now():return datetime.now(timezone.utc).isoformat(timespec='seconds')

@contextmanager
def registry_lock():
    PRIVATE.mkdir(parents=True,exist_ok=True)
    with (PRIVATE/'source-registry.lock').open('a+') as file:
        fcntl.flock(file.fileno(),fcntl.LOCK_EX)
        try:yield
        finally:fcntl.flock(file.fileno(),fcntl.LOCK_UN)

def load():
    try:
        value=json.loads(STORE.read_text(encoding='utf-8'))
        return value if isinstance(value,dict) and isinstance(value.get('candidates'),dict) and isinstance(value.get('approved'),dict) else blank()
    except (OSError,ValueError):return blank()

def blank():return {'last_discovery':None,'last_error':None,'candidates':{},'approved':{},'last_sync':None,'sync_error':None}

def save(data):
    STORE.parent.mkdir(parents=True,exist_ok=True)
    target=STORE.with_suffix('.tmp')
    target.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    target.replace(STORE)

def request_json(url, retries=2):
    for attempt in range(retries+1):
        try:
            with urlopen(Request(url,headers=HEADERS),timeout=18) as response:
                if int(response.headers.get('Content-Length') or 0)>2_000_000:raise ValueError('metadata response too large')
                payload=response.read(2_000_001)
                if len(payload)>2_000_000:raise ValueError('metadata response too large')
                return json.loads(payload)
        except HTTPError as e:
            if e.code in (429,500,502,503) and attempt<retries:
                delay=min(8,2**attempt+1)
                try:delay=min(8,max(delay,int(e.headers.get('Retry-After') or '0')))
                except ValueError:pass
                time.sleep(delay);continue
            raise
        except (TimeoutError,URLError):
            if attempt>=retries:raise
            time.sleep(1+attempt)

def safe_id(value):
    return isinstance(value,str) and re.fullmatch(r'[A-Za-z0-9_.-]{1,80}/[A-Za-z0-9_.-]{1,100}',value) is not None

def licensed(value):return str(value).lower() in PERMITTED_LICENSES

def source_language_hint(row):
    """Unverified catalog hint; language must be measured on actual texts."""
    ident=str(row.get('id') or row.get('_id') or '').lower()
    tags=row.get('tags') or []
    tags_lower=[str(t).lower() for t in tags]
    if any(x in ident for x in ('persian','farsi','_fa_','-fa-')) or any(
        t in ('language:fa','language:fas','language:persian','persian','farsi','fa') for t in tags_lower):
        return 'fa'
    if any(t in ('language:en','language:eng') for t in tags_lower):
        return 'en'
    return 'unknown'

def sample_language(rows, mapping):
    """Classify measured text language; not based on dataset naming."""
    from ml import lang_of
    cols=['human_text','ai_text'] if mapping.get('mode')=='paired' else [mapping.get('text_field')]
    texts=[row.get(col) for row in rows for col in cols if col and isinstance(row.get(col),str)]
    if not texts:return 'unknown',{'fa':0,'en':0,'mixed':0}
    tally={'fa':0,'en':0,'mixed':0}
    for text in texts:
        tally[lang_of(text)]+=1
    clear=[k for k in ('fa','en') if tally[k]>=max(3,len(texts)*.8)]
    return (clear[0] if len(clear)==1 else 'mixed'),tally


def compact(row):
    identifier=row.get('id') or row.get('_id')
    if not safe_id(identifier):return None
    # Hub search is lexical and also returns AI image/audio datasets.
    # Filter obvious non-writing content before presenting source candidates.
    name=identifier.lower()
    if re.search(r'(image|vision|picture|photo|video|audio|speech|t2i|text2img|text2image|ocr|vqa)',name):
        return None
    if not re.search(r'(text|writing|essay|author|llm|ai[_-]|generated|detect|persian|farsi|human)',name):
        return None
    tags=row.get('tags') or []
    lic=next((t[8:] for t in tags if isinstance(t,str) and t.startswith('license:')),'')
    if not lic:lic=str(row.get('cardData',{}).get('license') or '') if isinstance(row.get('cardData'),dict) else ''
    return {'id':identifier,'license':lic,'modified':row.get('lastModified') or '',
            'downloads':row.get('downloads',0),'gated':bool(row.get('gated') or row.get('private')),
            'link':'https://huggingface.co/datasets/'+identifier,
            'language_hint':source_language_hint(row),
            'status':'pending','seen_at':now()}

def _discover():
    """Discover *candidate metadata*. Unreviewed items never become training examples."""
    state=load();added=0;errors=[]
    for term in QUERY_TERMS:
        url='https://huggingface.co/api/datasets?'+urlencode({'search':term,'sort':'lastModified','direction':'-1','limit':25,'full':'false'})
        try: items=request_json(url)
        except (HTTPError,URLError,TimeoutError,ValueError) as e:
            errors.append(term+': '+type(e).__name__+' '+str(e)[:80]);continue
        if not isinstance(items,list):errors.append(term+': unexpected response');continue
        for row in items:
            if not isinstance(row,dict):continue
            item=compact(row)
            if not item:continue
            key=item['id']
            if key in state['candidates']:
                prior=state['candidates'][key]
                prior.update({k:item[k] for k in ('license','modified','downloads')})
                if not prior.get('language_hint') or prior['language_hint']=='unknown':
                    prior['language_hint']=item['language_hint']
                continue
            if key in state['approved']:continue
            if len(state['candidates'])>=MAX_CANDIDATES:break
            state['candidates'][key]=item;added+=1
        time.sleep(.2)
    state['last_discovery']=now();state['last_error']='; '.join(errors) if errors else None
    save(state)
    return {'added':added,'candidates':len(state['candidates']),'errors':errors}



def read_dataset_card(identifier):
    """Read bounded, public README from a validated HF dataset ID."""
    if not safe_id(identifier):
        return ''
    url='https://huggingface.co/datasets/'+identifier+'/raw/main/README.md'
    try:
        with urlopen(Request(url,headers={'User-Agent':HEADERS['User-Agent'],
                                          'Accept':'text/plain'}),timeout=10) as response:
            if int(response.headers.get('Content-Length') or 0)>180000:
                return ''
            raw=response.read(180001)
            return raw.decode('utf-8','replace') if len(raw)<=180000 else ''
    except (HTTPError,URLError,TimeoutError,UnicodeError,ValueError):
        return ''


def explicit_numeric_mapping(document):
    """Map 0/1 only from explicit human/AI assignments in documentation."""
    human_patterns=[
        r'\bhuman(?:[-\s]+written)?\s*[:=(]\s*([01])\s*\)?',
        r'\b([01])\s*[=:]\s*human(?:[-\s]+written)?\b',
    ]
    ai_patterns=[
        r'\b(?:ai(?:[-\s]+generated)?|machine(?:[-\s]+generated)?)\s*[:=(]\s*([01])\s*\)?',
        r'\b([01])\s*[=:]\s*(?:ai(?:[-\s]+generated)?|machine(?:[-\s]+generated)?)\b',
    ]
    humans={m.group(1) for pattern in human_patterns for m in re.finditer(pattern,document,re.I)}
    machines={m.group(1) for pattern in ai_patterns for m in re.finditer(pattern,document,re.I)}
    if len(humans)==1 and len(machines)==1 and humans!=machines:
        return {'ai':next(iter(machines)),'human':next(iter(humans))}
    return None


def row_metadata_mapping(rows,label_field):
    """Use explicit 'source'/'origin' fields, never linguistic characteristics."""
    if not label_field:return None
    human_terms={'human','human-written','human_written','human written'}
    ai_terms={'ai','ai-generated','ai_generated','ai generated','machine','machine-generated'}
    for field in ('source','origin','author_type','text_origin','generation_source'):
        if field==label_field:continue
        mapping={}
        counts={'0':0,'1':0}
        invalid=False
        for row in rows:
            if field not in row or label_field not in row:continue
            label=str(row[label_field]).strip()
            origin=str(row[field]).strip().lower()
            if label not in ('0','1'):continue
            kind='human' if origin in human_terms else 'ai' if origin in ai_terms else None
            if kind is None:
                invalid=True;break
            if label in mapping and mapping[label]!=kind:
                invalid=True;break
            mapping[label]=kind;counts[label]+=1
        if not invalid and set(mapping)=={'0','1'} and mapping['0']!=mapping['1'] and min(counts.values())>=2:
            return {'ai':next(k for k,v in mapping.items() if v=='ai'),
                    'human':next(k for k,v in mapping.items() if v=='human'),
                    'field':field,'counts':counts}
    return None


def documented_single_class_source(identifier, rows, text_field, card=None):
    """Identify AI-only corpora from independent documentary and row evidence.

    Do not classify based on the subject's writing style, dataset name, or a
    generic 'synthetic' tag alone. Only this documented AI-only pattern is
    supported until equally strong human-origin evidence can be verified.
    """
    if not text_field or len(rows)<4:return None
    if card is None:card=read_dataset_card(identifier)
    if not card:return None
    doc=card.lower()
    synthetic=bool(re.search(r'(?:synthetic.{0,55}(?:corpus|dataset|data|pretraining)|(?:corpus|dataset).{0,55}synthetic)',doc))
    generation=bool(re.search(r'(?:generated with|generated by|produced (?:with|by)|teacher models|vertex ai batch)',doc))
    if not (synthetic and generation):return None
    model_re=re.compile(r'(?:gemini|gpt[-_0-9]|claude|llama|qwen|deepseek|mistral|phi[-_0-9]|command[-_]?r)',re.I)
    candidates=[r for r in rows if isinstance(r.get(text_field),str) and len(r[text_field])>100]
    if len(candidates)<4:return None
    teacher_check=sum(bool(model_re.search(str(r.get('teacher') or r.get('model') or ''))) for r in candidates)
    provenance_check=sum(bool(re.match(r'^(?:synth|synthetic|ai[-_]?gen)',str(r.get('source') or ''),re.I)) for r in candidates)
    if teacher_check<max(4,len(candidates)*.8) or provenance_check<max(4,len(candidates)*.8):
        return None
    return {'text_field':text_field,'label_field':'__constant_ai__','ai_value':'ai','human_value':'human',
            'observed_values':[],'ready':True,'needs_label_review':False,'binary_numeric':False,
            'mode':'ai','evidence':'documented_ai_only',
            'notice':'تولید ماشینی طبق مستندات و دو ستون منشأ/مدل تولیدکننده تأیید شد؛ این مجموعه نمونه انسانی ندارد.'}

def suggest_mapping(field_names, sample_rows, features=None):
    """Only infer labels when text values or explicit ClassLabel metadata prove them.

    Bare integers never identify their own meaning (0/1 may be reversed).
    """
    # Paired corpora contain *both* origin classes on each row.
    if {'human_text','ai_text'}.issubset(set(field_names)):
        return {'text_field':'human_text','label_field':'__paired__',
                'ai_value':'ai_text','human_value':'human_text',
                'observed_values':[],'ready':True,'needs_label_review':False,
                'binary_numeric':False,'evidence':'paired_columns',
                'mode':'paired','notice':'هر ردیف دو متن مستقل با منشأ مشخص دارد.'}
    text_fields=('text','content','writing','response','document','essay','article','generated_text')
    label_fields=('label','source','origin','generated_by','author_type','text_label')
    text_field=next((name for name in text_fields if name in field_names),None)
    label_field=next((name for name in label_fields if name in field_names),None)
    values=[]
    if label_field:
        values=list(dict.fromkeys(str(row[label_field]).strip() for row in sample_rows if label_field in row))[:12]
    explicit_ai=('ai','machine','generated','llm','ai-generated','machine-generated')
    explicit_human=('human','real','human-written','human_written')
    ai=next((v for v in values if v.lower() in explicit_ai),'')
    human=next((v for v in values if v.lower() in explicit_human),'')
    evidence='explicit_values' if ai and human else None
    for feature in (features or []):
        if not isinstance(feature,dict) or feature.get('name')!=label_field:continue
        ft=feature.get('type') or {}
        if not isinstance(ft,dict) or ft.get('_type')!='ClassLabel':continue
        names=ft.get('names') or []
        if not isinstance(names,list):continue
        if len(names)!=2:continue
        mapped_ai=next((str(i) for i,name in enumerate(names) if str(name).lower() in explicit_ai),None)
        mapped_human=next((str(i) for i,name in enumerate(names) if str(name).lower() in explicit_human),None)
        if mapped_ai is not None and mapped_human is not None:
            ai,human=mapped_ai,mapped_human
            evidence='class_label_metadata'
    ready=bool(text_field and label_field and ai and human)
    binary_numeric=bool(text_field and label_field and values and all(v in ('0','1') for v in values))
    return {'text_field':text_field,'label_field':label_field,
            'ai_value':ai,'human_value':human,'observed_values':values,
            'ready':ready,'needs_label_review':not ready,'binary_numeric':binary_numeric,
            'evidence':evidence,
            'notice':('نام ستون‌ها و برچسب‌های صریح تشخیص داده شدند؛ منشأ و مجوز همچنان باید تأیید شوند.'
                      if ready else 'نگاشت برچسب‌های انسانی و ماشینی به تأیید شما نیاز دارد.')}


def select_preview_samples(rows, label_field, limit=4):
    # Include different labels where available, instead of just the first four
    # rows (which often all represent the same class).
    chosen=[];used=set();seen_labels=set()
    if label_field:
        for row in rows:
            label=row.get(label_field)
            if label is None or str(label) in seen_labels:continue
            chosen.append(row);used.add(id(row));seen_labels.add(str(label))
            if len(chosen)>=limit:break
    for row in rows:
        if len(chosen)>=limit:break
        if id(row) not in used:
            chosen.append(row)
    return chosen

def _preview_source(identifier):
    if not safe_id(identifier):raise ValueError('شناسه مجموعه معتبر نیست.')
    try:
        splits=request_json('https://datasets-server.huggingface.co/splits?'+urlencode({'dataset':identifier}))
    except HTTPError as exc:
        if exc.code in (401,403):
            raise ValueError('دسترسی به پیش‌نمایش این منبع محدود است. منبع دیگری انتخاب کن؛ داده‌ای وارد آموزش نشده است.') from exc
        if exc.code==404:
            raise ValueError('پیش‌نمایش این منبع پیدا نشد. منبع دیگری انتخاب کن.') from exc
        raise ValueError('سرویس پیش‌نمایش این منبع موقتاً در دسترس نیست. بعداً دوباره تلاش کن.') from exc
    except (URLError,TimeoutError) as exc:
        raise ValueError('اتصال به سرویس پیش‌نمایش ممکن نیست. اتصال اینترنت را بررسی کن.') from exc
    available=[x for x in splits.get('splits',[]) if x.get('split') and x.get('config')]
    if not available:raise ValueError('نمایش برخط ردیف‌های این مجموعه پشتیبانی نمی‌شود.')
    # Some Hub datasets have metadata but the Dataset Viewer rows endpoint
    # returns 500 while converting or indexing a particular split. Try other
    # configurations before reporting a source-specific, actionable error.
    preferred=sorted(available,key=lambda x:0 if x['split']=='train' else 1)
    choice=None; rows=None; access='rows'
    # First try paginated rows (needed for full import), then the documented
    # cached first-rows preview. The latter only proves preview availability.
    for route in ('rows','first-rows'):
        for option in preferred[:3]:
            params={'dataset':identifier,'config':option['config'],'split':option['split']}
            if route=='rows':params.update({'offset':0,'length':40})
            try:
                candidate=request_json('https://datasets-server.huggingface.co/'+route+'?'+urlencode(params),retries=0)
                if not isinstance(candidate,dict) or not isinstance(candidate.get('rows'),list):continue
                choice,rows,access=option,candidate,route
                break
            except (HTTPError,URLError,TimeoutError,ValueError):
                continue
        if rows is not None:break
    if rows is None:
        raise ValueError('این مجموعه فعلاً پیش‌نمایش قابل‌خواندن ندارد. منبع دیگری انتخاب کن یا بعداً دوباره تلاش کن. هیچ داده‌ای وارد آموزش نشده.')
    fields=rows.get('features') or []
    cells=[]
    for item in rows.get('rows',[]):
        data=item.get('row') or {}
        if isinstance(data,dict):cells.append({k:str(v)[:650] for k,v in data.items() if isinstance(v,(str,int,float,bool))})
    field_names=[x['name'] for x in fields if isinstance(x,dict) and 'name' in x]
    recommendation=suggest_mapping(field_names,cells,fields)
    if not recommendation['ready'] and 'text' in field_names:
        single=documented_single_class_source(identifier,cells,'text')
        if single:recommendation=single
    # For numeric labels, require source-derived evidence, never visual guesses.
    if recommendation['binary_numeric'] and not recommendation['ready']:
        documentation=explicit_numeric_mapping(read_dataset_card(identifier))
        corroboration=row_metadata_mapping(cells,recommendation.get('label_field'))
        if documentation and corroboration and (
            documentation['ai']!=corroboration['ai'] or
            documentation['human']!=corroboration['human']):
            recommendation['mapping_conflict']=True
            recommendation['notice']='مستندات و ستون منشأ با هم تناقض دارند؛ این منبع کنار گذاشته می‌شود.'
        elif documentation or corroboration:
            matched=documentation or corroboration
            recommendation.update({
                'ai_value':matched['ai'],'human_value':matched['human'],
                'ready':True,'needs_label_review':False,
                'evidence':('documentation_and_source' if documentation and corroboration else
                            'dataset_documentation' if documentation else 'explicit_source_column'),
                'notice':('معنی برچسب‌ها از مستندات و ستون منشأ تأیید شد.'
                          if documentation and corroboration else
                          'معنی برچسب‌ها از اطلاعات منبع استخراج شد؛ کیفیت داده همچنان نیازمند ارزیابی است.')
            })
    from ml import tokens
    text_field=recommendation.get('text_field')
    if recommendation.get('mode')=='paired':
        usable=sum(1 for row in cells if all(
            isinstance(row.get(field),str) and 35<=len(tokens(row[field])) and len(row[field])<=25000
            for field in ('human_text','ai_text')))
    else:
        usable=sum(1 for row in cells if text_field and isinstance(row.get(text_field),str)
                   and 35<=len(tokens(row[text_field])) and len(row[text_field])<=25000)
    quality_warning=bool(text_field and len(cells)>=12 and usable==0)
    measured_language,language_counts=sample_language(cells,recommendation)
    return {'measured_language':measured_language,'language_counts':language_counts,
            'usable_preview_rows':usable,'preview_rows_checked':len(cells),
            'quality_warning':quality_warning,'config':choice['config'],'split':choice['split'],'options':[{'config':x['config'],'split':x['split']} for x in available[:20]],
            'fields':field_names,
            'examples':select_preview_samples(cells,recommendation['label_field']),
            'total':rows.get('num_rows_total'),
            'suggestion':recommendation,'preview_method':access,
            'ingest_ready':access=='rows'}


def preview(identifier):
    # Remember source availability so failing datasets are de-prioritized
    # without removing the possibility of trying them again later.
    try:
        result=_preview_source(identifier)
    except (ValueError,HTTPError,URLError,TimeoutError) as exc:
        with registry_lock():
            state=load()
            item=state['candidates'].get(identifier)
            if item is not None:
                item['preview_issue']=str(exc)[:180]
                item['preview_checked_at']=now()
                save(state)
        raise
    with registry_lock():
        state=load()
        item=state['candidates'].get(identifier)
        if item is not None:
            item.pop('preview_issue',None)
            item['preview_mode']=result.get('preview_method')
            item['language_measured']=result.get('measured_language','unknown')
            item['language_counts']=result.get('language_counts',{})
            item['quality_warning']=result.get('quality_warning',False)
            item['preview_usable']=result.get('usable_preview_rows',0)
            item['preview_ingest_ready']=result.get('ingest_ready',False)
            item['preview_checked_at']=now()
            save(state)
    return result

def _approve(identifier, *, config, split, text_field, label_field, ai_value, human_value, confirmed_license, confirmed_provenance):
    if not (confirmed_license and confirmed_provenance):raise ValueError('منشأ برچسب‌ها و مجوز استفاده باید تأیید شوند.')
    if not all(isinstance(x,str) and 1<=len(x)<=90 and re.fullmatch(r'[A-Za-z0-9_./-]+',x) for x in (config,split,text_field,label_field)):
        raise ValueError('نام ستون‌ها یا بخش دیتاست معتبر نیست.')
    if (text_field==label_field or (not label_field.startswith('__constant_') and str(ai_value)==str(human_value)) or not str(ai_value).strip() or not str(human_value).strip()):
        raise ValueError('برچسب‌های متن ماشینی و انسانی باید صریحاً متفاوت باشند.')
    # Constant-class sources need fresh independent proof, even via direct API.
    if label_field in ('__constant_ai__','__constant_human__'):
        checked=_preview_source(identifier)
        mapping=checked.get('suggestion') or {}
        intended='ai' if label_field=='__constant_ai__' else 'human'
        if (mapping.get('mode')!=intended or mapping.get('text_field')!=text_field or
            not checked.get('ingest_ready') or checked.get('quality_warning') or
            checked.get('measured_language') not in ('fa','en')):
            raise ValueError('این منبع برای آموزش تک‌دسته‌ای مدرک منشأ کافی ندارد.')
    # A paired source must be verified server-side; no user-supplied fake schema.
    if label_field=='__paired__':
        allowed_pair={'text_field':'human_text','ai_value':'ai_text','human_value':'human_text'}
        provided={'text_field':text_field,'ai_value':str(ai_value),'human_value':str(human_value)}
        if provided!=allowed_pair:
            raise ValueError('ساختار مجموعه جفتی معتبر نیست.')
        checked=_preview_source(identifier)
        if (checked['suggestion'].get('mode')!='paired' or
            not checked.get('ingest_ready') or checked.get('quality_warning')):
            raise ValueError('این مجموعه برای دریافت داده‌های جفتی آماده نیست.')
    # Even direct local API calls cannot approve arbitrary 0/1 assumptions.
    if (label_field not in ('__constant_ai__','__constant_human__') and
        {str(ai_value),str(human_value)}=={'0','1'}):
        checked=_preview_source(identifier)['suggestion']
        if (not checked['ready'] or str(checked['ai_value'])!=str(ai_value) or
            str(checked['human_value'])!=str(human_value)):
            raise ValueError('برچسب‌های عددی این منبع با شواهد مستند مطابقت ندارند؛ تأیید ممکن نیست.')
    state=load();item=state['candidates'].get(identifier)
    if not item or not safe_id(identifier):raise ValueError('منبع در فهرست کشف‌شده نیست.')
    if item['gated'] or not licensed(item['license']):raise ValueError('مجوز یا دسترسی این منبع برای ورود خودکار تأیید نشده است.')
    if len(state['approved'])>=MAX_APPROVED:raise ValueError('حداکثر تعداد منابع فعال تکمیل شده است.')
    schema={'id':identifier,'license':item['license'],'config':config,'split':split,
            'text_field':text_field,'label_field':label_field,'ai_value':str(ai_value),
            'human_value':str(human_value),'offset':0,'added':0,'approved_at':now(),'last_error':None,'last_sync':None,'enabled':True,
            'language':item.get('language_measured','unknown')}
    state['approved'][identifier]=schema
    del state['candidates'][identifier]
    save(state)
    return schema

def _reject(identifier):
    data=load()
    if identifier in data['candidates']:
        data['candidates'][identifier]['status']='dismissed'
        save(data)

def _disable(identifier):
    data=load()
    if identifier not in data['approved']:raise ValueError('منبع یافت نشد')
    data['approved'][identifier]['enabled']=False
    save(data)

def _ingest(max_rows_per_source=200, force=False):
    """Incremental import of *approved* labeled sources; no label guessing.

    Only exact approved label values are admitted. Data are locally deduped and
    saved for the existing auto_training pipeline to evaluate independently.
    """
    from ml import lang_of, tokens, normalized
    data=load();added={'fa':0,'en':0};errors=[]
    DEST.mkdir(parents=True,exist_ok=True)
    import corpus_store as store
    use_db=store.DB.exists() and DEST.resolve()==(store.DB.parent/'discovered').resolve()
    archives={}
    seen={}
    if use_db:
        db=store.connect()
        try:
            for lang in ('fa','en'):
                archives[lang]=[]
                seen[lang]={r[0] for r in db.execute('SELECT digest FROM examples WHERE language=?',(lang,))}
        finally:db.close()
    else:
        for lang in ('fa','en'):
            output=DEST/('training-'+lang+'.jsonl')
            rows=[json.loads(l) for l in output.read_text(encoding='utf-8').split('\n') if l.strip()] if output.exists() else []
            archives[lang]=rows
            seen[lang]={hashlib.sha256(normalized(x['text']).encode()).hexdigest() for x in rows}
    for source in data['approved'].values():
        if not source.get('enabled'):continue
        if not force and source.get('last_sync'):
            try:
                age=(datetime.now(timezone.utc)-datetime.fromisoformat(source['last_sync'])).total_seconds()
                if age < 55*60:continue
            except (TypeError,ValueError):pass
        offset=source.get('offset',0);remaining=max_rows_per_source
        short_skipped=0;checked=0;added_before=source.get('added',0)
        try:
            while remaining>0:
                count=min(100,remaining)
                url='https://datasets-server.huggingface.co/rows?'+urlencode({'dataset':source['id'],'config':source['config'],'split':source['split'],'offset':offset,'length':count})
                response=request_json(url)
                batch=response.get('rows') or []
                if not batch:break
                for item in batch:
                    row=item.get('row') or {}
                    if not isinstance(row,dict):continue
                    checked+=1
                    group=str(row.get('group') or row.get('topic_id') or row.get('topic') or row.get('human_id') or f'{source["id"]}:{item.get("row_idx",offset)}')[:110]
                    if source['label_field']=='__paired__':
                        pair=[('human',row.get('human_text')),('ai',row.get('ai_text'))]
                        # Preserve matched pairs. Do not introduce a class or
                        # topic bias by accepting only one half.
                        if any(not isinstance(txt,str) or not 35<=len(tokens(txt)) or len(txt)>25000 for _,txt in pair):
                            short_skipped+=1
                            continue
                        langs={lang_of(txt) for _,txt in pair}
                        if len(langs)!=1 or not langs.issubset({'fa','en'}):continue
                        lang=next(iter(langs))
                        digests=[hashlib.sha256(normalized(txt).encode()).hexdigest() for _,txt in pair]
                        if digests[0]==digests[1] or any(d in seen[lang] for d in digests):continue
                        for (label,txt),digest in zip(pair,digests):
                            archives[lang].append({'text':txt,'label':label,'group':group,'source_id':source['id']})
                            seen[lang].add(digest);added[lang]+=1;source['added']=source.get('added',0)+1
                        continue
                    text=row.get(source['text_field']);tag=row.get(source['label_field'])
                    if not isinstance(text,str):continue
                    if not 35<=len(tokens(text)) or len(text)>25000:
                        short_skipped+=1
                        continue
                    label=('ai' if source['label_field']=='__constant_ai__' else
                           'human' if source['label_field']=='__constant_human__' else
                           'ai' if str(tag)==source['ai_value'] else
                           'human' if str(tag)==source['human_value'] else None)
                    if label is None:continue
                    lang=lang_of(text)
                    if lang not in ('fa','en'):continue
                    digest=hashlib.sha256(normalized(text).encode()).hexdigest()
                    if digest in seen[lang]:continue
                    archives[lang].append({'text':text,'label':label,'group':group,'source_id':source['id']})
                    seen[lang].add(digest);added[lang]+=1;source['added']=source.get('added',0)+1
                offset+=len(batch);remaining-=len(batch)
                if len(batch)<count:break
                time.sleep(.25)
            source['offset']=offset;source['last_sync']=now();source['last_error']=None
            source['rows_checked']=source.get('rows_checked',0)+checked
            source['rows_too_short']=source.get('rows_too_short',0)+short_skipped
            source['last_run_checked']=checked
            source['last_run_added']=source.get('added',0)-added_before
        except (HTTPError,URLError,TimeoutError,ValueError,KeyError) as e:
            source['last_error']=f'{type(e).__name__}: {str(e)[:120]}'
            errors.append(source['id']+': '+source['last_error'])
    for lang in ('fa','en'):
        if not added[lang]:continue
        if use_db:
            db=store.connect()
            try:
                with db:store.insert_rows(db,lang,archives[lang])
            finally:db.close()
        else:
            dest=DEST/('training-'+lang+'.jsonl');tmp=dest.with_suffix('.tmp')
            tmp.write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in archives[lang]),encoding='utf-8')
            tmp.replace(dest)
    data['last_sync']=now();data['sync_error']='; '.join(errors) if errors else None
    save(data)
    return {'added':added,'errors':errors,'total_approved':len(data['approved'])}

def discover():
    with registry_lock():return _discover()

def approve(identifier, *, config, split, text_field, label_field, ai_value, human_value, confirmed_license, confirmed_provenance):
    with registry_lock():return _approve(identifier,config=config,split=split,text_field=text_field,
        label_field=label_field,ai_value=ai_value,human_value=human_value,
        confirmed_license=confirmed_license,confirmed_provenance=confirmed_provenance)

def reject(identifier):
    with registry_lock():return _reject(identifier)

def disable(identifier):
    with registry_lock():return _disable(identifier)

def ingest(max_rows_per_source=200, force=False):
    with registry_lock():return _ingest(max_rows_per_source=max_rows_per_source,force=force)

def public_state():
    data=load()
    return {'last_discovery':data['last_discovery'],'last_error':data['last_error'],'last_sync':data.get('last_sync'),
            'sync_error':data.get('sync_error'),'candidates':list(data['candidates'].values()),'approved':list(data['approved'].values()),
            'allowed_licenses':sorted(PERMITTED_LICENSES)}

def inspect_persian_candidates(limit=3):
    """Background preflight for Persian candidates. Never approves/imports data.

    Avoids making the user manually open every unavailable or unsuitable source.
    A daily scheduled run checks at most three candidates, without downloading
    full datasets. Cached inspection expires after seven days.
    """
    state=load()
    prospects=[]
    for ident,item in state['candidates'].items():
        if item.get('status')=='dismissed' or item.get('gated') or not licensed(item.get('license')):continue
        if item.get('language_hint')!='fa' and item.get('language_measured')!='fa':continue
        checked=item.get('preview_checked_at')
        try:
            if checked and (datetime.now(timezone.utc)-datetime.fromisoformat(checked)).total_seconds()<7*86400:continue
        except (ValueError,TypeError):pass
        prospects.append(ident)
    def priority(identifier):
        key=identifier.lower()
        points=12 if re.search(r'(ai[-_]?generated[-_]?text|human[-_]?ai|ai[-_]?text[-_]?detect)',key) else 0
        if 'synthetic-persian' in key:points+=6
        if re.search(r'(sentiment|med[-_]?qa|asr|alpaca|python|coding|translation|audio|image|ner)',key):points-=18
        return (-points,identifier)
    prospects.sort(key=priority)
    inspected=[]
    for identifier in prospects[:limit]:
        try:preview(identifier);inspected.append({'id':identifier,'state':'checked'})
        except (ValueError,HTTPError,URLError,TimeoutError) as exc:
            inspected.append({'id':identifier,'state':'unavailable'})
    return inspected

def scheduled_cycle():
    """Discover both languages, inspect Persian candidates, sync approved only."""
    state=load();last=state.get('last_discovery')
    try: due=not last or (datetime.now(timezone.utc)-datetime.fromisoformat(last)).total_seconds()>24*3600
    except (TypeError,ValueError):due=True
    if due:discover()
    # Preflight is bounded; failures become non-fatal per-source hints.
    inspected=inspect_persian_candidates(limit=3)
    result=ingest()
    result['persian_candidates_checked']=len(inspected)
    return result
