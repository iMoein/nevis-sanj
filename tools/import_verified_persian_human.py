import json,urllib.request,hashlib,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'python'))
from ml import tokens,normalized
URL='https://raw.githubusercontent.com/asrinvakili/persian-ai-text-corpus/main/data/splits/'
BENCH=ROOT/'admin_data'/'benchmark-fa'; CACHE=ROOT/'admin_data'/'imports'/'wikifa'
def fetch(split):
 CACHE.mkdir(parents=True,exist_ok=True);p=CACHE/(split+'.jsonl')
 if not p.exists():
  req=urllib.request.Request(URL+split+'.jsonl',headers={'User-Agent':'NevisSanjCorpusAudit/1.0'})
  with urllib.request.urlopen(req,timeout=50) as f:data=f.read(12_000_001)
  if len(data)>12_000_000:raise ValueError('oversized source')
  p.write_bytes(data)
 return [json.loads(x) for x in p.read_text().splitlines() if x.strip()]
def human(r):
 return dict(text=r['text'],label='human',group='wiki-'+str(r['human_id']),
             revision_id=r['revision_id'],revision_date=r['revision_date'],url=r['url'],
             license='CC BY-SA 4.0',source_id='Persian Wikipedia historical revisions')
def sha(s):return hashlib.sha256(normalized(s).encode()).hexdigest()
def save(p,rows):
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
def main():
 raw={k:fetch(k) for k in ('train','val','test')}
 sets={k:[human(r) for r in v if r.get('source')=='human' and str(r.get('label'))=='0'
        and r.get('revision_id') and r.get('url') and 35<=len(tokens(r.get('text',''))) and len(r['text'])<=25000] for k,v in raw.items()}
 groups={k:{r['group'] for r in v} for k,v in sets.items()}
 assert all(not groups[a]&groups[b] for a in groups for b in groups if a!=b)
 existing=ROOT/'admin_data'/'fa.jsonl'
 old={sha(json.loads(x)['text']) for x in existing.read_text().splitlines()} if existing.exists() else set()
 overlaps={k:sum(sha(r['text']) in old for r in v) for k,v in sets.items()}
 for k in ('val','test'):sets[k]=[r for r in sets[k] if sha(r['text']) not in old]
 train=ROOT/'training'/'approved'/'training-fa.jsonl';BENCH.mkdir(parents=True,exist_ok=True)
 save(train,sets['train']);save(BENCH/'human-val.jsonl',sets['val']);save(BENCH/'human-test.jsonl',sets['test'])
 report=dict(human_counts={k:len(v) for k,v in sets.items()},existing_overlaps=overlaps,
             ai_samples_imported=0,source='https://github.com/asrinvakili/persian-ai-text-corpus',
             license='CC BY-SA 4.0: attribution and share-alike required',
             limitation='Encyclopedic only; human-only holdouts cannot measure AI recall; topic leakage with other corpora needs audit')
 (BENCH/'import-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 (BENCH/'ATTRIBUTION_AND_LICENSE.md').write_text('# Human texts attribution\nPersian Wikipedia historic revisions, via Asrin Vakili, Persian AI-Text Corpus (https://github.com/asrinvakili/persian-ai-text-corpus).\nLicense: CC BY-SA 4.0. Revision URL and revision timestamp are preserved per row. Respect share-alike for redistributed adapted text.\nAI records are academic-research-only and were NOT used.\n')
 print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
