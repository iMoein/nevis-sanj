import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const code=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
const context={console};vm.createContext(context);
vm.runInContext(code.slice(0,code.indexOf('var NevisApp;')),context);
const engine=context.NevisEngine;
const aiLines=[
 'در دنیای امروز، سازمان‌ها باید با دیدگاهی جامع و برنامه‌ریزی منسجم به فرایند توسعه محصول توجه کنند. علاوه بر این، تحلیل بازخورد و بهینه‌سازی فرایندها نقش مهمی در افزایش کیفیت دارند. بنابراین استفاده از رویکردهای نوآورانه یک فرصت ارزشمند برای ارتقای نتایج است.',
 'در عصر دیجیتال، مدیریت اثربخش نیازمند شناخت نیازهای مشتری و ایجاد همکاری میان تیم‌ها است. از سوی دیگر، تدوین شاخص‌ها و بررسی داده‌ها می‌تواند زمینه تصمیم‌گیری بهتر را فراهم کند. در نهایت می‌توان گفت مسیر موفقیت به یادگیری و سازگاری مداوم نیاز دارد.'
];
const humanLines=[
 'دیروز پیش از جلسه، سه بار فایل اکسل را باز کردم چون جمع سفارش‌های دو شعبه نمی‌خواند. پیام دادم که گزارش ساعت یازده دیر می‌رسد. بعد فهمیدم یکی از همکارها فیلتر مربوط به سفارش‌های لغوشده را فعال گذاشته است. همان‌جا اصلاح کردیم و عدد درست شد.',
 'صبح یکشنبه وقتی رسیدم شرکت برق رفته بود. لپ‌تاپم تنها سی دقیقه شارژ داشت و مشتری پشت خط منتظر مانده بود. از موبایل اینترنت دادم، فهرست خطاها را روی کاغذ نوشتم و قرار شد عصر دوباره تماس بگیریم. آن روز هیچ برنامه‌ای مطابق انتظار پیش نرفت.'
];
function corpus(){
 const out=[];
 const vocab=['کاربر','آمار','گزارش','مشتری','تیم','محصول','بازار','زمان','سفارش','پرداخت','پشتیبانی','جلسه','پروژه','مستندات','سیستم','خدمات','کارخانه','مدیریت','ارتباط','تصمیم','تحلیل','فروش','تجربه','بررسی','توسعه','امکان','پیام','اطلاع','تغییر','رویداد','قیمت','تعداد','کارگاه','شرکت','سفر','بازاریابی','فعالیت','فرایند','شاخص','مخاطب'];
 for(let i=0;i<35;i++) {
  let seed=(i+17)*104729; const topic=Array.from({length:240},()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return vocab[(seed>>>0)%vocab.length]}).join(' '); 
  out.push({text:('شناسه نمونه آزمایشی شماره '+i+' مربوط به گزارش سازمانی است. '+aiLines[i%2]+' '+ 'این روش به هماهنگی بیشتری نیاز دارد و به کسب‌وکارها در دستیابی به اهداف کمک می‌کند. '.repeat(i%4+3)+' '+topic),label:'ai',group:'topic-'+i});
  out.push({text:('این خاطره مربوط به پرونده تست شماره '+i+' است. '+humanLines[i%2]+' '+ 'قرار گذاشتیم نتیجه را صبح روز بعد با نمونه‌های واقعی دوباره چک کنیم تا اشتباه تکرار نشود. '.repeat(i%4+3)+' '+topic),label:'human',group:'topic-'+i});
 }
 return out;
}
test('source supplied labels parsed from CSV including quoted line breaks',()=>{
 const r=engine.parseLabeledData('text,label,group\n"'+corpus()[0].text.replaceAll('"','""')+'",ai,t-1\n"'+corpus()[1].text+'",human,t-1','test.csv');
 assert.equal(r.examples.length,2);assert.equal(r.skipped,0);assert.equal(r.examples[0].group,'t-1');
});
test('unsupported and empty imports fail without silently assuming AI',()=>{
 const r=engine.parseLabeledData('text,label\nhello,ai','test.csv');
 assert.equal(r.examples.length,0);assert.ok(r.error);
});
test('no model has no percentage, even on a known AI-style text',()=>{
 const p=engine.predictLocal(aiLines[0].repeat(3),null);
 assert.equal(p.score,null);assert.equal(p.available,false);
});
test('training checks separate labels and never supplies a model from one class',()=>{
 const r=engine.trainLocal(corpus().filter(x=>x.label==='ai'),'fa');
 assert.equal(r.model,null);assert.ok(r.error.includes('انسانی'));
});
test('local training builds a model, reserves topic groups for validation, and supports model export',()=>{
 const r=engine.trainLocal(corpus(),'fa');
 assert.ok(r.model,r.error);assert.ok(r.model.validationCount>=10);
 assert.equal(r.model.grouped,true);
 assert.ok(r.model.accuracy>=0 && r.model.accuracy<=1);
 assert.ok(r.model.falsePositiveRate>=0 && r.model.falsePositiveRate<=1);
 assert.equal(engine.isModel(JSON.parse(JSON.stringify(r.model))),true);
 const p=engine.predictLocal(aiLines[0].repeat(4),r.model);
 assert.equal(p.available,true);
 assert.ok(p.score>=0 && p.score<=100);
 const short=engine.predictLocal('متن کوتاه',r.model);assert.equal(short.score,null);
});
test('training does not allow a perfect-looking evaluation without separate topics',()=>{
 const r=engine.trainLocal(corpus().map(x=>({...x,group:'same-topic'})),'fa');
 assert.equal(r.model,null);assert.ok(r.error);
});
test('CSV parser handles malformed quotes as a visible error',()=>{
 const r=engine.parseLabeledData('text,label\n"broken,ai','labels.csv');
 assert.ok(r.error);
});
test('near-duplicate text across different declared groups cannot inflate validation',()=>{
 const a='در دنیای امروز هدف سازمان ها ایجاد هماهنگی و استفاده از فرصت های نوآوری است. این امر مستلزم تحلیل شرایط و استفاده از راهکارهای کارآمد می باشد. به همین دلیل باید فعالیت های مختلف را با دقت بررسی کرد و نتیجه نهایی را مستند ساخت. ';
 const h='دیشب مجبور شدم دوباره با همکارانم تماس بگیرم چون سفارش های ثبت شده در گزارش اشتباه بودند. تا صبح سه فایل را تطبیق دادم و فهمیدم مشکل از شرط وضعیت لغو است. بعد از اصلاح برنامه دوباره داده ها را بررسی کردیم و مسئله برطرف شد. ';
 const records=[];
 for(let i=0;i<35;i++){
   records.push({label:'ai',group:'g'+i,text:'سند شماره '+i+' '+a.repeat(3)});
   records.push({label:'human',group:'g'+i,text:'روایت شماره '+i+' '+h.repeat(3)});
 }
 const r=engine.trainLocal(records,'fa');
 assert.equal(r.model,null,'near duplicates must not be counted as fresh held-out evidence');
 assert.ok(r.error.includes('تکراری'));
});
