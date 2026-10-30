"""Private training panel. Binds only to 127.0.0.1, never deployed to Pages."""
from __future__ import annotations
import json, os, secrets, shutil, sys, threading, traceback, webbrowser
from collections import Counter
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'python'))
from ml import load_dataset, train, export_onnx
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


def status():
    obj={}
    for lang in ('fa','en'):
        rows=[];path=path_for(lang)
        if path.exists():rows=[json.loads(x) for x in path.read_text(encoding='utf-8').splitlines() if x.strip()]
        candidate=CANDIDATES/(lang+'.json')
        published=PUBLISHED/(lang+'.json')
        obj[lang]={'counts':dict(Counter(r['label'] for r in rows)),'total':len(rows),
            'groups':len(set(r['group'] for r in rows)),
            'candidate':json.loads(candidate.read_text(encoding='utf-8')).get('metrics') if candidate.exists() else None,
            'published':json.loads(published.read_text(encoding='utf-8')).get('metrics') if published.exists() else None}
    return {'languages':obj,'auto_source':str(detect_data_dir() or ''),'port':PORT}


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
    path_for(lang).write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in keep),encoding='utf-8')
    return {'imported':len(keep),'skipped':skipped+(len(rows)-len(keep)),'language':lang}


def auto_import(lang):
    d=detect_data_dir()
    if d is None:raise ValueError('پوشه آموزش در Downloads پیدا نشد؛ فایل را دستی انتخاب کنید.')
    f=d/('training-'+lang+'.jsonl')
    if not f.exists():raise ValueError(f'{f.name} وجود ندارد')
    return import_text(lang,f.read_text(encoding='utf-8-sig'),f.name)


def run_training(lang):
    f=path_for(lang)
    if not f.exists():raise ValueError('ابتدا فایل آموزشی را وارد کنید.')
    rows=[json.loads(x) for x in f.read_text(encoding='utf-8').splitlines() if x.strip()]
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
    server_version='NevisLocal/2.4'
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
            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'nonce-nevislocal'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'")
            self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
        elif urlparse(self.path).path=='/api/status':self._reply(200,status())
        else:self._reply(404,{'error':'پیدا نشد'})
    def do_POST(self):
        if not self._local():return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=23000000:raise ValueError('حجم درخواست مجاز نیست')
            args=json.loads(self.rfile.read(length))
            lang=args.get('language')
            if lang not in ('fa','en'):raise ValueError('زبان نامعتبر')
            route=urlparse(self.path).path
            if not LOCK.acquire(blocking=False):self._reply(409,{'error':'عملیات دیگری در حال اجراست.'});return
            try:
                if route=='/api/auto-import':result=auto_import(lang)
                elif route=='/api/upload':result=import_text(lang,args.get('content',''),args.get('filename','data.jsonl'))
                elif route=='/api/train':result={'metrics':run_training(lang)}
                elif route=='/api/publish':result=publish(lang,args.get('confirm') is True)
                else:self._reply(404,{'error':'عملیات نامعتبر است'});return
            finally:LOCK.release()
            self._reply(200,{'ok':True,'result':result,'status':status()})
        except (ValueError,KeyError,json.JSONDecodeError) as e:self._reply(400,{'error':str(e)})
        except Exception as e:
            traceback.print_exc();self._reply(500,{'error':f'خطای اجرای عملیات: {type(e).__name__}: {e}'})


def main():
    httpd=ThreadingHTTPServer(('127.0.0.1',PORT),Handler)
    print(f'\nپنل خصوصی نویس‌سنج: http://127.0.0.1:{PORT}\nبرای توقف Ctrl+C را فشار دهید.\n')
    threading.Timer(.8,lambda:webbrowser.open(f'http://127.0.0.1:{PORT}')).start()
    try:httpd.serve_forever()
    except KeyboardInterrupt:pass
    finally:httpd.server_close()

if __name__=='__main__':main()
