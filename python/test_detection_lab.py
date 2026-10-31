import json,sqlite3,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import detection_lab as lab

class DetectionLabTests(unittest.TestCase):
 def test_provenance_recognition(self):
  self.assertEqual(lab.source_name('wiki2018-1','{}'),'inferred:wikipedia-2018')
  self.assertEqual(lab.source_name('some-group',json.dumps({'source_id':'approved/source'})),'approved/source')
 def test_publication_gate_remains_blocked_without_independent_audit(self):
  report={'heldout_external':{'human':300,'ai':300,'ai_recall':.95,'human_false_positive_rate':.01},'winner':'linear_svm'}
  source={'total':600,'missing_or_inferred_source':0}
  with patch.object(lab,'report',return_value=report),patch.object(lab,'LAB',Path('/tmp/no-such-nevis-lab-123-456')):
   out=lab.gate('en',source)
  self.assertFalse(out['eligible'])
  self.assertGreaterEqual(len(out['blockers']),2)
 def test_exported_tfidf_vectorizer_matches_training(self):
  texts=['a research report explains model evaluation and tests','model evaluation detects reports and test cases',
         'a report uses evaluation and research evidence']
  src=TfidfVectorizer(preprocessor=lab.normal,token_pattern=r'(?u)\b\w+\b',ngram_range=(1,2),min_df=1,dtype=np.float32)
  src.fit(texts)
  restored=lab._vectorizer({'kind':'word','terms':list(src.get_feature_names_out()),'idf':list(src.idf_)})
  np.testing.assert_allclose(src.transform(texts).toarray(),restored.transform(texts).toarray(),atol=1e-6)
 def test_review_is_audited_and_never_relabels_training(self):
  with tempfile.TemporaryDirectory() as td:
   path=Path(td)/'corpus.db'
   with patch.object(lab,'DB',path):
    c=sqlite3.connect(path)
    c.execute('CREATE TABLE examples(digest TEXT PRIMARY KEY,language TEXT,label TEXT,group_id TEXT,text TEXT,metadata TEXT)')
    c.execute('INSERT INTO examples VALUES(?,?,?,?,?,?)',('hash','en','human','case','A sample that was written by an independently verified person.','{}'))
    c.commit();c.close()
    c=lab.connection()
    c.execute('INSERT INTO lab_review(digest,language,expected,predicted,score,source) VALUES(?,?,?,?,?,?)',('hash','en','human','ai',.9,'test'))
    c.commit();c.close()
    with self.assertRaises(ValueError):lab.review('en','hash','verified','ai','short')
    out=lab.review('en','hash','verified','human','Verified with original date and author record')
    self.assertFalse(out['training_updated']);self.assertFalse(out['published'])
    c=sqlite3.connect(path)
    self.assertEqual(c.execute('SELECT label FROM examples').fetchone()[0],'human')
    self.assertEqual(c.execute('SELECT state FROM lab_review').fetchone()[0],'verified')
    c.close()
 def test_empty_frozen_class_has_no_recall_claim(self):
  metric=lab.measurements([0,0,0],[.1,.4,.2],.5)
  self.assertEqual(metric['ai'],0)
  # Caller must clear the absent class, not report zero as genuine recall.
  self.assertEqual(metric['ai_recall'],0.0)
if __name__=='__main__':unittest.main()
