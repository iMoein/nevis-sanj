import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import auto_training as a

class AutoTrainingTests(unittest.TestCase):
    def test_merge_without_duplicate_or_label_flip(self):
        a1={'text':'some authentic article content about history', 'label':'human', 'group':'1'}
        a2={**a1,'label':'ai'}
        merged,new,conflicts=a.merge_rows([a1],[a1,a2])
        self.assertEqual((len(merged),new,conflicts),(1,0,1))
        self.assertEqual(merged[0]['label'],'human')

    def test_import_idempotent_and_only_explicit_sources(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            source=root/'approved';source.mkdir()
            rows=[]
            for n in range(28):
                for label in ('human','ai'):
                    text=('Original description written for testing of text classification ' +
                          'that contains many distinct words and a complete sentence. ' +
                          f'This particular topic focuses on item {n} and version {label}. ')*4
                    rows.append({'text':text,'label':label,'group':f'topic-{n}'})
            (source/'training-en.jsonl').write_text(''.join(json.dumps(x)+'\n' for x in rows),encoding='utf-8')
            (source/'arbitrary-scraped.jsonl').write_text('{"label":"human"}\n')
            with (patch.object(a,'PRIVATE',root/'private'),patch.object(a,'CANDIDATES',root/'private'/'candidates'),
                  patch.object(a,'STATE_FILE',root/'private'/'auto-training-status.json'),
                  patch.object(a,'approved_dirs',lambda:[source]),
                  patch.object(a,'train',lambda rows,lang:{'schema':2,'language':lang,'metrics':{'accuracy':.5}})):
                first=a.guarded_pass()
                self.assertEqual(first['languages']['en']['new_samples'],56)
                self.assertEqual(first['languages']['en']['state'],'candidate_ready')
                self.assertTrue((a.CANDIDATES/'en.json').is_file())
                second=a.guarded_pass()
                self.assertEqual(second['languages']['en']['new_samples'],0)
                self.assertEqual(second['languages']['en']['state'],'up_to_date')
                self.assertFalse(second['languages']['en']['trained'])
                self.assertEqual(second['languages']['fa']['state'],'no_data')
                self.assertEqual(len((root/'private'/'en.jsonl').read_text().splitlines()),56)

if __name__=='__main__':unittest.main()
