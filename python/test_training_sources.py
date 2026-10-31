import json,sqlite3,tempfile,unittest
from pathlib import Path
from training_sources import catalog,family

class TrainingSourceCatalogTests(unittest.TestCase):
 def test_labels_and_separate_holdout(self):
  with tempfile.TemporaryDirectory() as temporary:
   root=Path(temporary);dbfile=root/'corpus.sqlite3'
   con=sqlite3.connect(dbfile)
   con.execute('CREATE TABLE examples (digest TEXT PRIMARY KEY,language TEXT,label TEXT,group_id TEXT,text TEXT,metadata TEXT)')
   for i,(model,label) in enumerate([('gpt-4o','ai'),('claude-3-opus','ai'),('human','human')]):
    meta=json.dumps({'source_id':'artnitolog/llm-generated-texts','model':model})
    con.execute('INSERT INTO examples VALUES (?,?,?,?,?,?)',(str(i),'en',label,'prompt-1','sample '+str(i),meta))
   con.commit();con.close()
   held=root/'admin_data/benchmark-chatgpt-claude';held.mkdir(parents=True)
   held.joinpath('en-external-heldout.jsonl').write_text(
    json.dumps({'source_id':'artnitolog/llm-generated-texts','model':'claude-3-opus','label':'ai','text':'test only'})+'\n')
   output=catalog(root=root,db_path=dbfile)
   self.assertEqual(output['summary']['total'],3)
   self.assertEqual(output['summary']['holdout'],1)
   self.assertEqual(output['summary']['ai'],2)
   src=output['sources'][0]
   self.assertIn('تمایز',src['purpose'])
   self.assertEqual(src['counts']['human'],1)
   self.assertEqual(src['counts']['holdout'],1)
   self.assertEqual([(m['name'],m['holdout_count']) for m in src['models'] if m['name']=='claude-3-opus'],[('claude-3-opus',1)])
   self.assertNotIn('test only',str(output))
 def test_model_family_and_missing_database(self):
  self.assertEqual(family('gpt-4o'),'ChatGPT / OpenAI')
  self.assertEqual(family('claude-sonnet-4.x-unverified'),'Claude / Anthropic')
  self.assertEqual(family('gemini-3.7-flash'),'Gemini / Google')
  with tempfile.TemporaryDirectory() as temp:
   self.assertEqual(catalog(root=temp,db_path=Path(temp)/'missing.sqlite3')['sources'],[])
if __name__=='__main__':unittest.main()
