"""Private training panel. Binds only to 127.0.0.1, never deployed to Pages."""
from __future__ import annotations
import json, os, secrets, shutil, sys, threading, traceback, webbrowser, subprocess
from datetime import datetime, timezone
from collections import Counter
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'python'))
from ml import load_dataset, train, export_onnx
from auto_training import guarded_pass, read_status, merge_rows, write_jsonl_atomic
import source_discovery as discovery
import corpus_store as store
from install_scheduler import PLIST, install as enable_scheduler, uninstall as disable_scheduler
PRIVATE=ROOT/'admin_data'
CANDIDATES=PRIVATE/'candidates'
PUBLISHED=ROOT/'models'/'published'
PUBLIC=ROOT/'dist'/'models'
PORT=int(os.environ.get('NEVIS_ADMIN_PORT','8765'))
TOKEN=secrets.token_urlsafe(32)
LOCK=threading.Lock()
for folder in (PRIVATE,CANDIDATES,PUBLISHED,PUBLIC):folder.mkdir(parents=True,exist_ok=True)


def path_for(lang):
    if lang not in ('fa','en'):raise ValueError('زبان نامعتبر')
    return PRIVATE/(lang+'.jsonl')



def scheduler_health():
    if not PLIST.exists():return {'enabled':False,'state':'disabled','detail':'زمان‌بندی ساعتی غیرفعال است.'}
    try:
        proc=subprocess.run(['launchctl','print',f'gui/{os.getuid()}/com.nevissanj.auto-training'],
            capture_output=True,text=True,timeout=4)
        if proc.returncode:return {'enabled':True,'state':'not_loaded','detail':'فایل زمان‌بندی وجود دارد ولی سرویس بارگذاری نشده است.'}
    except (OSError,subprocess.TimeoutExpired):
        return {'enabled':True,'state':'unknown','detail':'امکان خواندن وضعیت سرویس وجود ندارد.'}
    try:
        data=json.loads((PRIVATE/'scheduler-heartbeat.json').read_text(encoding='utf-8'))
        t=data['checked_at'];hours=(datetime.now(timezone.utc)-datetime.fromisoformat(t)).total_seconds()/3600
        if not data.get('ok'):return {'enabled':True,'state':'failed','last_checked':t,'detail':'اجرای ساعتی خطا داشته: '+', '.join(data.get('errors',[]))}
        if hours>2.2:return {'enabled':True,'state':'stale','last_checked':t,'detail':'آخرین اجرای موفق بیش از دو ساعت قبل بوده است.'}
        return {'enabled':True,'state':'healthy','last_checked':t,'detail':'زمان‌بندی فعال است و آخرین اجرا موفق بوده.'}
    except (OSError,KeyError,ValueError,TypeError):
        return {'enabled':True,'state':'waiting','detail':'هنوز اجرای زمان‌بندی‌شده موفقی ثبت نشده است.'}

def status():
    obj={}
    for lang in ('fa','en'):
        snapshot=store.stats()
        if snapshot is not None:
            counts_db=snapshot[lang]['counts'];groups_db=snapshot[lang]['groups']
        else:
            path=path_for(lang);rows=[json.loads(x) for x in path.read_text(encoding='utf-8').split('\n') if x.strip()] if path.exists() else []
            counts_db=dict(Counter(r['label'] for r in rows));groups_db=len(set(r['group'] for r in rows))
        candidate=CANDIDATES/(lang+'.json')
        published=PUBLISHED/(lang+'.json')
        counts=Counter(counts_db)
        # This is a readiness warning, not a claim about authorship accuracy.
        readiness={'ready':min(counts.get('human',0),counts.get('ai',0))>=100 and
                   max(counts.get('human',0),counts.get('ai',0))<=3*max(1,min(counts.get('human',0),counts.get('ai',0))),
                   'human_gap_to_100':max(0,100-counts.get('human',0)),
                   'message':'داده انسانی/ماشینی برای ارزیابی معتبر و متوازن کافی نیست.'}
        obj[lang]={'counts':dict(counts),'readiness':readiness,'total':sum(counts.values()),
            'groups':groups_db,
            'candidate':json.loads(candidate.read_text(encoding='utf-8')).get('metrics') if candidate.exists() else None,
            'published':json.loads(published.read_text(encoding='utf-8')).get('metrics') if published.exists() else None}
    return {'languages':obj,'auto_source':str(detect_data_dir() or ''), 'automation': read_status(), 'scheduler_enabled':PLIST.exists(), 'scheduler':scheduler_health(), 'discovery':discovery.public_state(), 'port':PORT}


