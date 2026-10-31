"""Local, source-controlled training automation. No predictions become labels.

Runs with the private manager or via macOS launchd. Never publishes models.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'python'))
from ml import load_dataset, train, normalized
import corpus_store as store

PRIVATE = ROOT / 'admin_data'
CANDIDATES = PRIVATE / 'candidates'
STATE_FILE = PRIVATE / 'auto-training-status.json'
LANGS = ('fa', 'en')
MAX_BYTES = 130_000_000


def utc():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def write_json_atomic(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.writing')
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf-8')
    tmp.replace(path)


def write_jsonl_atomic(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.writing')
    tmp.write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows), encoding='utf-8')
    tmp.replace(path)


def approved_dirs():
    """Strict allowlist: only explicit training-{fa,en}.jsonl in known folders.

    No scraping, generated predictions, arbitrary Downloads JSONL, or public text.
    """
    downloads = Path.home() / 'Downloads'
    # macOS LaunchAgents cannot access protected Downloads without explicit approval.
    # Scheduled jobs use only managed sources under Application Support.
    candidates = [ROOT / 'training' / 'approved', PRIVATE / 'discovered']
    if os.environ.get('NEVIS_SCHEDULED') != '1':
        candidates += [downloads / 'nevis-sanj-training-pack-v1.1.0' / 'data',
                       downloads / 'nevis-sanj-training-pack-v1' / 'data',
                       Path.home() / 'Documents' / 'NevisSanj' / 'training' / 'approved']
    # Legacy seed is a subset of v1.1; duplicate texts are removed by hash.
    return [p for p in candidates if p.is_dir()]


def sources_for(lang):
    if lang not in LANGS:
        raise ValueError('Unsupported language')
    return [p / f'training-{lang}.jsonl' for p in approved_dirs()
            if (p / f'training-{lang}.jsonl').is_file()]


def key_of(row):
    return hashlib.sha256(normalized(row['text']).encode('utf-8')).hexdigest()


def read_rows(path, lang):
    if not path.is_file():
        return [], 0
    if path.stat().st_size > MAX_BYTES:
        raise ValueError(f'File too large: {path.name}')
    rows, skipped = load_dataset(path.read_text(encoding='utf-8-sig'), path.name)
    return [r for r in rows if r['language'] == lang], skipped


def merge_rows(existing, incoming):
    """Keep existing trusted labels; never silently flip conflicting labels."""
    merged = {key_of(r): r for r in existing}
    new = 0
    conflicts = 0
    for r in incoming:
        h = key_of(r)
        if h in merged:
            if merged[h]['label'] != r['label']:
                conflicts += 1
            continue
        merged[h] = r
        new += 1
    return list(merged.values()), new, conflicts


def read_status():
    try:
        value = json.loads(STATE_FILE.read_text(encoding='utf-8'))
        return value if isinstance(value, dict) else {}
    except (FileNotFoundError, ValueError, OSError):
        return {}


def digest_rows(rows):
    # A changed label/group or added item triggers retraining.
    s = json.dumps(sorted((key_of(r), r['label'], r['group']) for r in rows),
                   ensure_ascii=False, separators=(',', ':'))
    return hashlib.sha256(s.encode()).hexdigest()


def one_pass():
    """Import vetted datasets then train candidates only if the dataset changed."""
    if store.DB.exists() and PRIVATE == store.DB.parent:return database_pass()
    PRIVATE.mkdir(parents=True, exist_ok=True)
    CANDIDATES.mkdir(parents=True, exist_ok=True)
    prev = read_status()
    newstate = {'checked_at': utc(), 'languages': {}}
    for lang in LANGS:
        dest = PRIVATE / f'{lang}.jsonl'
        sources = sources_for(lang)
        record = {'sources': [str(p) for p in sources], 'new_samples': 0,
                  'skipped': 0, 'label_conflicts': 0, 'trained': False,
                  'state': 'no_data', 'error': None}
        try:
            existing, skipped = read_rows(dest, lang)
            record['skipped'] += skipped
            updated = existing
            for path in sources:
                rows, skipped = read_rows(path, lang)
                record['skipped'] += skipped
                updated, added, conflicts = merge_rows(updated, rows)
                record['new_samples'] += added
                record['label_conflicts'] += conflicts
            if record['new_samples']:
                write_jsonl_atomic(dest, updated)
            counts = Counter(r['label'] for r in updated)
            record['counts'] = dict(counts)
            record['total'] = len(updated)
            record['groups'] = len({r['group'] for r in updated})
            if not updated:
                record['state'] = 'no_data'
            elif min(counts.get('human', 0), counts.get('ai', 0)) < 24:
                record['state'] = 'insufficient_data'
            else:
                digest = digest_rows(updated)
                candidate = CANDIDATES / f'{lang}.json'
                prior = prev.get('languages', {}).get(lang, {})
                if prior.get('dataset_hash') == digest and candidate.exists():
                    record['state'] = 'up_to_date'
                else:
                    model = train(updated, lang)
                    write_json_atomic(candidate, model)
                    record['trained'] = True
                    record['trained_at'] = utc()
                    record['state'] = 'candidate_ready'
                record['dataset_hash'] = digest
        except Exception as e:
            record['state'] = 'error'
            record['error'] = f'{type(e).__name__}: {e}'[:350]
        # Preserve the last successful digest after a transient failure.
        if 'dataset_hash' not in record:
            old = prev.get('languages', {}).get(lang, {})
            if old.get('dataset_hash'):
                record['dataset_hash'] = old['dataset_hash']
        if not record.get('trained_at') and prev.get('languages', {}).get(lang, {}).get('trained_at'):
            record['trained_at'] = prev['languages'][lang]['trained_at']
        newstate['languages'][lang] = record
    write_json_atomic(STATE_FILE, newstate)
    return newstate



def database_pass():
    """Incrementally ingest changed approved inputs; defer costly retraining."""
    from datetime import datetime, timezone
    from pathlib import Path
    now=utc();previous=read_status()
    result={'checked_at':now,'languages':{}}
    for lang in LANGS:
        old=previous.get('languages',{}).get(lang,{})
        fingerprints=dict(old.get('source_fingerprints',{}))
        n=0;changed=0;errors=[]
        for path in sources_for(lang):
            key=str(path);st=path.stat();signature=f'{st.st_size}:{st.st_mtime_ns}'
            if fingerprints.get(key)==signature:continue
            try:
                new=store.import_jsonl(lang,path);n+=new;changed+=1
                fingerprints[key]=signature
            except Exception as e:errors.append(f'{path.name}: {str(e)[:120]}')
        counts=store.stats()[lang]['counts']
        total=sum(counts.values())
        updated=dict(old,sources=[str(x) for x in sources_for(lang)],counts=counts,
                     total=total,groups=store.stats()[lang]['groups'],
                     new_samples=n,skipped=0,label_conflicts=0,trained=False,
                     source_fingerprints=fingerprints,error='; '.join(errors) or None,
                     state='error' if errors else 'needs_training' if changed or n else old.get('state','up_to_date'))
        result['languages'][lang]=updated
    write_json_atomic(STATE_FILE,result)
    return result

def guarded_pass():
    """Cross-process file lock so launchd and UI don't retrain simultaneously."""
    import fcntl
    PRIVATE.mkdir(parents=True, exist_ok=True)
    with (PRIVATE / 'auto-training.lock').open('a+') as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        return one_pass()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--once', action='store_true', help='Synchronise trusted datasets and train changed candidates')
    args = p.parse_args()
    if os.environ.get('NEVIS_SCHEDULED') == '1':
        try:
            import source_discovery
            source_discovery.scheduled_cycle()
        except Exception as e:
            print('Source discovery warning:',str(e)[:200],file=sys.stderr)
    try:
        result=guarded_pass()
        errors=[lang for lang,row in result['languages'].items() if row['state']=='error']
        write_json_atomic(PRIVATE/'scheduler-heartbeat.json',{'checked_at':utc(),'ok':not errors,'errors':errors,
            'summary':{lang:{'state':row['state'],'trained':row['trained'],'new_samples':row['new_samples']} for lang,row in result['languages'].items()}})
    except Exception as e:
        write_json_atomic(PRIVATE/'scheduler-heartbeat.json',{'checked_at':utc(),'ok':False,'errors':[str(e)[:250]]})
        raise
    for lang, row in result['languages'].items():
        print(f'{lang}: {row["state"]}; samples={row.get("total", 0)}; '
              f'new={row["new_samples"]}; trained={row["trained"]}; '
              f'errors={row.get("error") or "none"}')
    if any(x['state'] == 'error' for x in result['languages'].values()):
        raise SystemExit(1)

if __name__ == '__main__':
    main()
