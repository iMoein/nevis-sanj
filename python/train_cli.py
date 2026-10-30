"""Simple command for advanced users and GitHub Actions. Does not publish automatically."""
import argparse,json,sys
from pathlib import Path
from ml import load_dataset,train,export_onnx
p=argparse.ArgumentParser()
p.add_argument('--lang',choices=['fa','en'],required=True)
p.add_argument('--dataset',required=True)
p.add_argument('--output',required=True)
p.add_argument('--onnx',default=None)
a=p.parse_args()
path=Path(a.dataset)
rows,skipped=load_dataset(path.read_text(encoding='utf-8-sig'),path.name)
model=train(rows,a.lang)
out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(model,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
if a.onnx: export_onnx(model,Path(a.onnx))
print(json.dumps({'saved':str(out),'skipped':skipped,'metrics':model['metrics']},ensure_ascii=False,indent=2))
