import json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import corpus_store as store
class SQLiteCorpusTests(unittest.TestCase):
 def test_idempotent_dedup_and_group(self):
  with tempfile.TemporaryDirectory() as temp:
   with patch.object(store,'DB',Path(temp)/'corpus.sqlite3'):
    text='An original training sample has enough detail for independent auditing. '*8
    entries=[dict(text=text,label='human',group='test-a',source_id='trusted')]
    db=store.connect()
    try:
     with db:
      self.assertEqual(store.insert_rows(db,'en',entries),1)
      self.assertEqual(store.insert_rows(db,'en',entries),0)
      self.assertEqual(store.insert_rows(db,'en',[dict(entries[0],label='ai')]),0)
     counts=store.stats()['en']
     self.assertEqual(counts['counts'],{'human':1})
     self.assertEqual(counts['groups'],1)
     self.assertEqual(list(store.rows('en'))[0]['text'],text)
     self.assertEqual(db.execute('SELECT json_extract(metadata,\'$.source_id\') FROM examples').fetchone()[0],'trusted')
    finally:db.close()
 def test_frozen_holdout_cannot_be_imported(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp)
   folder=root/'admin_data/benchmark-en';folder.mkdir(parents=True)
   text='This is a reserved sample that can never be promoted from the evaluation set. '*8
   (folder/'heldout-test-en.jsonl').write_text(json.dumps({'text':text,'label':'human'})+'\n',encoding='utf-8')
   with patch.object(store,'ROOT',root),patch.object(store,'DB',root/'admin_data/corpus.sqlite3'):
    store._holdout_digests.cache_clear()
    db=store.connect()
    try:
     with db:self.assertEqual(store.insert_rows(db,'en',[{'text':text,'label':'human','group':'test-frozen'}]),0)
     self.assertEqual(db.execute('SELECT COUNT(*) FROM examples').fetchone()[0],0)
    finally:
     db.close();store._holdout_digests.cache_clear()
 def test_jsonl_import_incremental(self):
  with tempfile.TemporaryDirectory() as temp:
   with patch.object(store,'DB',Path(temp)/'corpus.sqlite3'):
    p=Path(temp)/'sample.jsonl'
    sample=dict(text='The independent reference excerpt was written before this particular language model existed. '*6,label='human',group='pre-2020')
    p.write_text(json.dumps(sample)+'\n',encoding='utf-8')
    self.assertEqual(store.import_jsonl('en',p),1)
    self.assertEqual(store.import_jsonl('en',p),0)
    self.assertEqual(store.stats()['en']['counts']['human'],1)
 def test_gpt_claude_heldout_never_enters_training(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);folder=root/'admin_data/benchmark-chatgpt-claude';folder.mkdir(parents=True)
   heldout='A source separated text from a GPT or Claude model used only for the external evaluation. '*7
   (folder/'en-external-heldout.jsonl').write_text(json.dumps({'text':heldout,'label':'ai','model':'gpt-4o'})+'\n')
   with patch.object(store,'ROOT',root),patch.object(store,'DB',root/'admin_data/corpus.sqlite3'):
    store._holdout_digests.cache_clear()
    db=store.connect()
    try:
     with db:self.assertEqual(store.insert_rows(db,'en',[{'text':heldout,'label':'ai','group':'heldout-test'}]),0)
     self.assertEqual(db.execute('SELECT COUNT(*) FROM examples').fetchone()[0],0)
    finally:db.close();store._holdout_digests.cache_clear()
if __name__=='__main__':unittest.main()
