"""Calibrate Persian v3 on reserved validation HUMANS only, never external test."""
import json,math,sys
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from evaluate_chatgpt_claude_v3 import evaluator
def run():
 src=ROOT/'admin_data/experiments/v3/fa.json'
 model=json.loads(src.read_text(encoding='utf-8'))
 score=evaluator(src)
 path=ROOT/'admin_data/benchmark-fa/human-val.jsonl'
 rows=[json.loads(x) for x in path.read_text(encoding='utf-8').splitlines() if x]
 assert len(rows)>=50 and all(r['label']=='human' for r in rows)
 scores=np.array([score(r['text'])[0] for r in rows])
 prior=model['thresholds']['ai']
 threshold=float(max(prior,np.quantile(scores,.99)))
 model['thresholds']['ai']=round(threshold,6)
 model['version']='v3.0-experimental-cross-source-calibrated'
 model['calibration']['additional_threshold_validation']={'file':'admin_data/benchmark-fa/human-val.jsonl',
     'examples':len(rows),'quantile':.99,'previous_threshold':prior,
     'observed_validation_human_fpr':float(np.mean(scores>=threshold))}
 model['notice']='Experimental source-aware human validation threshold; no final test used for threshold choice; not published.'
 dest=ROOT/'admin_data/experiments/v3/fa-cross-source-calibrated.json'
 dest.write_text(json.dumps(model,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 print('CALIBRATED',json.dumps(model['calibration']['additional_threshold_validation']), 'threshold',threshold,flush=True)
if __name__=='__main__':run()
