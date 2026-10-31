/** React + TypeScript UI. Compiled to a single, offline-friendly browser script. */
namespace NevisApp {
  const TEMPLATE_SAMPLE = `در دنیای امروز، فناوری هوش مصنوعی نقش کلیدی در تحول کسب‌وکارها ایفا می‌کند. با پیشرفت روزافزون فناوری، سازمان‌ها با چالش‌ها و فرصت‌های متعددی روبه‌رو هستند. در این راستا، استفاده از راهکارهای نوآورانه از اهمیت بالایی برخوردار است.

علاوه بر این، توجه به نیازهای کاربران امری ضروری است. این موضوع نه تنها به بهبود تجربه کاربری کمک می‌کند، بلکه همچنین بستر مناسبی برای رشد و توسعه فراهم می‌کند. بدون شک، سازمان‌هایی که از این ظرفیت بهره می‌برند، می‌توانند به نتایج بهتری دست پیدا کنند.

از سوی دیگر، پیاده‌سازی این رویکرد مستلزم برنامه‌ریزی دقیق است. در این راستا، ایجاد هماهنگی میان تیم‌ها نقش مهمی ایفا می‌کند. همچنین، بهره‌گیری از داده‌ها می‌تواند مسیر تصمیم‌گیری را بهبود ببخشد و فرصت‌های جدیدی ایجاد کند.

در نهایت می‌توان گفت که موفقیت در عصر دیجیتال نیازمند نگاه جامع و رویکردی منعطف است. به طور کلی، با توجه به اهمیت این موضوع، حرکت در مسیر تحول دیجیتال گامی مهم در راستای آینده‌ای بهتر خواهد بود.`;

  const NATURAL_SAMPLE = `سه‌شنبه قرار بود صفحه گزارش فروش را تحویل بدهیم. ساعت ۹ صبح فهمیدیم عدد سفارش‌های ثبت‌شده با خروجی حسابداری نمی‌خواند. اختلاف فقط ۱۷ سفارش بود، اما نمی‌شد آن را نادیده گرفت.

اول فکر کردم مسئله از منطقه زمانی سرور است. بعد از مقایسه شناسه سفارش‌ها مشخص شد چند سفارش لغوشده هنوز در کوئری گزارش حضور دارند. شرط وضعیت را اصلاح کردم و از همکارم خواستم داده‌های ۱۲ روز گذشته را دوباره بررسی کند.

تا ساعت ۲ بعدازظهر اختلاف به صفر رسید. چیزی که از این ماجرا یاد گرفتم این بود که «گزارش درست» فقط به نوشتن یک کوئری خوب ربط ندارد. باید پیش از انتشار، تعریف دقیق هر شاخص را با کسی که قرار است از آن تصمیم بگیرد، هماهنگ کنیم. برای گزارش بعدی هم یک تست ساده اضافه کردیم تا این اختلاف زودتر مشخص شود.`;

  type IconName = 'spark' | 'shield' | 'upload' | 'clipboard' | 'chevron' | 'download' | 'file' | 'moon' | 'sun' | 'zap' | 'scan' | 'info' | 'check' | 'alert' | 'refresh' | 'search' | 'pen' | 'layers' | 'quote' | 'lock' | 'arrow' | 'trash' | 'eye' | 'chart';
  const iconPaths: Record<IconName, string[]> = {
    spark: ['M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3Z','M19.5 18.5l.65 1.35 1.35.65-1.35.65-.65 1.35-.65-1.35-1.35-.65 1.35-.65.65-1.35Z'],
    shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z','m9 12 2 2 4-4'],
    upload: ['M12 16V3','m6 9 6-6 6 6','M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3'],
    clipboard: ['M9 4h6','M9 2h6v4H9z','M7 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1','M8 11h8','M8 15h8'],
    chevron: ['m9 18 6-6-6-6'], download: ['M12 3v12','m7 10 5 5 5-5','M5 17v3h14v-3'],
    file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z','M14 2v6h6','M8 13h8','M8 17h8'],
    moon: ['M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z'],
    sun: ['M12 2v2','M12 20v2','m4.93-17.07-1.42 1.42','m-9.9 9.9-1.42 1.42','M2 12h2','M20 12h2','m4.93 4.93-1.42-1.42','m-9.9-9.9-1.42-1.42','M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z'],
    zap: ['m13 2-3 8H4l7 12 3-9h6L13 2Z'],
    scan: ['M4 9V5a1 1 0 0 1 1-1h4','M15 4h4a1 1 0 0 1 1 1v4','M20 15v4a1 1 0 0 1-1 1h-4','M9 20H5a1 1 0 0 1-1-1v-4','M8 10h8','M8 14h6'],
    info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z','M12 11v5','M12 8h.01'],
    check: ['m5 12 4 4L19 6'],
    alert: ['M12 3 2 21h20L12 3Z','M12 9v5','M12 18h.01'],
    refresh: ['M20 11a8 8 0 0 0-14.5-4.5L3 9','M3 4v5h5','M4 13a8 8 0 0 0 14.5 4.5L21 15','M21 20v-5h-5'],
    search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z','m21 21-4.35-4.35'],
    pen: ['m14 4 6 6','M4 20l4.5-1 12-12a2.12 2.12 0 0 0-3-3l-12 12L4 20Z'],
    layers: ['m12 2 9 5-9 5-9-5 9-5Z','m3 12 9 5 9-5','m3 17 9 5 9-5'],
    quote: ['M8 10H4a1 1 0 0 0-1 1v7h6v-7H6c0-3 1-4 3-5','M19 10h-4a1 1 0 0 0-1 1v7h6v-7h-3c0-3 1-4 3-5'],
    lock: ['M5 11h14v10H5z','M8 11V7a4 4 0 0 1 8 0v4'],
    arrow: ['M19 12H5','m12 19-7-7 7-7'],
    trash: ['M3 6h18','M8 6V4h8v2','M6 6l1 15h10l1-15','M10 10v7','M14 10v7'],
    eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z','M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
    chart: ['M4 20V12','M10 20V7','M16 20V4','M22 20H2']
  };
  function Icon(props: { name: IconName; size?: number; className?: string }): any {
    const paths = iconPaths[props.name];
    return <svg aria-hidden="true" className={props.className || ''} width={props.size || 18} height={props.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths.map((d, idx) => <path key={idx} d={d}/>)}</svg>;
  }
  type AppState = {
    text: string;
    report: NevisEngine.Analysis;
    activeId: string | null;
    theme: 'light' | 'dark';
    message: string;
    tab: 'all' | 'notable';
    isStale: boolean;
    referenceText: string;
    referenceStyle: NevisEngine.StyleProfile | null;
    referenceStale: boolean;
    models: { fa: NevisEngine.PublishedModel | null; en: NevisEngine.PublishedModel | null };
    modelStatus: string;
    rewriteStrength: number;
    rewriteOrigin: NevisRewrite.Origin;
    rewriteResult: NevisRewrite.Result | null;
    rewriteDraft: string;
    rewriteConfirmed: boolean;
    rewriteAdopted: boolean;
    rewriteLineage: NevisRewrite.Result['provenance'] | null;
  };
  const LANG_LABEL: Record<NevisEngine.Language, string> = { fa: 'فارسی', en: 'انگلیسی', mixed: 'ترکیبی', unknown: 'نامشخص' };
  const CATEGORY_LABEL: Record<NevisEngine.Category, string> = {
    cliche: 'عبارت‌های قالبی', transition: 'پیوندهای متنی', repetition: 'تکرار', structure: 'ساختار', 'self-reference': 'خودارجاعی', specificity: 'جزئیات و شواهد', rhetoric: 'الگوهای بلاغی', attribution: 'ارجاع‌های مبهم', formatting: 'قالب‌بندی', residue: 'ردپای فنی و مکالمه'
  };
  const SEVERITY_LABEL: Record<NevisEngine.Severity, string> = { high: 'پررنگ', medium: 'متوسط', low: 'ضعیف' };
  const LEVEL_LABEL: Record<NevisEngine.Analysis['level'], string> = { insufficient: 'متن کوتاه', low: 'نشانه‌های محدود', medium: 'نیازمند بررسی', high: 'نشانه‌های متعدد' };

