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
 def test_jsonl_import_incremental(self):
  with tempfile.TemporaryDirectory() as temp:
   with patch.object(store,'DB',Path(temp)/'corpus.sqlite3'):
    p=Path(temp)/'sample.jsonl'
    sample=dict(text='The independent reference excerpt was written before this particular language model existed. '*6,label='human',group='pre-2020')
    p.write_text(json.dumps(sample)+'\n',encoding='utf-8')
    self.assertEqual(store.import_jsonl('en',p),1)
    self.assertEqual(store.import_jsonl('en',p),0)
    self.assertEqual(store.stats()['en']['counts']['human'],1)
if __name__=='__main__':unittest.main()
