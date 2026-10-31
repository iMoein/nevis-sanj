"""Read-only provenance catalog for the private NevisSanj training panel."""
import json,re,sqlite3
from collections import defaultdict
from pathlib import Path
import corpus_store as store

DOCUMENTED={
 'artnitolog/llm-generated-texts':('متن‌های هم‌موضوع انسان، ChatGPT و Claude','آموزش و آزمون تمایز متن انسان از GPT-4 و Claude 3 در مقاله‌های انگلیسی','مجوز عمومی مشخص نشده؛ فقط پژوهش محلی','https://huggingface.co/datasets/artnitolog/llm-generated-texts'),
 'asrinvakili/persian-ai-text-corpus':('خروجی فارسی GPT-4o-mini','آموزش شناسایی نوشته‌های فارسی تولیدشده با مدل GPT در موضوع‌های علمی','طبق شرایط ارائه‌دهنده؛ فقط پژوهش محلی','https://github.com/asrinvakili/persian-ai-text-corpus'),
 'shahryars/vazirweb-persian-social-media-content':('محتوای فارسی Claude','آموزش تشخیص لحن و قالب محتوای شبکه‌های اجتماعی فارسی تولیدشده با Claude','CC BY 4.0؛ نسخه دقیق مدل تأیید نشده','https://huggingface.co/datasets/shahryars/vazirweb-persian-social-media-content'),
 'ibnsina-llm/synthetic-persian-v1':('متن مصنوعی فارسی Gemini','پوشش نمونه‌های فارسی تولیدشده با Gemini برای مقایسه میان سازندگان','Apache-2.0 به اعلام ناشر','https://huggingface.co/datasets/ibnsina-llm/synthetic-persian-v1'),
 'codersan/Persian-Wikipedia-Corpus':('متن انسانی فارسی ویکی‌پدیا','تأمین متن انسانی مرجع و کاهش مثبت کاذب','منشأ و شرایط بازنشر باید بررسی شود','https://huggingface.co/datasets/codersan/Persian-Wikipedia-Corpus'),
 'Persian Wikipedia historical revisions':('ویرایش‌های تاریخی فارسی ویکی‌پدیا','ارزیابی و آموزش تنوع متن انسانی مستقل از مولدهای جدید','شرایط منبع اصلی بررسی شود',''),
 'acmc/multi_domain_ai_human_text':('مجموعه چندموضوعی متن انسان و AI انگلیسی','یادگیری تمایز متن انسانی و ماشینی در چند دامنه','مجوز ادعایی دیتاست CC BY 4.0','https://huggingface.co/datasets/acmc/multi_domain_ai_human_text'),
 'jist2009/human_ai_generated_text':('متن انسانی و مصنوعی انگلیسی','آموزش تشخیص متن ماشینی در برابر متن انسانی','مجوز منبع بررسی شود','https://huggingface.co/datasets/jist2009/human_ai_generated_text'),
 'R-obi/ai-text-detection-pile-cleaned':('مجموعه پالایش‌شده تشخیص متن AI','افزایش تنوع نمونه‌های انگلیسی متن ماشینی و انسانی','MIT به اعلام ناشر','https://huggingface.co/datasets/R-obi/ai-text-detection-pile-cleaned'),
}
HOLDOUT=Path('admin_data/benchmark-chatgpt-claude')
def family(model):
 m=model.lower()
 if m in ('human','انسانی'):return 'human'
 if m.startswith('gpt-') or 'gpt-' in m or 'gpt2' in m or 'chatgpt' in m or 'openai' in m:return 'ChatGPT / OpenAI'
 if m.startswith('claude'):return 'Claude / Anthropic'
 if 'gemini' in m:return 'Gemini / Google'
 return 'unknown'

def reserved_counts(root):
 result=defaultdict(int)
 for lang in ('fa','en'):
  path=root/HOLDOUT/(lang+'-external-heldout.jsonl')
  if not path.exists():continue
  with path.open(encoding='utf-8') as handle:
   for line in handle:
    if not line.strip():continue
    r=json.loads(line)
    # Only topic-group-excluded benchmark files are read here, never imported.
    source=r.get('source_id')
    if source and r.get('label') in ('human','ai'):
     result[(source,lang,r.get('model') or r['label'],r['label'])]+=1
 return result

def catalog(root=None,db_path=None):
 root=Path(root) if root is not None else store.ROOT
 db_path=Path(db_path) if db_path is not None else store.DB
 if not db_path.exists():return {'sources':[],'summary':{'total':0,'ai':0,'human':0,'holdout':0}}
 with sqlite3.connect(str(db_path)) as db:
  rows=db.execute("""
   SELECT language,label,
     COALESCE(NULLIF(json_extract(metadata,'$.source_id'),''),'__unspecified__') AS source,
     COALESCE(NULLIF(json_extract(metadata,'$.model'),''),
              NULLIF(json_extract(metadata,'$.generator'),''),
              NULLIF(json_extract(metadata,'$.teacher'),''),
              NULLIF(json_extract(metadata,'$.generator_family'),''),'نامشخص') AS model,
     COUNT(*) AS total,COUNT(DISTINCT group_id) AS groups
   FROM examples GROUP BY language,label,source,model
  """).fetchall()
 reserved=reserved_counts(root)
 sources={}
 for lang,label,source,model,total,groups in rows:
  if label=='human':model='human'
  key=(source,lang)
  if key not in sources:
   title,purpose,license,url=DOCUMENTED.get(source,('منبع با شناسه ثبت‌شده' if source!='__unspecified__' else 'منبع بدون شناسه ثبت‌شده','پوشش داده‌های '+('فارسی' if lang=='fa' else 'انگلیسی')+' برای مقایسه متن انسان و AI','مجوز و منشأ نیازمند بررسی',''))
   sources[key]={'id':source,'language':lang,'title':title,'purpose':purpose,'license':license,'url':url,
                 'counts':{'ai':0,'human':0,'holdout':0},'models':[],'status':'در بانک آموزش؛ انتشار مدل وابسته به ارزیابی'}
  item=sources[key]
  item['counts'][label]+=total
  item['models'].append({'name':model,'family':family(model),'label':label,'train_count':total,'holdout_count':reserved.get((source,lang,model,label),0)})
 for (source,lang,model,label),count in reserved.items():
  if (source,lang) not in sources:continue
  item=sources[(source,lang)]
  item['counts']['holdout']+=count
  if not any(x['name']==model and x['label']==label for x in item['models']):
   item['models'].append({'name':model,'family':family(model),'label':label,'train_count':0,'holdout_count':count})
 for item in sources.values():
  item['counts']['training']=item['counts']['ai']+item['counts']['human']
  item['models'].sort(key=lambda x:(x['label']!='ai',-x['train_count'],x['name']))
 out=sorted(sources.values(),key=lambda x:(x['id'] not in DOCUMENTED,-x['counts']['training'],x['id'],x['language']))
 return {'sources':out,'summary':{'total':sum(x['counts']['training'] for x in out),
          'ai':sum(x['counts']['ai'] for x in out),'human':sum(x['counts']['human'] for x in out),
          'holdout':sum(x['counts']['holdout'] for x in out),'source_language_count':len(out)},
         'explanation':'نمونه‌های آموزش در بانک SQLite موجودند؛ وضعیت استفاده از تک‌تک ردیف‌ها در وزن‌های مدل قابل اثبات نیست. آزمون‌ها در فایل جداگانه نگهداری می‌شوند.'}
