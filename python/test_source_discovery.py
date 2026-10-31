import json
from urllib.error import HTTPError
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import source_discovery as sd

class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.root=Path(self.tmp.name)
        self.patches=[patch.object(sd,'PRIVATE',self.root),patch.object(sd,'STORE',self.root/'source-registry.json'),patch.object(sd,'DEST',self.root/'discovered')]
        for p in self.patches:p.start()
    def tearDown(self):
        for p in reversed(self.patches):p.stop()
        self.tmp.cleanup()
    def mock_get(self,url,**kwargs):
        if '/api/datasets' in url:
            return [{'id':'safe/human-ai-sample','tags':['license:apache-2.0'],'downloads':20,'lastModified':'2026-10-01'},
                    {'id':'unsafe/ai-text-private-data','gated':True,'tags':['license:unknown']},
                    {'id':'someone/human-ai-text-new-data','tags':['license:cc-by-4.0']}]
        if '/splits?' in url:
            return {'splits':[{'config':'default','split':'train'}]}
        if '/rows?' in url:
            from urllib.parse import parse_qs,urlparse
            params=parse_qs(urlparse(url).query)
            offset=int(params['offset'][0]);size=int(params['length'][0]);rows=[]
            if offset==0:
                for i in range(min(size,8)):
                    label='ai' if i%2 else 'human'
                    text=('This is a full length description of a distinct topic from a verified ' +
                          'document source which has an explicit origin assigned to the writing. ' +
                          f'The content number {i} contains a unique example from the dataset and enough words. ')*2
                    rows.append({'row_idx':i,'row':{'text':text,'origin':label,'topic_id':str(i)}})
            return {'features':[{'name':'text'},{'name':'origin'}],'rows':rows,'num_rows_total':8}
        raise ValueError('Unexpected test URL '+url)
    def test_new_source_discovery_never_auto_approves(self):
        with patch.object(sd,'request_json',self.mock_get):
            found=sd.discover()
            self.assertEqual(found['added'],3)
            self.assertEqual(len(sd.load()['approved']),0)
            self.assertEqual(len(sd.load()['candidates']),3)
    def test_review_rejects_unlicensed_and_wrong_or_missing_labels(self):
        with patch.object(sd,'request_json',self.mock_get):sd.discover()
        data=dict(identifier='unsafe/ai-text-private-data',config='default',split='train',text_field='text',label_field='origin',ai_value='ai',human_value='human',confirmed_license=True,confirmed_provenance=True)
        with self.assertRaises(ValueError):sd.approve(**data)
        data['identifier']='safe/human-ai-sample';data['human_value']='ai'
        with self.assertRaises(ValueError):sd.approve(**data)
        data['human_value']='human';data['confirmed_provenance']=False
        with self.assertRaises(ValueError):sd.approve(**data)
    def test_approved_source_incrementally_ingests_only_explicit_labels(self):
        with patch.object(sd,'request_json',self.mock_get):
            sd.discover()
            p=sd.preview('safe/human-ai-sample')
            self.assertEqual(p['fields'],['text','origin'])
            sd.approve('safe/human-ai-sample',config='default',split='train',text_field='text',label_field='origin',ai_value='ai',human_value='human',confirmed_license=True,confirmed_provenance=True)
            run1=sd.ingest(max_rows_per_source=20)
            self.assertEqual(run1['added']['en'],8)
            run2=sd.ingest(max_rows_per_source=20)
            self.assertEqual(run2['added']['en'],0)
            rows=[json.loads(x) for x in (self.root/'discovered'/'training-en.jsonl').read_text().splitlines()]
            self.assertEqual(len(rows),8)
            self.assertEqual(set(x['label'] for x in rows),{'ai','human'})
            self.assertEqual({x['source_id'] for x in rows},{'safe/human-ai-sample'})
    def test_unverified_constant_label_cannot_be_approved(self):
        with patch.object(sd,'request_json',self.mock_get):
            sd.discover()
            with self.assertRaisesRegex(ValueError,'مدرک'):
                sd.approve('safe/human-ai-sample',config='default',split='train',
                    text_field='text',label_field='__constant_ai__',ai_value='ai',
                    human_value='human',confirmed_license=True,confirmed_provenance=True)

    def test_documented_ai_only_source_can_ingest_without_invented_human_labels(self):
        with patch.object(sd,'request_json',self.mock_get):
            sd.discover()
            trusted={'suggestion':{'mode':'ai','text_field':'text','ready':True},
                     'ingest_ready':True,'quality_warning':False,'measured_language':'en'}
            with patch.object(sd,'_preview_source',return_value=trusted):
                sd.approve('safe/human-ai-sample',config='default',split='train',
                    text_field='text',label_field='__constant_ai__',ai_value='ai',
                    human_value='human',confirmed_license=True,confirmed_provenance=True)
            result=sd.ingest(max_rows_per_source=20)
            self.assertEqual(result['added']['en'],8)
            rows=[json.loads(line) for line in (self.root/'discovered'/'training-en.jsonl').read_text().splitlines()]
            self.assertTrue(all(row['label']=='ai' for row in rows))
            self.assertFalse(any(row['label']=='human' for row in rows))

    def test_ai_provenance_requires_documentation_and_independent_row_evidence(self):
        rows=[{'text':'Synthetic generated example '+str(i)+' with plenty of text. '*8,
               'teacher':'gemini-3.5-flash-lite','source':'synth_v1'} for i in range(8)]
        card='Synthetic Persian pretraining corpus. Generated with Gemini 3.5 Flash-Lite.'
        result=sd.documented_single_class_source('safe/unknown',rows,'text',card=card)
        self.assertEqual(result['mode'],'ai')
        self.assertEqual(result['label_field'],'__constant_ai__')
        self.assertIsNone(sd.documented_single_class_source('safe/unknown',rows,'text',card='A Persian text corpus'))
        self.assertIsNone(sd.documented_single_class_source('safe/unknown',[
            {**r,'teacher':'','source':'unknown'} for r in rows],'text',card=card))

    def test_unavailable_dataset_viewer_returns_clear_error(self):
        def failing_get(url,**kwargs):
            if '/splits?' in url:return {'splits':[{'config':'default','split':'train'}]}
            if '/rows?' in url:raise HTTPError(url,500,'Internal Server Error',{},None)
            raise ValueError('unexpected URL')
        with patch.object(sd,'request_json',failing_get):
            with self.assertRaises(ValueError):
                sd.preview('safe/human-ai-sample')

    def test_explicit_label_mapping_and_ambiguous_values(self):
        a=sd.suggest_mapping(['text','origin'],[{'text':'hello','origin':'human'},{'text':'hi','origin':'ai'}])
        self.assertTrue(a['ready'])
        self.assertEqual((a['ai_value'],a['human_value']),('ai','human'))
        b=sd.suggest_mapping(['text','label'],[{'text':'hi','label':0},{'text':'hey','label':1}])
        self.assertFalse(b['ready'])
        self.assertEqual(b['observed_values'],['0','1'])
        self.assertFalse(sd.suggest_mapping(['text'],[{'text':'abc'}])['ready'])

    def test_source_requires_authentication_shows_useful_error(self):
        def auth_error(url,**kwargs):
            raise HTTPError(url,401,'Unauthorized',{},None)
        with patch.object(sd,'request_json',auth_error):
            with self.assertRaisesRegex(ValueError,'دسترسی'):
                sd.preview('safe/human-ai-sample')

    def test_first_rows_fallback_is_preview_only(self):
        def source_get(url,**kw):
            if '/splits?' in url:return {'splits':[{'config':'default','split':'train'}]}
            if '/rows?' in url:raise HTTPError(url,500,'viewer failed',{},None)
            if '/first-rows?' in url:
                return {'features':[{'name':'text'},{'name':'label','type':{'_type':'Value','dtype':'int64'}}],
                        'rows':[{'row':{'text':'Hello sample','label':1}},
                                {'row':{'text':'Another sample','label':0}}],
                        'num_rows_total':100}
            raise ValueError('unexpected '+url)
        with patch.object(sd,'request_json',source_get):
            result=sd.preview('safe/human-ai-sample')
        self.assertEqual(result['preview_method'],'first-rows')
        self.assertFalse(result['ingest_ready'])
        self.assertEqual(set(result['suggestion']['observed_values']),{'0','1'})
        self.assertTrue(result['suggestion']['binary_numeric'])
        self.assertFalse(result['suggestion']['ready'])

    def test_classlabel_names_can_map_numeric_labels_without_guess(self):
        fields=[{'name':'text'},{'name':'label',
                 'type':{'_type':'ClassLabel','names':['human','ai']}}]
        x=sd.suggest_mapping(['text','label'],
              [{'text':'example A','label':0},{'text':'example B','label':1}],fields)
        self.assertTrue(x['ready'])
        self.assertEqual(x['ai_value'],'1')
        self.assertEqual(x['human_value'],'0')
        self.assertEqual(x['evidence'],'class_label_metadata')

    def test_select_preview_samples_includes_both_classes(self):
        data=[{'label':'1','text':'A'} for _ in range(25)]+[{'label':'0','text':'B'}]
        samples=sd.select_preview_samples(data,'label',4)
        self.assertEqual({r['label'] for r in samples},{'0','1'})

    def test_documented_numeric_mapping_and_source_corroboration(self):
        self.assertEqual(sd.explicit_numeric_mapping('Classes: Binary (Human: 0, AI: 1)'),
                         {'human':'0','ai':'1'})
        self.assertEqual(sd.explicit_numeric_mapping('0 = Human written, 1 = AI generated'),
                         {'human':'0','ai':'1'})
        self.assertEqual(sd.explicit_numeric_mapping('Labels are zero and one'),None)
        rows=[{'label':'0','source':'human'},{'label':'0','source':'human'},
              {'label':'1','source':'ai'},{'label':'1','source':'ai'}]
        match=sd.row_metadata_mapping(rows,'label')
        self.assertEqual((match['human'],match['ai']),('0','1'))

    def test_undocumented_numeric_labels_are_not_auto_approved(self):
        dataset='safe/human-ai-sample'
        with patch.object(sd,'request_json',self.mock_get):sd.discover()
        with patch.object(sd,'_preview_source',return_value={
            'suggestion':{'ready':False,'ai_value':'','human_value':''}}):
            with self.assertRaisesRegex(ValueError,'مستند'):
                sd.approve(dataset,config='default',split='train',
                    text_field='text',label_field='label',ai_value='1',
                    human_value='0',confirmed_license=True,confirmed_provenance=True)

    def test_paired_source_mapping_and_balanced_ingestion(self):
        identifier='safe/human-ai-sample'
        with patch.object(sd,'request_json',self.mock_get):sd.discover()
        sentence='This is an authentic text example with enough tokens to qualify for the local training data pipeline. '
        records=[
            {'row_idx':i,'row':{
                'id':str(i),
                'human_text':sentence*6+'Human distinct topic '+str(i),
                'ai_text':sentence*6+'Machine generated variant '+str(i),
                'instructions':'Please write about topic '+str(i)}}
            for i in range(4)]
        def pair_get(url,**kw):
            if '/splits?' in url:return {'splits':[{'config':'default','split':'train'}]}
            if '/rows?' in url:
                from urllib.parse import parse_qs,urlparse
                q=parse_qs(urlparse(url).query)
                start=int(q.get('offset',['0'])[0]); length=int(q.get('length',['40'])[0])
                return {'features':[{'name':'id'},{'name':'human_text'},
                         {'name':'ai_text'},{'name':'instructions'}],
                        'rows':records[start:start+length],'num_rows_total':4}
            raise ValueError('unexpected URL: '+url)
        with patch.object(sd,'request_json',pair_get):
            prev=sd.preview(identifier)
            self.assertEqual(prev['suggestion']['mode'],'paired')
            self.assertTrue(prev['suggestion']['ready'])
            self.assertEqual(prev['usable_preview_rows'],4)
            args=dict(identifier=identifier,config='default',split='train',
                text_field='human_text',label_field='__paired__',ai_value='ai_text',
                human_value='human_text',confirmed_license=True,confirmed_provenance=True)
            with self.assertRaises(ValueError):
                sd.approve(**{**args,'ai_value':'not_ai_text'})
            sd.approve(**args)
            result=sd.ingest(max_rows_per_source=10,force=True)
            self.assertEqual(result['added']['en'],8)
            output=self.root/'discovered'/'training-en.jsonl'
            rows=[json.loads(x) for x in output.read_text().splitlines()]
            self.assertEqual({x['label'] for x in rows},{'human','ai'})
            self.assertEqual(len({x['group'] for x in rows}),4)
            self.assertEqual({n:sum(x['label']==n for x in rows) for n in ('human','ai')},
                {'human':4,'ai':4})
            self.assertEqual(sd.ingest(max_rows_per_source=10,force=True)['added']['en'],0)

    def test_paired_source_skips_incomplete_pairs(self):
        identifier='safe/human-ai-sample'
        with patch.object(sd,'request_json',self.mock_get):sd.discover()
        sentence='Authentic example containing enough words for feature extraction and text classification. '
        def pair_get(url,**kw):
            if '/splits?' in url:return {'splits':[{'config':'default','split':'train'}]}
            if '/rows?' in url:
                return {'features':[{'name':'human_text'},{'name':'ai_text'}],
                        'rows':[{'row_idx':0,'row':{'human_text':sentence*6,'ai_text':'tiny'}}],
                        'num_rows_total':1}
            raise ValueError('unexpected URL')
        with patch.object(sd,'request_json',pair_get):
            sd.approve(identifier,config='default',split='train',text_field='human_text',
                 label_field='__paired__',ai_value='ai_text',human_value='human_text',
                 confirmed_license=True,confirmed_provenance=True)
            self.assertEqual(sd.ingest(max_rows_per_source=10,force=True)['added']['en'],0)
            self.assertEqual(sd.load()['approved'][identifier]['rows_too_short'],1)

    def test_persian_discovery_language_hint_is_not_label(self):
        self.assertIn('persian-ai',sd.PERSIAN_QUERIES)
        self.assertIn('synthetic-persian',sd.PERSIAN_QUERIES)
        item=sd.compact({'id':'sample/persian-ai-writing','tags':['license:apache-2.0']})
        self.assertEqual(item['language_hint'],'fa')
        self.assertNotIn('language_measured',item)
        self.assertEqual(sd.source_language_hint({'id':'sample/general','tags':['language:fa']}),'fa')
        self.assertEqual(sd.source_language_hint({'id':'sample/general','tags':['language:en']}),'en')

    def test_measured_language_uses_text_not_repository_name(self):
        import sys
        rows=[{'text':'این یک جمله فارسی کامل است و می‌خواهیم زبان واقعی نمونه را اندازه بگیریم. '*5} for _ in range(9)]
        lang,count=sd.sample_language(rows,{'text_field':'text'})
        self.assertEqual(lang,'fa')
        self.assertEqual(count['fa'],9)
        other=[{'text':'This is English content written for the language detector. '*6} for _ in range(9)]
        self.assertEqual(sd.sample_language(other,{'text_field':'text'})[0],'en')

    def test_mixed_language_is_not_presented_as_persian(self):
        rows=([{'text':'این یک متن فارسی است '*8} for _ in range(4)]+
              [{'text':'This is a complete English sentence. '*8} for _ in range(6)])
        self.assertEqual(sd.sample_language(rows,{'text_field':'text'})[0],'mixed')

    def test_background_preflight_checks_only_licensed_persian(self):
        with patch.object(sd,'request_json',self.mock_get):sd.discover()
        state=sd.load()
        state['candidates']['good/persian-generated-corpus']={
            'id':'good/persian-generated-corpus','status':'pending',
            'gated':False,'license':'apache-2.0','language_hint':'fa'}
        state['candidates']['bad/persian-unknown-corpus']={
            'id':'bad/persian-unknown-corpus','status':'pending',
            'gated':False,'license':'cc-by-nc-4.0','language_hint':'fa'}
        sd.save(state)
        with patch.object(sd,'preview',return_value={'measured_language':'fa'}) as m:
            inspected=sd.inspect_persian_candidates(limit=2)
            self.assertEqual(len(inspected),1)
            m.assert_called_once_with('good/persian-generated-corpus')
        self.assertEqual(sd.load()['approved'],{})

    def test_dismissed_not_approved(self):
        with patch.object(sd,'request_json',self.mock_get):sd.discover()
        sd.reject('someone/human-ai-text-new-data')
        self.assertEqual(sd.load()['candidates']['someone/human-ai-text-new-data']['status'],'dismissed')
        self.assertEqual(sd.load()['approved'],{})

if __name__=='__main__':unittest.main()