def detect_data_dir():
    dirs=[Path.home()/'Downloads'/'nevis-sanj-training-pack-v1.1.0'/'data',
          Path.home()/'Downloads'/'nevis-sanj-training-pack-v1'/'data',
          ROOT/'training'/'approved']
    return next((d for d in dirs if (d/'training-fa.jsonl').exists() or (d/'training-en.jsonl').exists()),None)


def import_text(lang, content, filename):
    if len(content)>22000000:raise ValueError('حجم داده بیشتر از حد مجاز است.')
    rows,skipped=load_dataset(content,filename)
    keep=[r for r in rows if r['language']==lang]
    if not keep:raise ValueError('داده معتبری برای زبان انتخابی پیدا نشد.')
    if store.DB.exists():
        db=store.connect()
        try:
            with db:new=store.insert_rows(db,lang,keep)
            conflicts=0
        finally:db.close()
    else:
        previous = [json.loads(x) for x in path_for(lang).read_text(encoding='utf-8').split('\n') if x.strip()] if path_for(lang).exists() else []
        merged, new, conflicts = merge_rows(previous, keep)
        if new: write_jsonl_atomic(path_for(lang), merged)
    return {'imported':new,'duplicates':len(keep)-new,'conflicts':conflicts, 'skipped':skipped+(len(rows)-len(keep)),'language':lang}


def auto_import(lang):
    result=guarded_pass()['languages'][lang]
    if result.get('error'): raise ValueError(result['error'])
    return result


