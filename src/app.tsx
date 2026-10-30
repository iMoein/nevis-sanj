/** NevisSanj public product — detection flow only; no training or administration routes. */
namespace NevisApp {
  type State={value:string;report:NevisEngine.Analysis|null;busy:boolean;dark:boolean;models:{fa:NevisEngine.PublishedModel|null;en:NevisEngine.PublishedModel|null};status:string;error:string;hasAnalyzed:boolean;onnxScore:number|null};
  const sample='در دنیای امروز استفاده از فناوری‌های نوین در سازمان‌ها نقش مهمی ایفا می‌کند. از سوی دیگر، توجه به تجربه کاربران و تحلیل اطلاعات می‌تواند به تصمیم‌گیری بهتر منجر شود. با این حال، نمی‌توان برای همه کسب‌وکارها یک مسیر ثابت پیشنهاد کرد. انتخاب ابزار مناسب به اندازه تیم، نوع مسئله و محدودیت منابع بستگی دارد. علاوه بر این، مدیران باید میزان تأثیر تغییرات را با شاخص‌های مشخص بررسی کنند. در نهایت می‌توان گفت ترکیب برنامه‌ریزی دقیق، گفت‌وگو با کاربران و بازبینی مستمر نتایج، به ایجاد یک مسیر توسعه پایدار کمک خواهد کرد. این نمونه صرفاً برای نمایش فرایند تحلیل در نویس‌سنج تهیه شده است و نباید برای نتیجه‌گیری درباره منشأ قطعی متن به کار رود. کاربران می‌توانند با قراردادن یک متن تازه و طولانی‌تر، الگوهای نوشتار و ارزیابی مدل محلی را مشاهده کنند.';
  const labels={fa:'فارسی',en:'انگلیسی',mixed:'چندزبانه',unknown:'نامشخص'};
  export class App extends React.Component<{},State> {
    private upload:HTMLInputElement|null=null;
    constructor(props:{}) {
      super(props);
      this.state={value:'',report:null,busy:false,dark:false,models:{fa:null,en:null},status:'در حال بررسی مدل‌های منتشرشده...',error:'',hasAnalyzed:false,onnxScore:null};
    }
    componentDidMount(){ this.loadModels(); }
    async loadModels(){
      const fetched:{fa:NevisEngine.PublishedModel|null;en:NevisEngine.PublishedModel|null}={fa:null,en:null};
      for(const lang of ['fa','en'] as const){
        try{const res=await fetch('./models/'+lang+'.json',{cache:'no-store'});if(res.ok){const data=await res.json();if(NevisEngine.isPublishedModel(data)&&data.language===lang)fetched[lang]=data;}}
        catch(_){/* No model is a legitimate and visible state; never manufacture a percentage. */}
      }
      const count=Number(!!fetched.fa)+Number(!!fetched.en);
      this.setState({models:fetched,status:count?`${count.toLocaleString('fa-IR')} مدل فعال، آماده بررسی محلی`:'هنوز مدل آموزش‌دیده‌ای منتشر نشده؛ شواهد نگارشی قابل بررسی‌اند.'});
    }
    analyze=()=>{
      if(!this.state.value.trim()){this.setState({error:'ابتدا متن موردنظر را وارد کنید.'});return;}
      if(this.state.value.length>80000){this.setState({error:'برای تحلیل، حداکثر ۸۰ هزار نویسه وارد کنید.'});return;}
      const report=NevisEngine.analyze(this.state.value);
      this.setState({report,hasAnalyzed:true,error:'',busy:false,onnxScore:null});
      const lang=report.language;
      if((lang==='fa'||lang==='en')&&this.state.models[lang]){
        const requested=this.state.value;
        NevisEngine.predictOnnx(requested,lang).then(score=>{
          if(this.state.value===requested&&score!==null)this.setState({onnxScore:score});
        });
      }
    };
    fileChanged=(event:any)=>{
      const file:File|undefined=event.target.files&&event.target.files[0];
      if(!file)return;
      if(!/\.(txt|md)$/i.test(file.name)||file.size>400000){this.setState({error:'فقط فایل TXT یا MD با حجم حداکثر ۴۰۰ کیلوبایت مجاز است.'});return;}
      const reader=new FileReader();reader.onload=()=>this.setState({value:String(reader.result||''),report:null,hasAnalyzed:false,onnxScore:null,error:''});
      reader.onerror=()=>this.setState({error:'خواندن فایل ممکن نشد.'});reader.readAsText(file,'utf-8');event.target.value='';
    };
    exportReport=()=>{
      if(!this.state.report)return;
      const report=this.state.report;
      const lang=report.language==='fa'||report.language==='en'?report.language:null;
      const pred=lang?NevisEngine.publishedPredict(this.state.value,this.state.models[lang]):null;
      const text=`نویس‌سنج | گزارش تحلیل\nتعداد واژه: ${report.wordCount}\nزبان: ${labels[report.language]}\n${pred&&pred.score!==null?'امتیاز مدل: '+pred.score+' / 100':'نتیجه مدل: در دسترس نیست'}\nتوضیح: امتیاز طبقه‌بند اثبات منشأ متن نیست.\n\nشواهد متن:\n${report.findings.map(f=>'- '+f.title+': '+f.description).join('\n')}`;
      const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='nevis-sanj-report.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    render(){
      const {value,report,models,status,error,onnxScore}=this.state;
      const language=report?.language;
      const model=(language==='fa'||language==='en')?models[language]:null;
      const prediction=report&&(language==='fa'||language==='en')?NevisEngine.publishedPredict(value,model):null;
      const score=prediction?.score===null?null:onnxScore??prediction?.score??null;
      const finalVerdict=score===null?'unavailable':score>=65?'ai':score<=35?'human':'uncertain';
      const verdict=finalVerdict==='ai'?'شواهد مدل به نفع تولید ماشینی':finalVerdict==='human'?'شواهد مدل به نفع نگارش انسانی':finalVerdict==='uncertain'?'نتیجه مدل نامشخص':'مدل قابل استفاده نیست';
      return <div className="public-shell">
        <header className="pub-header"><div className="brand"><div className="logo-mark">ن</div><div><strong>نویس‌سنج</strong><small>تحلیل هوشمند نوشتار</small></div></div><div className="header-right"><span className="privacy"><span className="live-dot"/>پردازش متن روی دستگاه شما</span></div></header>
        <main className="pub-main">
          <section className="hero"><div className="eyebrow">NEVIS SANJ · WRITING INTELLIGENCE</div><h1>متن را عمیق‌تر بررسی کنید.</h1><p>نشانه‌های نوشتاری را کشف کنید و در صورت وجود مدل آموزش‌دیده، ارزیابی مستقل منشأ متن را ببینید.</p></section>
          <section className="workspace">
            <div className="panel input-panel"><div className="panel-head"><div><h2>متن برای تحلیل</h2><p>متن فارسی یا انگلیسی را وارد کنید.</p></div><span className="step">۰۱ / ورودی</span></div>
              <textarea className="pub-editor" dir="auto" value={value} onChange={(e:any)=>this.setState({value:(e.target as HTMLTextAreaElement).value,report:null,hasAnalyzed:false,onnxScore:null,error:''})} placeholder="متن خود را اینجا بنویسید یا جای‌گذاری کنید..." maxLength={80000}/>
              <div className="editor-footer"><span>{(value.match(/[\p{L}\p{N}]+/gu)||[]).length.toLocaleString('fa-IR')} واژه · {value.length.toLocaleString('fa-IR')} نویسه</span><div className="inline-actions"><input ref={(el:HTMLInputElement|null)=>this.upload=el} type="file" accept=".txt,.md,text/plain,text/markdown" onChange={this.fileChanged} style={{display:'none'}}/><button className="text-button" onClick={()=>this.upload?.click()}>بارگذاری فایل</button><button className="text-button" onClick={()=>this.setState({value:sample,report:null,hasAnalyzed:false,onnxScore:null,error:''})}>متن نمونه</button><button className="text-button" onClick={()=>this.setState({value:'',report:null,hasAnalyzed:false,onnxScore:null,error:''})}>پاک‌کردن</button></div></div>
              {error?<p className="form-error" role="alert">{error}</p>:null}
              <button className="primary-button" onClick={this.analyze} disabled={!value.trim()}>بررسی متن <span>←</span></button>
            </div>
            <div className="panel result-panel"><div className="panel-head"><div><h2>نتیجه بررسی</h2><p>خروجی مستقل و شفاف تحلیل</p></div><span className="step">۰۲ / نتیجه</span></div>
              {!report?<div className="empty-result"><div className="empty-glyph">◎</div><h3>هنوز متنی تحلیل نشده</h3><p>متن را وارد کنید و دکمه بررسی را بزنید. نتیجه در همین بخش نمایش داده می‌شود.</p></div>:<div className="analysis-content">
                <div className={'verdict '+(score===null?'no-model':finalVerdict)}><div className="verdict-top"><span>ارزیابی منشأ متن</span><span className="tiny">مدل {labels[language!]}</span></div>
                <strong>{verdict}</strong>{score!==null?<><div className="score-line"><b>{score!.toLocaleString('fa-IR')}<small> / ۱۰۰</small></b><span>{onnxScore!==null?'پردازش ONNX در مرورگر':'امتیاز مدل؛ نه احتمال قطعی'}</span></div><div className="meter"><div style={{width:score+'%'}}/></div></>:<p className="no-model-text">{prediction?.reason||'برای متن ترکیبی، مدل منتشرشده در دسترس نیست.'}</p>}
                </div><div className="report-stats"><div><strong>{report.wordCount.toLocaleString('fa-IR')}</strong><span>واژه</span></div><div><strong>{report.findings.length.toLocaleString('fa-IR')}</strong><span>نشانه</span></div><div><strong>{labels[report.language]}</strong><span>زبان</span></div></div>
                <div className="section-label">شواهد قابل بررسی</div><div className="findings">{report.findings.length?report.findings.slice(0,8).map(f=><article className="finding" key={f.id}><div className="finding-top"><b>{f.title}</b><span>{f.hits.length?f.hits.length.toLocaleString('fa-IR')+' مورد':'الگوی ساختاری'}</span></div><p>{f.description}</p>{f.hits.length?<blockquote dir="auto">«{f.hits[0].text.slice(0,150)}»</blockquote>:null}</article>):<p className="muted">در این متن، نشانه قابل‌گزارشی از قواعد فعلی پیدا نشد. این به معنای انسانی‌بودن متن نیست.</p>}</div>
                <button className="secondary-button" onClick={this.exportReport}>دریافت گزارش متنی</button>
              </div>}
            </div>
          </section>
          <div className="status-line"><span className="status-bullet"/>{status}</div><p className="disclaimer">نتیجه نویس‌سنج صرفاً یک ارزیابی آماری و زبانی است و برای اثبات هویت نویسنده یا تصمیم‌های تنبیهی و حقوقی کافی نیست.</p>
        </main><footer className="pub-footer">نویس‌سنج <span>© ۲۰۲۶</span><span>·</span> نسخه ۲.۴.۰</footer>
      </div>;
    }
  }
  ReactDOM.render(<App/>,document.getElementById('root'));
}
