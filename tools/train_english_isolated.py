"""Isolated English import and candidate training; never touches Persian/public models."""
import json,sys
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(ROOT/'python'))
from auto_training import read_rows,merge_rows,write_jsonl_atomic,write_json_atomic,sources_for,PRIVATE,CANDIDATES
from ml import train
def main():
 dest=PRIVATE/'en.jsonl';old,skipped=read_rows(dest,'en')
 new=0;conflicts=0;updated=old
 for file in sources_for('en'):
  rows,drop=read_rows(file,'en')
  updated,added,flipped=merge_rows(updated,rows)
  new+=added;conflicts+=flipped;skipped+=drop
 if new:write_jsonl_atomic(dest,updated)
 print('EN_IMPORT',{'new':new,'total':len(updated),'classes':dict(Counter(x['label'] for x in updated)),'skipped':skipped,'conflicts':conflicts},flush=True)
 if '--import-only' in sys.argv:return
 model=train(updated,'en')
 CANDIDATES.mkdir(parents=True,exist_ok=True)
 write_json_atomic(CANDIDATES/'en.json',model)
 print('EN_CANDIDATE',model['metrics'],flush=True)
if __name__=='__main__':main()