def run_training(lang):
    f=path_for(lang)
    if not store.DB.exists() and not f.exists():raise ValueError('ابتدا فایل آموزشی را وارد کنید.')
    rows=list(store.rows(lang)) if store.DB.exists() else [json.loads(x) for x in f.read_text(encoding='utf-8').split('\n') if x.strip()]
    candidate=train(rows,lang)
    (CANDIDATES/(lang+'.json')).write_text(json.dumps(candidate,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    # Do NOT automatically publish; protect the public site from unreviewed models.
    return candidate['metrics']


def publish(lang,confirm):
    if not confirm:raise ValueError('انتشار مدل نیازمند تأیید آگاهانه است.')
    path=CANDIDATES/(lang+'.json')
    if not path.exists():raise ValueError('مدل آزمایشی برای انتشار موجود نیست.')
    model=json.loads(path.read_text(encoding='utf-8'))
    if model.get('schema')!=2 or model.get('language')!=lang:raise ValueError('ساختار مدل سازگار نیست.')
    for target in (PUBLISHED/(lang+'.json'),PUBLIC/(lang+'.json')):
        tmp=target.with_suffix('.tmp');shutil.copyfile(path,tmp);tmp.replace(target)
    # Convert to ONNX if available. Portable JSON inference always works without ONNX.
    converted=False
    try:
        export_onnx(model,PUBLISHED/(lang+'.onnx'))
        shutil.copyfile(PUBLISHED/(lang+'.onnx'),PUBLIC/(lang+'.onnx'))
        converted=True
    except ImportError:
        pass
    return {'published':True,'onnx':converted,'model_path':str(PUBLISHED/(lang+'.json')),
            'next':'برای انتشار در GitHub Pages، publish.command را اجرا کنید یا git push بزنید.'}


class Handler(BaseHTTPRequestHandler):
    server_version='NevisLocal/2.5.0'
    def log_message(self,format,*args):print('[admin]',format%args)
    def _reply(self,status,obj):
        out=json.dumps(obj,ensure_ascii=False).encode('utf-8')
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(out)))
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('X-Frame-Options','DENY');self.end_headers();self.wfile.write(out)
    def _local(self):
        if self.headers.get('Host') not in (f'127.0.0.1:{PORT}',f'localhost:{PORT}'):
            self._reply(403,{'error':'درخواست فقط از دستگاه محلی مجاز است.'});return False
        if self.command=='POST':
            origin=self.headers.get('Origin')
            if origin not in (None,f'http://127.0.0.1:{PORT}',f'http://localhost:{PORT}') or self.headers.get('X-Nevis-Token')!=TOKEN or not self.headers.get('Content-Type','').startswith('application/json'):
                self._reply(403,{'error':'درخواست تأیید نشد.'});return False
        return True
    def do_GET(self):
        if not self._local():return
        if urlparse(self.path).path=='/':
            content=(ROOT/'admin'/'index.html').read_text(encoding='utf-8').replace('%%TOKEN%%',TOKEN).encode('utf-8')
            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'nonce-nevislocal'; style-src 'unsafe-inline'; font-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'")
            self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
        elif urlparse(self.path).path=='/fonts/Vazirmatn-v33.003.woff2':
            content=(ROOT/'admin'/'fonts'/'Vazirmatn-v33.003.woff2').read_bytes()
            self.send_response(200)
            self.send_header('Content-Type','font/woff2')
            self.send_header('Content-Length',str(len(content)))
            self.send_header('Cache-Control','public, max-age=31536000, immutable')
            self.send_header('X-Content-Type-Options','nosniff')
            self.end_headers();self.wfile.write(content)
        elif urlparse(self.path).path=='/api/status':self._reply(200,status())
        else:self._reply(404,{'error':'پیدا نشد'})
    def do_POST(self):
        if not self._local():return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=23000000:raise ValueError('حجم درخواست مجاز نیست')
            args=json.loads(self.rfile.read(length))
            lang=args.get('language')
            route=urlparse(self.path).path
            if route not in ('/api/discover','/api/preview-source','/api/approve-source','/api/disable-source','/api/reject-source','/api/sync-sources') and lang not in ('fa','en'):raise ValueError('زبان نامعتبر')
            if not LOCK.acquire(blocking=False):self._reply(409,{'error':'عملیات دیگری در حال اجراست.'});return
            try:
                if route=='/api/discover':result=discovery.discover()
                elif route=='/api/preview-source':result=discovery.preview(args.get('identifier',''))
                elif route=='/api/approve-source':
                    allowed={'identifier','config','split','text_field','label_field','ai_value','human_value','confirmed_license','confirmed_provenance'}
                    result=discovery.approve(**{k:v for k,v in args.items() if k in allowed})
                elif route=='/api/reject-source':result=discovery.reject(args.get('identifier',''))
                elif route=='/api/disable-source':result=discovery.disable(args.get('identifier',''))
                elif route=='/api/sync-sources':
                    result=discovery.ingest(force=True);guarded_pass()
                elif route in ('/api/auto-import','/api/sync'):result=auto_import(lang)
                elif route=='/api/upload':
                    result=import_text(lang,args.get('content',''),args.get('filename','data.jsonl'))
                    guarded_pass()
                elif route=='/api/train':result={'metrics':run_training(lang)}
                elif route=='/api/publish':result=publish(lang,args.get('confirm') is True)
                elif route=='/api/schedule-enable':enable_scheduler();result={'enabled':True}
                elif route=='/api/schedule-disable':disable_scheduler();result={'enabled':False}
                else:self._reply(404,{'error':'عملیات نامعتبر است'});return
            finally:LOCK.release()
            self._reply(200,{'ok':True,'result':result,'status':status()})
        except (ValueError,KeyError,json.JSONDecodeError) as e:self._reply(400,{'error':str(e)})
        except Exception as e:
            traceback.print_exc();self._reply(500,{'error':f'خطای اجرای عملیات: {type(e).__name__}: {e}'})


def auto_loop():
    while True:
        try:
            if os.environ.get('NEVIS_SKIP_DISCOVERY') != '1':
                discovery.scheduled_cycle()
            with LOCK:
                guarded_pass()
        except Exception:
            traceback.print_exc()
        threading.Event().wait(600)

def main():
    threading.Thread(target=auto_loop, name='nevis-auto-training', daemon=True).start()
    httpd=ThreadingHTTPServer(('127.0.0.1',PORT),Handler)
    print(f'\nپنل خصوصی نویس‌سنج: http://127.0.0.1:{PORT}\nبرای توقف Ctrl+C را فشار دهید.\n')
    threading.Timer(.8,lambda:webbrowser.open(f'http://127.0.0.1:{PORT}')).start()
    try:httpd.serve_forever()
    except KeyboardInterrupt:pass
    finally:httpd.server_close()

if __name__=='__main__':main()
