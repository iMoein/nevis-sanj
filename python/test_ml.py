import json, random, subprocess, sys, unittest
from pathlib import Path
from ml import features,load_dataset,train, prediction

ROOT=Path(__file__).resolve().parent.parent
class DetectorTests(unittest.TestCase):
    def test_inputs_and_no_fake_human_labels(self):
        t='در این پروژه برای بررسی نمونه‌های جدید باید چند آزمایش مستقل انجام بدهیم. '*8
        rows,skipped=load_dataset(json.dumps({'text':t,'label':'ai','group':'g'},ensure_ascii=False)+'\n','sample.jsonl')
        self.assertEqual(rows[0]['label'],'ai');self.assertEqual(skipped,0)
    def test_python_javascript_feature_parity(self):
        samples=['در دنیای امروز فناوری نوین به جای کلمات کلی از مثال‌های دقیق استفاده می‌کند. '*4,
                 'The project review includes careful comparison of outcomes and examples across many separate writing samples. '*4]
        js="""const fs=require('fs'),vm=require('vm');const s=fs.readFileSync('dist/app.js','utf8');const c={console};vm.createContext(c);vm.runInContext(s.slice(0,s.indexOf('var NevisApp;')),c);let texts=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(texts.map(t=>c.NevisEngine.browserFeatures(t))));"""
        out=subprocess.run(['node','-e',js],input=json.dumps(samples,ensure_ascii=False),text=True,cwd=ROOT,capture_output=True,check=True)
        jsvalues=json.loads(out.stdout)
        for s,v in zip(samples,jsvalues):
            py=features(s);foreign={int(k):val for k,val in v}
            self.assertEqual(set(py),set(foreign))
            for k in py:self.assertAlmostEqual(py[k],foreign[k],places=9)
    def test_fit_and_evaluation_on_mock_labels_only(self):
        # Synthetic data only tests the pipeline; it is NEVER shipped as real labelled corpus.
        rng=random.Random(44);words=['ابر','آب','مدرسه','قطار','هوا','کارخانه','رودخانه','کتاب','درخت','کلاس','سازه','مزرعه','آسمان','شهر','آزمایش','ساعت','محله','دانشگاه','جاده','ورزش','گزارش','رنگ','صدا','اتاق','پروژه','کاربر','کاغذ','موسسه','تصویر','زمان','بازار']
        records=[]
        for i in range(40):
            for label in ('ai','human'):
                vocab=' '.join(rng.choice(words) for _ in range(90))
                pattern=('از سوی دیگر این موضوع نقش مهمی ایفا می‌کند و در نهایت می‌توان گفت. ' if label=='ai' else 'دیروز صبح رفتم محل کار و با دوستم درباره آن صحبت کردم. ')
                text=(pattern*3)+vocab
                records.append({'text':text,'label':label,'group':'topic-'+str(i),'language':'fa'})
        model=train(records,'fa')
        self.assertEqual(model['schema'],2)
        self.assertGreaterEqual(model['metrics']['test_count'],10)
        self.assertEqual(len(model['weights']),2056)
        json.dumps(model)  # Must serialize with Python JSON for the private admin and Pages
        self.assertLessEqual(prediction(model,records[0]['text']),1)

if __name__=='__main__':unittest.main()