  function IconButton(props: { icon: IconName; children: any; onClick: () => void; disabled?: boolean; className?: string; title?: string }): any {
    return <button type="button" title={props.title} className={'small-button ' + (props.className || '')} onClick={props.onClick} disabled={props.disabled}><Icon name={props.icon} size={16}/>{props.children}</button>;
  }

  function shortNumber(n: number): string { return n.toLocaleString('fa-IR'); }
  function textTokens(input: string): number { return (input.match(/[\p{L}\p{N}]+(?:[\u200c'’-][\p{L}\p{N}]+)*/gu) || []).length; }

  export class App extends React.Component<{}, AppState> {
    private fileInput: HTMLInputElement | null = null;
    private editor: HTMLTextAreaElement | null = null;
    constructor(props: {}) {
      super(props);
      let theme: 'light' | 'dark' = 'light';
      try { if (localStorage.getItem('nevis-sanj-theme') === 'dark') theme = 'dark'; } catch (_) { /* Restricted browser storage. */ }
      const text = TEMPLATE_SAMPLE;
      const models: {fa:NevisEngine.PublishedModel|null;en:NevisEngine.PublishedModel|null}={fa:null,en:null};
      this.state={text,report:NevisEngine.analyze(text),activeId:null,theme,message:'',tab:'all',isStale:false,
        referenceText:'',referenceStyle:null,referenceStale:false,models,modelStatus:'در حال بررسی مدل‌ها...',
        rewriteStrength:45,rewriteOrigin:'unknown',rewriteResult:null,rewriteDraft:'',rewriteConfirmed:false,rewriteAdopted:false,rewriteLineage:null};
      this.applyTheme(theme);
    }
    componentDidMount() { this.loadPublishedModels(); }
    private loadPublishedModels=async()=>{
      const models:{fa:NevisEngine.PublishedModel|null;en:NevisEngine.PublishedModel|null}={fa:null,en:null};
      for(const lang of ['fa','en'] as const) {
        try {
          const response=await fetch('./models/'+lang+'.json',{cache:'no-store'});
          if(!response.ok)continue;
          const model=await response.json();
          if(NevisEngine.isPublishedModel(model)&&model.language===lang)models[lang]=model;
        }catch(err){console.warn('مدل منتشرشده در دسترس نیست',lang,err);}
      }
      const count=Number(!!models.fa)+Number(!!models.en);
      this.setState({models,modelStatus:count?`${count.toLocaleString('fa-IR')} مدل آماده تحلیل است`:'مدل منشأ متن برای این زبان هنوز منتشر نشده است.'});
    };
    private downloadContent(content:string, filename:string, mime:string) {
      const blob=new Blob([content],{type:mime+';charset=utf-8'});const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),500);
    }
    private applyTheme(theme: 'light' | 'dark') { document.documentElement.setAttribute('data-theme', theme); }
    private setText = (value: string) => {
      this.setState({ text: value.slice(0, 40000), isStale: true, activeId: null, message: '',rewriteResult:null,rewriteDraft:'',rewriteConfirmed:false });
    };
    private analyzeNow = () => {
      const report = NevisEngine.analyze(this.state.text);
      this.setState({ report, isStale: false, activeId: null, message: '', tab: 'all' });
    };
    private useSample = (kind: 'template' | 'natural') => {
      const text = kind === 'template' ? TEMPLATE_SAMPLE : NATURAL_SAMPLE;
      this.setState({ text, report: NevisEngine.analyze(text), activeId: null, tab: 'all', isStale: false, message: '',rewriteResult:null,rewriteDraft:'',rewriteConfirmed:false,rewriteAdopted:false,rewriteLineage:null });
    };
    private updateReference = (value: string) => {
      this.setState({ referenceText: value.slice(0, 40000), referenceStale: true });
    };
    private compareReference = () => {
      const { referenceText, report, isStale } = this.state;
      if (isStale) { this.setState({ message: 'ابتدا متن اصلی را دوباره تحلیل کنید.' }); return; }
      const language = NevisEngine.analyze(referenceText).language;
      this.setState({ referenceStyle: NevisEngine.getStyleProfile(referenceText, language), referenceStale: false, message: '' });
    };
    private toggleTheme = () => {
      const theme = this.state.theme === 'light' ? 'dark' : 'light';
      this.applyTheme(theme);
      try { localStorage.setItem('nevis-sanj-theme', theme); } catch (_error) { /* Private browsing may disallow storage. */ }
      this.setState({ theme });
    };
    private loadFile = (event: any) => {
      const file: File | undefined = event.target.files && event.target.files[0];
      if (!file) return;
      if (!/\.(txt|md|markdown)$/i.test(file.name) && !/^text\//i.test(file.type)) {
        this.setState({ message: 'فقط فایل متنی TXT یا Markdown قابل بارگذاری است.' });
        event.target.value = '';
        return;
      }
      if (file.size > 200000) {
        this.setState({ message: 'حجم فایل زیاد است. حداکثر ۲۰۰ کیلوبایت مجاز است.' });
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const source = String(reader.result || '').replace(/^\uFEFF/, '');
        const text = source.slice(0, 40000);
        this.setState({ text, report: NevisEngine.analyze(text), isStale: false, activeId: null, tab: 'all', message: source.length > 40000 ? 'فقط ۴۰ هزار نویسه اول فایل بررسی شد.' : `فایل «${file.name}» در مرورگر خوانده شد.`,rewriteResult:null,rewriteDraft:'',rewriteConfirmed:false,rewriteAdopted:false,rewriteLineage:null });
      };
      reader.onerror = () => this.setState({ message: 'خواندن فایل موفق نبود. دوباره تلاش کنید.' });
      reader.readAsText(file, 'UTF-8');
      event.target.value = '';
    };
    private paste = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) this.setText(text);
      } catch (_err) {
        this.setState({ message: 'اجازه خواندن کلیپ‌بورد صادر نشد؛ از Ctrl+V یا Cmd+V استفاده کنید.' });
        if (this.editor) this.editor.focus();
      }
    };
    private download = (type: 'txt' | 'json') => {
      const { report } = this.state;
      const { index: _internalLegacyIndex, ...exportReport } = report;
      const content = type === 'json' ? JSON.stringify({
        application: 'NevisSanj', version: '2.5.0', disclaimer: 'Not an AI authorship probability',
        createdAt: new Date().toISOString(), report: exportReport, rewriteProvenance:this.state.rewriteLineage, modelAssessment: NevisEngine.publishedPredict(report.text, this.state.models[report.language === 'fa' || report.language === 'en' ? report.language : 'fa'])
      }, null, 2) : NevisEngine.createReadableReport(report)+(this.state.rewriteLineage?'\n\nیادداشت منشأ: متن با موتور ویرایش قاعده‌محور اصلاح شده؛ منشأ اولیه '+(this.state.rewriteLineage.originalOrigin==='ai'?'طبق اعلام کاربر AI بوده است.':this.state.rewriteLineage.originalOrigin==='human'?'طبق اعلام کاربر انسانی بوده است.':'نامشخص است.'):'');
      const blob = new Blob([content], { type: type === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nevis-sanj-report.${type}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    };
    private copySummary = async () => {
      try {
        await navigator.clipboard.writeText(NevisEngine.createReadableReport(this.state.report)+(this.state.rewriteLineage?'\n\nاین متن با ابزار ویرایش شده و منشأ اولیه تغییر نکرده است.':''));
        this.setState({ message: 'گزارش در کلیپ‌بورد کپی شد.' });
      } catch (_err) { this.setState({ message: 'کپی خودکار ممکن نیست؛ از گزینه دانلود گزارش استفاده کنید.' }); }
    };
    private runRewrite = () => {
      const {text,rewriteStrength,rewriteOrigin}=this.state;
      if(!/[آ-ی؀-ۿ]/u.test(text)){
        this.setState({message:'بازنویسی نسخه اول فقط برای متن فارسی در دسترس است.'});return;
      }
      const result=NevisRewrite.rewrite(text,rewriteStrength,rewriteOrigin);
      this.setState({rewriteResult:result,rewriteDraft:result.text,rewriteConfirmed:false,message:''});
    };
    private updateRewriteDraft = (value:string) => {
      this.setState({rewriteDraft:value.slice(0,40000),rewriteConfirmed:false});
    };
    private applyRewrite = () => {
      const {rewriteResult,rewriteDraft,rewriteConfirmed}=this.state;
      if(!rewriteResult||!rewriteConfirmed||!NevisRewrite.review(rewriteResult.original,rewriteDraft).ok)return;
      this.setState({text:rewriteDraft,report:NevisEngine.analyze(rewriteDraft),
        isStale:false,activeId:null,tab:'all',rewriteAdopted:true,
        message:'متن ویرایش‌شده جایگزین شد؛ منشأ اولیه به متن انسانی تبدیل نشده است.',rewriteLineage:rewriteResult.provenance});
    };
    private exportRewrite = () => {
      const {rewriteResult,rewriteDraft,rewriteConfirmed}=this.state;
      if(!rewriteResult||!rewriteConfirmed)return;
      const quality=NevisRewrite.review(rewriteResult.original,rewriteDraft);
      if(!quality.ok)return;
      this.downloadContent(JSON.stringify({
        application:'NevisSanj',version:'rewrite-mvp-1',
        original:rewriteResult.original,revised:rewriteDraft,
        style:rewriteResult.style,strength:rewriteResult.strength,
        changes:rewriteResult.changes,quality,
        provenance:rewriteResult.provenance,
        humanReviewed:true,manuallyEdited:rewriteDraft!==rewriteResult.text,
        notice:'ویرایش با کمک ابزار، نه اثبات نویسندگی انسان یا تغییر منشأ AI'
      },null,2),'nevis-sanj-rewrite.json','application/json');
    };
    private setActive = (id: string) => {
      this.setState({ activeId: id });
      const el = document.getElementById('evidence-preview');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    private renderAnnotatedText(): any {
      const { report, activeId } = this.state;
      const spans: { start: number; end: number; finding: NevisEngine.Finding }[] = [];
      report.findings.forEach(finding => finding.hits.forEach(hit => {
        if (hit.end > hit.start) spans.push({ start: hit.start, end: hit.end, finding });
      }));
      if (spans.length === 0) return <span>{report.text || 'متنی برای نمایش وجود ندارد.'}</span>;
      const points = Array.from(new Set([0, report.text.length, ...spans.flatMap(s => [s.start, s.end])])).sort((a, b) => a - b);
      const segments: any[] = [];
      let previousId = '';
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i]; const end = points[i + 1];
        if (start === end) continue;
        const active = spans.filter(s => s.start <= start && s.end >= end);
        active.sort((a, b) => (a.finding.id === activeId ? -1 : 0) - (b.finding.id === activeId ? -1 : 0) || (a.finding.severity === 'high' ? -1 : 0) - (b.finding.severity === 'high' ? -1 : 0));
        const finding = active[0] && active[0].finding;
        const content = report.text.slice(start, end);
        const id = finding ? finding.id : '';
        if (!finding) segments.push(<span key={i}>{content}</span>);
        else segments.push(<mark title={`${finding.title} — برای مشاهده انتخاب کنید`} tabIndex={0} role="button" key={i} onClick={() => this.setActive(finding.id)} onKeyDown={(e: any) => { if (e.key === 'Enter') this.setActive(finding.id); }} className={`marker ${finding.severity} ${activeId === id ? 'selected' : ''} ${previousId === id ? 'continuous' : ''}`}>{content}</mark>);
        previousId = id;
      }
      return segments;
    }

    render(): any {
      const { text, report, activeId, theme, message, tab, isStale, referenceText, referenceStyle, referenceStale, models, modelStatus,
        rewriteStrength,rewriteOrigin,rewriteResult,rewriteDraft,rewriteConfirmed,rewriteAdopted,rewriteLineage } = this.state;
      const rewriteQuality=rewriteResult?NevisRewrite.review(rewriteResult.original,rewriteDraft):null;
      const comparison = referenceStyle && !referenceStale && !isStale ? NevisEngine.compareStyleProfiles(report.style, referenceStyle) : null;
      const findings = report.findings.filter(f => tab === 'all' || f.severity !== 'low');
      const active = report.findings.find(f => f.id === activeId) || null;
      const hasText = text.trim().length > 0;
      const localModel=report.language==='fa'||report.language==='en'?models[report.language]:null;
      const modelPrediction=NevisEngine.publishedPredict(report.text,localModel);
      const prediction={available:modelPrediction.score!==null,score:modelPrediction.score,
        verdict:modelPrediction.verdict,explanation:modelPrediction.reason};
      return <div className="app-root">
        <header className="header">
          <div className="shell header-inner">
            <a className="brand" href="#top" aria-label="صفحه اصلی نویس‌سنج">
              <span className="brand-mark"><Icon name="scan" size={23}/></span>
              <span><strong>نویس‌سنج</strong><small>تحلیل هوشمند سبک نوشتار</small></span>
            </a>
            <nav className="nav-links" aria-label="پیوندهای صفحه"><a href="#workspace" className="nav-current">آزمایش متن</a><a href="#natural-rewrite">بازنویسی فارسی</a><a href="#method">روش تحلیل</a><a href="#limitations">محدودیت‌ها</a></nav>
            <div className="header-actions"><span className="offline-indicator"><span></span> کاملا محلی</span><button type="button" className="theme-button" onClick={this.toggleTheme} title={theme === 'light' ? 'فعال‌کردن حالت تاریک' : 'فعال‌کردن حالت روشن'} aria-label="تغییر تم"><Icon name={theme === 'light' ? 'moon' : 'sun'} size={19}/></button></div>
          </div>
        </header>
        <main id="top" className="shell">
          <section className="hero">
            <div className="hero-content">
              <div className="hero-kicker"><span className="kicker-dot"></span> تحلیل چندلایه نوشتار <span className="kicker-sep">/</span> WRITING FORENSICS</div>
              <h1>ردپای <span>هوش مصنوعی</span> را<br className="desktop-break"/> در نوشتار بررسی کن.</h1>
              <p>الگوهای زبانی، ریتم جملات و ویژگی‌های آماری نوشتار را در یک گزارش روشن و کاربردی بررسی کنید.</p>
              <div className="hero-tags"><span><Icon name="shield" size={15}/> حریم خصوصی پیش‌فرض</span><span><Icon name="layers" size={15}/> فارسی و انگلیسی</span><span><Icon name="zap" size={15}/> بدون API</span></div>
            </div>
            <div className="hero-decoration" aria-hidden="true"><div className="orb orb-outer"></div><div className="orb orb-mid"></div><div className="orb orb-inner"><Icon name="scan" size={40}/></div><span className="orbit-dot dot-one"></span><span className="orbit-dot dot-two"></span><span className="orbit-line line-one"></span><span className="orbit-line line-two"></span></div>
          </section>

          <div className="section-heading" id="workspace"><div><span className="section-number">01 /</span><h2>فضای تحلیل متن</h2><p>متن مورد نظر را وارد کنید یا از نمونه‌های آماده استفاده کنید.</p></div><div className="section-hint"><Icon name="lock" size={16}/> متن در مرورگر شما پردازش می‌شود</div></div>

          <section className="workspace" aria-label="فضای تحلیل">
            <div className="panel editor-panel">
              <div className="panel-header"><div className="panel-title"><span className="panel-icon"><Icon name="pen" size={18}/></span><div><h3>متن ورودی</h3><span>مقاله، پست یا هر نوع نوشته را برای تحلیل وارد کنید.</span></div></div><span className="tiny-tag">تحلیل چندلایه · تا ۴۰ هزار نویسه</span></div>
              <div className="editor-tools"><div className="tool-group"><IconButton icon="upload" onClick={() => this.fileInput && this.fileInput.click()}>بارگذاری فایل</IconButton><IconButton icon="clipboard" onClick={this.paste}>چسباندن متن</IconButton></div><IconButton icon="trash" onClick={() => this.setText('')} disabled={!hasText}>پاک کردن</IconButton></div>
              <input ref={(el: HTMLInputElement) => { this.fileInput = el; }} type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" onChange={this.loadFile} hidden />
              <div className="textarea-wrap"><textarea ref={(el: HTMLTextAreaElement) => { this.editor = el; }} spellCheck={false} dir="auto" placeholder="متن فارسی یا انگلیسی مورد نظر را وارد کنید..." value={text} maxLength={40000} onChange={(e: any) => this.setText(e.target.value)} aria-label="متن ورودی برای تحلیل" /></div>
              <div className="text-toolbar"><div className="text-metrics"><span><strong>{shortNumber(textTokens(text))}</strong> واژه</span><span><strong>{shortNumber(text.length)}</strong> نویسه</span></div><span className="editor-hint">TXT / MD / متن ساده</span></div>
              <div className="sample-row"><span>آزمایش سریع:</span><button onClick={() => this.useSample('template')} type="button" className="sample-pill"><Icon name="file" size={14}/> متن قالبی</button><button onClick={() => this.useSample('natural')} type="button" className="sample-pill"><Icon name="quote" size={14}/> متن روایی</button></div>
              <div className="editor-bottom"><div className="small-note"><Icon name="info" size={16}/> برای پروفایل آماری بهتر، حداقل ۱۵۰ واژه وارد کن.</div><button type="button" className="primary-button" disabled={!hasText || (!isStale && report.text === text)} onClick={this.analyzeNow}><Icon name={isStale ? 'scan' : 'check'} size={19}/>{isStale ? 'تحلیل متن' : 'تحلیل انجام شد'}<Icon name="arrow" size={18}/></button></div>
              {message && <div className="inline-toast" role="status"><Icon name="info" size={16}/>{message}</div>}
            </div>

            <aside className={`panel results-panel ${isStale ? 'is-stale' : ''}`} aria-label="خلاصه نتایج">
              <div className="panel-header"><div className="panel-title"><span className="panel-icon"><Icon name="chart" size={18}/></span><div><h3>خلاصه تحلیل</h3><span>بررسی نشانه‌ها و ویژگی‌های متن</span></div></div><span className="report-state"><span></span>{isStale ? 'نیازمند تحلیل مجدد' : 'به‌روز'}</span></div>
              <div className="local-verdict" aria-live="polite">
                <div className="local-verdict-label"><Icon name="scan" size={18}/><strong>ارزیابی منشأ با مدل محلی</strong></div>
                {prediction.available ? <div className="prediction-available"><div className="local-score"><strong>{shortNumber(prediction.score || 0)}<small> / ۱۰۰</small></strong><span>امتیاز مدل آموزش‌دیده، نه احتمال قطعی</span></div>
                  <div className="local-bar"><span style={{width:`${prediction.score}%`}} /></div>
                  <div className="local-status">{prediction.verdict==='ai'?'نشانه به نفع متن ماشینی':prediction.verdict==='human'?'نشانه به نفع متن انسانی':'نتیجه نامشخص'}</div>
                  <p>{prediction.explanation}</p>
                  {localModel && localModel.language==='fa' && (localModel.metrics.test_human||0)<30 && <p role="status">هشدار: مدل فارسی فعلی فقط روی {localModel.metrics.test_human||0} متن انسانی آزموده شده؛ امتیاز منشأ متن هنوز اعتبار کافی برای قضاوت ندارد.</p>}
                  {localModel && <p>آزمون داخلی: {Math.round(localModel.metrics.accuracy*100).toLocaleString('fa-IR')}٪ صحت روی {localModel.metrics.test_count.toLocaleString('fa-IR')} نمونه. این عدد تضمین دقت عمومی نیست.</p>}
                </div> : <div className="prediction-unavailable"><div className="model-empty"><Icon name="info" size={20}/> نتیجه منشأ: نامشخص</div><p>{prediction.explanation}</p><span className="local-link">مدل‌های ارزیابی به‌صورت مستقل و خارج از سایت آموزش می‌بینند.</span></div>}
                <div className="signal-count"><span>نشانه‌های قابل مشاهده</span><b>{shortNumber(report.findings.length)} دسته / {shortNumber(report.totalHighlights)} مورد</b><small>این شمارش به‌تنهایی درباره منشأ متن قضاوت نمی‌کند.</small></div>
              </div>
              <div className="metric-grid"><div className="metric"><div><Icon name="search" size={16}/> دسته یافته</div><strong>{shortNumber(report.findings.length)}</strong></div><div className="metric"><div><Icon name="eye" size={16}/> موارد علامت‌گذاری</div><strong>{shortNumber(report.totalHighlights)}</strong></div><div className="metric"><div><Icon name="layers" size={16}/> پاراگراف</div><strong>{shortNumber(report.paragraphCount)}</strong></div><div className="metric"><div><Icon name="file" size={16}/> زبان</div><strong className="metric-language">{LANG_LABEL[report.language]}</strong></div></div>
              <div className="interpretation"><div className="interpretation-heading"><Icon name="info" size={18}/><strong>برداشت درست از نتیجه</strong></div><p>{report.note}</p></div>
              <div className="export-area"><span>گزارش قابل استفاده</span><div className="export-buttons"><button type="button" onClick={() => this.download('txt')} disabled={isStale || !hasText}><Icon name="download" size={17}/> گزارش TXT</button><button type="button" onClick={() => this.download('json')} disabled={isStale || !hasText}><Icon name="download" size={17}/> JSON</button><button type="button" onClick={this.copySummary} disabled={isStale || !hasText} aria-label="کپی گزارش" title="کپی گزارش"><Icon name="clipboard" size={17}/></button></div></div>
            </aside>
          </section>

          <section className="rewrite-section" id="natural-rewrite" aria-label="بازنویسی طبیعی متن فارسی">
            <div className="section-heading compact"><div><span className="section-number">02 /</span><h2>ویرایش و بازنویسی طبیعی فارسی</h2>
              <p>پیش‌نمایش بازنویسی با حفظ محتوا و امکان بررسی تفاوت‌ها؛ مستقل از موتور تشخیص.</p></div><div className="section-hint"><Icon name="lock" size={16}/> پردازش فقط در مرورگر</div></div>
            <div className="rewrite-panel panel">
              <div className="rewrite-config">
                <div className="rewrite-fields">
                  <label>سبک نگارش
                    <select value="professional-natural" disabled aria-label="سبک نگارش بازنویسی"><option value="professional-natural">حرفه‌ای و طبیعی (نسخه اول)</option></select>
                  </label>
                  <label>منشأ متن اولیه
                    <select value={rewriteOrigin} onChange={(e:any)=>this.setState({rewriteOrigin:e.target.value as NevisRewrite.Origin,rewriteResult:null,rewriteConfirmed:false})}>
                      <option value="unknown">نامشخص</option><option value="ai">تولیدشده با AI (اعلام کاربر)</option><option value="human">انسانی (اعلام کاربر)</option>
                    </select>
                  </label>
                </div>
                <label className="rewrite-slider">شدت ویرایش: <strong>{shortNumber(rewriteStrength)}٪</strong>
                  <input type="range" min={0} max={100} step={5} value={rewriteStrength} onChange={(e:any)=>this.setState({rewriteStrength:Number(e.target.value),rewriteResult:null,rewriteConfirmed:false})}/>
                  <span>این درصد سهم تقریبی قواعد قابل‌اعمال است، نه درصد تغییر واژگان یا تضمین انسانی‌بودن.</span>
                </label>
                <button className="primary-button" type="button" onClick={this.runRewrite} disabled={!hasText}><Icon name="pen" size={17}/> پیشنهاد بازنویسی</button>
              </div>
              <p className="rewrite-note"><Icon name="info" size={16}/> نسخه اولیه فقط اصلاح‌های محدود و قابل‌ردیابی انجام می‌دهد؛ از مدل زبانی مولد استفاده نمی‌کند و قرار نیست منشأ AI را پنهان کند.</p>
              {rewriteResult && <div className="rewrite-preview" aria-live="polite">
                <div className="rewrite-columns">
                  <div><h3>متن اولیه</h3><div className="rewrite-original" dir="rtl">{rewriteResult.original}</div></div>
                  <div><label htmlFor="rewrite-draft">پیشنهاد قابل‌ویرایش</label><textarea id="rewrite-draft" dir="rtl" value={rewriteDraft} onChange={(e:any)=>this.updateRewriteDraft(e.target.value)} aria-label="نسخه قابل بازبینی بازنویسی"/></div>
                </div>
                <p className="muted rewrite-count">{shortNumber(rewriteResult.changes.length)} تغییر از {shortNumber(rewriteResult.candidates)} فرصت شناسایی‌شده · منشأ اولیه: {rewriteOrigin==='ai'?'طبق اعلام کاربر: AI':rewriteOrigin==='human'?'طبق اعلام کاربر: انسانی':'نامشخص'}</p>
                {rewriteDraft!==rewriteResult.text && <p className="rewrite-note" role="status">متن پیشنهادشده رو دستی ویرایش کردی؛ فهرست تغییرات زیر فقط مربوط به پیشنهاد اولیه موتور است.</p>}
                {rewriteResult.changes.length>0 && <details className="rewrite-diff"><summary>نمایش تغییرات و دلیل هر تغییر</summary>
                  {rewriteResult.changes.map((item,i)=><div key={i}><del>{item.before}</del><span>←</span><ins>{item.after}</ins><small>{item.reason}</small></div>)}
                </details>}
                {!rewriteResult.changes.length && <p className="rewrite-note">در این متن با قواعد محافظه‌کار فعلی جایگزینی مناسبی پیدا نشد. متن بدون تغییر باقی مانده است.</p>}
                <div className="rewrite-quality">
                  <strong>{rewriteQuality?.ok?'کنترل‌های اولیه بدون هشدار':'بازبینی لازم است'}</strong>
                  {rewriteQuality?.warnings.map((warning,i)=><p key={i} role="alert">{warning}</p>)}
                  <p>کنترل عدد، نام لاتین، نقل‌قول و نفی به‌معنی تضمین حفظ مفهوم نیست؛ تغییرات را خودت بررسی کن.</p>
                </div>
                <label className="rewrite-confirm"><input type="checkbox" checked={rewriteConfirmed} disabled={!rewriteQuality?.ok} onChange={(e:any)=>this.setState({rewriteConfirmed:e.target.checked})}/>
                  متن و معنی آن را بررسی کردم و می‌دانم ویرایش، منشأ نوشته را انسانی نمی‌کند.
                </label>
                <div className="rewrite-actions">
                  <button type="button" className="primary-button" disabled={!rewriteConfirmed||!rewriteQuality?.ok} onClick={this.applyRewrite}>جایگزین‌کردن در تحلیل</button>
                  <button type="button" className="small-button" disabled={!rewriteConfirmed||!rewriteQuality?.ok} onClick={this.exportRewrite}><Icon name="download" size={16}/> دریافت JSON همراه با منشأ</button>
                </div>
              </div>}
              {rewriteAdopted && <p className="rewrite-note"><Icon name="shield" size={16}/> متن فعلی با ابزار ویرایش شده است؛ منشأ اولیه {rewriteLineage?.originalOrigin==='ai'?'طبق اعلام کاربر AI است':rewriteLineage?.originalOrigin==='human'?'طبق اعلام کاربر انسانی است':'نامشخص است'} و این ویرایش ادعایی درباره نویسنده انسانی ایجاد نمی‌کند.</p>}
            </div>
          </section>
          <section className="findings-section" aria-label="یافته‌ها"><div className="section-heading compact"><div><span className="section-number">02 /</span><h2>ردپاهای قابل بررسی</h2><p>هر یافته همراه با شاهد متنی، توضیح و محدودیت تفسیر نمایش داده می‌شود.</p></div><div className="tabs"><button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => this.setState({ tab: 'all' })}>همه یافته‌ها <span>{shortNumber(report.findings.length)}</span></button><button type="button" className={tab === 'notable' ? 'active' : ''} onClick={() => this.setState({ tab: 'notable' })}>مهم‌ترها <span>{shortNumber(report.findings.filter(f => f.severity !== 'low').length)}</span></button></div></div>
            <div className="evidence-layout">
              <div className="findings-list">{findings.length ? findings.map((f, i) => <article className={`finding-card ${activeId === f.id ? 'active' : ''}`} key={f.id}><div className="finding-top"><div className="finding-index">{String(i + 1).padStart(2, '0')}</div><div className="finding-head"><div className="finding-meta"><span>{CATEGORY_LABEL[f.category]}</span><span className="meta-separator"></span><span>{shortNumber(f.hits.length)} نمونه</span></div><h3>{f.title}</h3></div><span className={`severity ${f.severity}`}><span></span>{SEVERITY_LABEL[f.severity]}</span></div><p>{f.description}</p><div className="quote-list">{f.hits.slice(0, 2).map((hit, ix) => <span className="quote-chip" key={ix}>«{hit.text.replace(/\n/g, ' ').slice(0, 75)}{hit.text.length > 75 ? '…' : ''}»</span>)}</div><div className="finding-footer"><span><Icon name="info" size={15}/>{f.caveat}</span><div className="finding-actions"><button type="button" onClick={() => this.setActive(f.id)}>دیدن در متن <Icon name="arrow" size={16}/></button></div></div></article>) : <div className="empty-finding"><div><Icon name="search" size={26}/></div><h3>{tab === 'notable' ? 'یافته برجسته‌ای در این دسته نیست' : 'الگوی تعریف‌شده‌ای پیدا نشد'}</h3><p>این موضوع به معنی انسانی بودن متن نیست. فقط در محدوده قواعد فعلی برنامه نشانه‌ای پیدا نشده است.</p></div>}</div>
              <aside className="annotation-panel" id="evidence-preview"><div className="annotation-header"><div><h3><Icon name="eye" size={19}/> متن علامت‌گذاری‌شده</h3><p>برای مشاهده جزئیات، بخش‌های علامت‌گذاری‌شده را انتخاب کنید.</p></div><span className="annotations-count">{shortNumber(report.totalHighlights)} نشانه</span></div><div className="legend"><span><i className="lg-high"></i>پررنگ</span><span><i className="lg-medium"></i>متوسط</span><span><i className="lg-low"></i>ضعیف</span></div><div className={`annotated-text ${isStale ? 'dimmed' : ''}`} dir={report.language === 'en' ? 'ltr' : 'rtl'}>{this.renderAnnotatedText()}</div>{active ? <div className="selected-explanation"><div><Icon name="scan" size={16}/><strong>{active.title}</strong><button type="button" onClick={() => this.setState({ activeId: null })} aria-label="بستن توضیح">×</button></div><p>{active.description}</p><small>{active.caveat}</small></div> : <div className="annotation-footer"><Icon name="info" size={16}/> رنگ‌ها میزان اهمیت بازبینی را نشان می‌دهند، نه احتمال AI بودن.</div>}{isStale && <div className="stale-notice"><Icon name="refresh" size={15}/> متن ویرایش شده؛ برای به‌روزرسانی یافته‌ها دوباره تحلیل کن.</div>}</aside>
            </div>
          </section>

          <section id="method" className="method-section"><div className="section-heading compact"><div><span className="section-number">03 /</span><h2>روش تحلیل نویس‌سنج</h2><p>روش تحلیل شفاف است و نتیجه آن به‌عنوان تشخیص قطعی منشأ متن ارائه نمی‌شود.</p></div></div><div className="method-grid"><div className="method-card"><span className="method-num">01</span><div className="method-icon"><Icon name="scan" size={23}/></div><h3>تحلیل نشانه‌های زبانی</h3><p>عبارت‌های قالبی، ارجاع‌های مبهم، ادبیات تبلیغاتی، تقابل‌های تکراری و خودارجاعی را بررسی می‌کند.</p></div><div className="method-card"><span className="method-num">02</span><div className="method-icon"><Icon name="layers" size={23}/></div><h3>تحلیل ریتم و تکرار</h3><p>تنوع واژگان، آنتروپی، ریتم جمله‌ها و الگوهای تکرار پنهان را در کنار نشانه‌های ساختاری بررسی می‌کند.</p></div><div className="method-card"><span className="method-num">03</span><div className="method-icon"><Icon name="chart" size={23}/></div><h3>گزارش قابل پیگیری</h3><p>برای هر یافته، شاهد واقعی در متن و توضیح مختصری از محدودیت نتیجه ارائه می‌کند.</p></div></div></section>
          <section className="style-section" id="style-profile" aria-label="پروفایل آماری متن">
            <div className="section-heading compact"><div><span className="section-number">04 /</span><h2>پروفایل آماری نوشتار</h2><p>هشت ویژگی مستقل که الگوی انتخاب واژه و ساختار متن را توصیف می‌کنند؛ نه اینکه منشأ متن را قطعی اعلام کنند.</p></div></div>
            <div className="style-grid">
              {report.style.metrics.map(m => <div className={`style-metric ${m.available ? '' : 'muted'}`} key={m.id} title={m.detail}>
                <div className="style-metric-top"><span>{m.title}</span><Icon name="chart" size={16}/></div>
                <strong dir="auto">{m.display}</strong><p>{m.detail}</p>
              </div>)}
            </div>
            <p className="style-info"><Icon name="info" size={17}/> این اعداد ویژگی‌های آماری را توصیف می‌کنند. بدون پیکره آزمایشی معتبر، «آنتروپی بیشتر» یا «ریتم یکنواخت‌تر» به معنای AI بودن نیست.</p>
          </section>
          <section className="reference-section" id="style-compare" aria-label="مقایسه سبک نوشته">
            <div className="section-heading compact"><div><span className="section-number">05 /</span><h2>مقایسه امضای نوشتاری</h2><p>برای مقایسه ویژگی‌های نوشتاری، یک متن مرجع با زبان و قالب مشابه وارد کنید.</p></div></div>
            <div className="reference-panel panel">
              <label htmlFor="reference-input">متن مرجع (مثلاً نوشته قبلی همان نویسنده)</label>
              <textarea id="reference-input" dir="auto" value={referenceText} maxLength={40000} onChange={(e: any) => this.updateReference(e.target.value)} placeholder="یک نمونه نوشتار فارسی یا انگلیسی برای مقایسه وارد کنید..." />
              <div className="reference-actions"><span>{shortNumber(textTokens(referenceText))} واژه · بهتر است هر متن حداقل ۱۵۰ واژه داشته باشد.</span><button className="primary-button" type="button" disabled={!referenceText.trim() || (!referenceStale && !!referenceStyle) || isStale} onClick={this.compareReference}><Icon name="layers" size={16}/> مقایسه سبک</button></div>
              {referenceStale && <p className="compare-hint">متن مرجع تغییر کرده است؛ برای دیدن نتایج جدید، مقایسه را اجرا کنید.</p>}
              {comparison && <div className="compare-results" aria-live="polite">
                <h3>{comparison.comparable ? 'تفاوت‌های برجسته در امضای نوشتار' : 'امکان مقایسه کافی نیست'}</h3>
                <p>{comparison.explanation}</p>
                {comparison.comparable && <div className="compare-list">{comparison.differences.slice(0, 6).map(delta => <div className="compare-row" key={delta.id}><strong>{delta.title}</strong><div><span>متن اصلی: {delta.current}</span><span>مرجع: {delta.reference}</span></div></div>)}</div>}
              </div>}
            </div>
          </section>
          <section id="limitations" className="limitations"><span className="limitations-icon"><Icon name="shield" size={23}/></span><div><h3>یک یادآوری مهم درباره تشخیص هوش مصنوعی</h3><p>این ابزار بدون داده آموزشی، <strong>نمی‌تواند منشأ متن را تشخیص دهد</strong>. مدل محلی پس از آموزش هم فقط یک برآورد احتمالی و خطاپذیر ارائه می‌کند. متن انسانی ممکن است منظم و کلیشه‌ای باشد و متن تولیدشده با AI ممکن است نشانه‌های ظاهری نداشته باشد. ویرایش انسانی و ماشینی نیز می‌تواند با هم ترکیب شود. نتایج نباید به‌تنهایی مبنای تصمیم‌های تحصیلی، استخدامی یا انضباطی قرار گیرند.</p></div></section>
        </main>
        <footer className="footer"><div className="shell footer-inner"><div className="footer-brand"><span className="brand-mark mini"><Icon name="scan" size={16}/></span><strong>نویس‌سنج</strong><span className="footer-divider">·</span><span>محصولی از <a href="https://imoein.com" target="_blank" rel="noopener noreferrer" aria-label="وب‌سایت iMoein">iMoein</a></span></div><div className="footer-links"><a href="https://ai-detector.imoein.com" target="_blank" rel="noopener noreferrer" aria-label="ابزار بررسی ردپای هوش مصنوعی در تصاویر">ردپای هوش مصنوعی در تصاویر <Icon name="arrow" size={15}/></a><span>نسخه ۲.۵.۶ · تحلیل خصوصی در مرورگر</span></div></div></footer>
      </div>;
    }
  }
}
class NevisSafeBoundary extends React.Component<any,any> {
  constructor(props:any){super(props);this.state={failed:false};}
  componentDidCatch(e:any){console.error('NevisSanj render',e);this.setState({failed:true});}
  render(){return this.state.failed ? React.createElement('section',{dir:'rtl',style:{padding:35,margin:30}},
    'نمایش نتیجه با مشکل مواجه شد. صفحه را دوباره بارگذاری کنید.') : this.props.children;}
}
ReactDOM.render(React.createElement(NevisSafeBoundary,null,React.createElement(NevisApp.App)), document.getElementById('root'));
