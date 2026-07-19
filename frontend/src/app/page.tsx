'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const modes = [
  {
    id: 'whatsapp',
    title: 'استمع وردّ على واتساب',
    desc: 'المندوب الذكي يستقبل الرسائل ويرد فوراً بصوت علامتك التجارية وكتالوجك.',
    icon: '💬',
    tone: 'teal' as const,
    steps: ['1 استقبل', '2 ردّ AI', '3 حوّل لصفقة'],
    blob: 'var(--teal-soft)',
  },
  {
    id: 'followup',
    title: 'اختبر المتابعة',
    desc: 'متابعة تلقائية بعد 2س / 24س / 72س حتى لا تضيع أي فرصة ساخنة.',
    icon: '⏱️',
    tone: 'orange' as const,
    steps: ['1 راقب', '2 تابع', '3 أغلق'],
    blob: 'var(--orange-soft)',
  },
  {
    id: 'revenue',
    title: 'رتّب الإيراد',
    desc: 'عروض أسعار وفواتير ورابط تحصيل من داخل المحادثة مباشرة.',
    icon: '🧾',
    tone: 'sky' as const,
    steps: ['1 عرض', '2 فاتورة', '3 تحصيل'],
    blob: 'var(--sky-soft)',
  },
];

const plans = [
  {
    id: 'starter',
    name: 'المبتدئ',
    price: 29,
    blurb: 'للمتاجر والفرق الصغيرة التي تريد ردود واتساب ذكية بسرعة.',
    features: [
      '1,000 محادثة / شهر',
      'رد AI بصوت علامتك',
      'CRM للعملاء',
      'أتمتة كلمات مفتاحية',
      'قاعدة معرفة أساسية',
      'حتى 3 مستخدمين',
    ],
  },
  {
    id: 'growth',
    name: 'النمو',
    price: 79,
    popular: true,
    blurb: 'الأكثر اختياراً — مندوب مبيعات كامل مع متابعة وفواتير.',
    features: [
      '5,000 محادثة / شهر',
      'مندوب AI + متابعة 2س/24س/72س',
      'عروض أسعار وفواتير',
      'لوحة الفرص الضائعة',
      'قاعدة معرفة موسّعة',
      '10 مستخدمين · رقمين واتساب',
    ],
  },
  {
    id: 'revenue',
    name: 'الإيرادات',
    price: 199,
    blurb: 'للشركات والوكالات التي تدير حجماً كبيراً وتحصيلاً مستمراً.',
    features: [
      'محادثات غير محدودة عملياً',
      'حتى 5 أرقام واتساب',
      'تحصيل ودفع متقدم',
      'تقارير وأداء أعمق',
      'White-label للفريق',
      'دعم أولوية',
    ],
  },
];

const services = [
  {
    title: 'مندوب واتساب AI',
    desc: 'يرد على الاستفسارات والأسعار والتوفر بنفس نبرة شركتك، ويعتمد على كتالوجك وسياساتك لحظة بلحظة.',
    mark: '01',
  },
  {
    title: 'متابعة لا تنام',
    desc: 'تذكيرات ذكية للعملاء الباردين والصفقات المعلّقة — قبل أن تبرد الفرصة وتضيع الميزانية الإعلانية.',
    mark: '02',
  },
  {
    title: 'CRM خفيف وسريع',
    desc: 'كل محادثة تُربط بعميل وحالة وسجل رسائل — بدون تعقيد أنظمة المبيعات التقليدية الثقيلة.',
    mark: '03',
  },
  {
    title: 'فواتير من المحادثة',
    desc: 'حوّل الاهتمام إلى عرض سعر ثم فاتورة ورابط تحصيل دون مغادرة الدردشة أو نسخ الأرقام يدوياً.',
    mark: '04',
  },
  {
    title: 'فرص ضائعة ظاهرة',
    desc: 'لوحة توضّح من ينتظر رداً، ومن اختفى، وأين يتسرب الإيراد أسبوعياً لفريقك.',
    mark: '05',
  },
  {
    title: 'معرفة تتعلّم منك',
    desc: 'ارفع منتجاتك وأسعارك وسياساتك — والوكيل يستشهد بها في كل رد بدل إجابات عامة.',
    mark: '06',
  },
];

const audiences = [
  {
    title: 'متاجر إلكترونية',
    desc: 'أسئلة الأسعار، التوفر، الشحن، والإرجاع — تُجاب فوراً ويُحوَّل المهتم إلى فاتورة.',
  },
  {
    title: 'خدمات وعيادات',
    desc: 'حجز مواعيد واستفسارات أولية مع متابعة لمن لم يُكمل الحجز.',
  },
  {
    title: 'عقارات وتأجير',
    desc: 'تصفية الاستفسارات، إرسال تفاصيل الوحدات، ومتابعة العملاء الجادّين.',
  },
  {
    title: 'وكالات ومبيعات B2B',
    desc: 'فريق متعدد، فرص ظاهرة، وتحصيل منظم من داخل مسار المحادثة.',
  },
];

const outcomes = [
  { value: 'ثوانٍ', label: 'متوسط أول ردّ بعد الرسالة' },
  { value: '24/7', label: 'تغطية واتساب دون نوبة ليلية' },
  { value: '3×', label: 'مسار أوضح من أداة شات منفصلة' },
  { value: '0', label: 'أدوات متفرقة لربط الرد والتحصيل' },
];

const quotes = [
  {
    text: 'قبل BusinessOS كنا نفقد نصف استفسارات الليل. الآن المندوب يرد، والفريق يكمّل الصفقات الصباحية فقط.',
    name: 'نورة العتيبي',
    role: 'مديرة متجر إلكتروني — الرياض',
  },
  {
    text: 'لوحة الفرص الضائعة غيّرت اجتماعاتنا الأسبوعية. صرنا نرى التسريب قبل ما يصبح خسارة.',
    name: 'خالد المنصور',
    role: 'رئيس مبيعات خدمات — جدة',
  },
  {
    text: 'الفاتورة من داخل المحادثة وفّرت علينا نسخ الأرقام بين واتساب وبرنامج المحاسبة.',
    name: 'مريم الحربي',
    role: 'عمليات — وكالة تسويق',
  },
];

const faqs = [
  {
    q: 'هل أحتاج مطوّراً للربط مع واتساب؟',
    a: 'لا. بعد التسجيل تربط رقم واتساب Business أو تستخدم الوضع التجريبي فوراً لاختبار المندوب الذكي على بيانات وهمية دون انتظار موافقات طويلة.',
  },
  {
    q: 'هل الردود بالعربية الفصحى أم اللهجة؟',
    a: 'تضبط نبرة الرد من إعدادات الشركة وقاعدة المعرفة. المنصة مبنية أولاً للعربية (RTL) مع دعم الإنجليزية عند الحاجة.',
  },
  {
    q: 'ماذا يحدث لبيانات عملائي؟',
    a: 'تُخزَّن لتشغيل الخدمة فقط (محادثات، CRM، فواتير). لا نبيع البيانات لأطراف خارجية. راجع سياسة الخصوصية وطلب الحذف عند الحاجة.',
  },
  {
    q: 'هل يمكن إلغاء الاشتراك في أي وقت؟',
    a: 'نعم. الباقات شهرية ويمكنك الترقية أو الإيقاف من لوحة الاشتراك. يمكنك التجربة قبل الالتزام الكامل.',
  },
  {
    q: 'ما الفرق بين النمو والإيرادات؟',
    a: 'النمو يغطي معظم الشركات: متابعة + فواتير + فرص. الإيرادات تزيل الحدود العملية، تضيف أرقاماً متعددة، تقارير أعمق، ودعماً بأولوية.',
  },
  {
    q: 'هل تدعمون فريقاً متعدد المستخدمين؟',
    a: 'نعم عبر الدعوات والأدوار. باقة المبتدئ حتى 3 مستخدمين، النمو حتى 10، والإيرادات بلا حد عملي للفريق.',
  },
  {
    q: 'هل أقدر أجرّب قبل الدفع؟',
    a: 'نعم. أنشئ حساباً، فعّل الوضع التجريبي لواتساب، واختبر مسار الرد والمتابعة والفواتير على سيناريو جاهز.',
  },
  {
    q: 'هل المنصة مناسبة لغير السعودية؟',
    a: 'نعم. الواجهة عربية أولاً، والأسعار بالدولار، ويمكن ضبط العملة والنبرة والكتالوج لسوقك.',
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState('whatsapp');
  const [plan, setPlan] = useState('growth');
  const start = (planOverride?: string) => {
    const chosen = planOverride || plan;
    if (user) {
      router.push(
        user.role === 'super_admin' || user.role?.startsWith('platform_') ? '/admin' : '/dashboard',
      );
      return;
    }
    router.push(`/register?plan=${chosen}&mode=${selected}`);
  };

  return (
    <div className="app-shell relative overflow-x-clip">
      <div
        className="pointer-events-none absolute top-0 start-0 rounded-full bg-[#b8ecee]/40 blur-3xl"
        style={{ width: 'min(18rem, 55vw)', height: 'min(18rem, 55vw)', transform: 'translate(-20%, -30%)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-[18%] end-0 rounded-full bg-[#ffe0c8]/50 blur-3xl"
        style={{ width: 'min(20rem, 60vw)', height: 'min(20rem, 60vw)', transform: 'translate(25%, 0)' }}
        aria-hidden
      />

      {/* Hero */}
      <div className="relative w-full max-w-5xl mx-auto px-[clamp(1rem,4vw,1.5rem)] pt-[clamp(1rem,3vw,1.5rem)] pb-6 min-h-dvh flex flex-col">
        <header className="flex items-center justify-between gap-2 sm:gap-3 mb-[clamp(1.25rem,4vw,2rem)] animate-rise">
          <Link
            href="#top"
            className="font-display font-black text-[var(--teal-dark)] text-sm sm:text-base shrink-0"
            id="top"
          >
            ◆ BusinessOS <span className="text-[var(--orange)]">AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="التنقل الرئيسي">
            <a href="#services" className="nav-link">الخدمات</a>
            <a href="#pricing" className="nav-link">الباقات</a>
            <a href="#stories" className="nav-link">قصص</a>
            <a href="#faq" className="nav-link">الأسئلة</a>
            <a href="#contact-cta" className="nav-link">تواصل</a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Link href={user ? '/dashboard' : '/login'} className="pill pill-soft text-xs !py-1.5 !px-3">
              {user ? 'لوحتي' : 'دخول'}
            </Link>
            <button type="button" onClick={() => start()} className="btn-orange !py-2 !px-3.5 text-xs sm:text-sm">
              ابدأ
            </button>
          </div>
        </header>

        <section className="text-center mb-[clamp(1.25rem,4vw,2rem)] animate-rise animate-rise-delay-1">
          <p className="text-[var(--teal)] font-bold mb-2 tracking-wide text-[clamp(0.85rem,2.5vw,1rem)]">
            BusinessOS AI
          </p>
          <h1
            className="font-display font-black text-[var(--teal-dark)] leading-tight mb-4"
            style={{ fontSize: 'clamp(1.75rem, 6vw, 3.75rem)' }}
          >
            تشغيل المبيعات الذكي
          </h1>
          <p
            className="text-[var(--muted)] max-w-2xl mx-auto leading-relaxed px-1"
            style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.125rem)' }}
          >
            اختر مسار التشغيل، ثم ابدأ جولة منظمة: رد واتساب، متابعة فرص، وفواتير فورية بنقاط أداء لحظية.
          </p>
        </section>

        <section id="modes" className="grid-fluid-3 mb-6 flex-1">
          {modes.map((mode, idx) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSelected(mode.id)}
              className={`mode-card text-right animate-rise ${selected === mode.id ? 'active' : ''} animate-rise-delay-${idx + 1}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-display text-[clamp(1.05rem,2.5vw,1.25rem)] font-extrabold mb-1.5 break-words">
                    {mode.title}
                  </h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{mode.desc}</p>
                </div>
                <span className={`icon-badge ${mode.tone} shrink-0`}>{mode.icon}</span>
              </div>
              <div className="steps-row">
                {mode.steps.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <div className="corner-blob" style={{ background: mode.blob }} aria-hidden />
            </button>
          ))}
        </section>

        <div className="action-bar sticky bottom-4 z-20 animate-rise animate-rise-delay-3">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <label className="text-sm font-bold text-[var(--muted)] shrink-0" htmlFor="hero-plan">
              الباقة
            </label>
            <select
              id="hero-plan"
              className="select-field min-w-0 flex-1"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · ${p.price}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => start()} className="btn-orange shrink-0">
            <span>▶</span>
            ابدأ التشغيل
          </button>
        </div>

        <div className="trust-strip">
          <span>تشغيل خلال دقائق</span>
          <span>بيانات شركتك معزولة</span>
          <span>واجهة عربية أصيلة</span>
          <span>واتساب + AI + CRM</span>
        </div>
      </div>

      {/* Outcomes */}
      <section className="landing-band landing-section" aria-label="نتائج التشغيل">
        <div className="landing-container">
          <div className="outcome-row">
            {outcomes.map((o) => (
              <div key={o.label} className="outcome-item">
                <p className="outcome-value">{o.value}</p>
                <p className="outcome-label">{o.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section" id="how" aria-labelledby="how-title">
        <div className="landing-container">
          <p className="landing-kicker">كيف يعمل</p>
          <h2 className="landing-title" id="how-title">من أول رسالة… إلى فاتورة مدفوعة</h2>
          <p className="landing-lead mb-8">
            ثلاث حركات واضحة بدل أدوات متناثرة. المنصة تربط الاستقبال والمتابعة والتحصيل في مسار واحد يفهمه فريقك من اليوم الأول.
          </p>
          <div className="flow-steps">
            <div className="flow-step">
              <h3>اربط واتساب ومعرفتك</h3>
              <p>ارفع الأسعار والمنتجات والسياسات. المندوب الذكي يتدرّب على صوت علامتك قبل أن يرد على أحد.</p>
            </div>
            <div className="flow-step">
              <h3>دع AI يرد ويتابع</h3>
              <p>كل محادثة تُدار وتُصنَّف. المتابعات التلقائية تطرق الباب في الوقت الصحيح دون إزعاج العميل.</p>
            </div>
            <div className="flow-step">
              <h3>أغلق الصفقة من الدردشة</h3>
              <p>عرض سعر، فاتورة، وتحصيل — مع لوحة تُظهر أين يتسرّب الإيراد قبل فوات الأوان.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Product stage */}
      <section className="landing-section pt-0" id="product" aria-labelledby="product-title">
        <div className="landing-container">
          <p className="landing-kicker">داخل المنصة</p>
          <h2 className="landing-title" id="product-title">غرفة عمليات المبيعات — لا مجرد صندوق رسائل</h2>
          <p className="landing-lead mb-8">
            صندوق وارد، حالة العميل، رد AI، ومتابعة — في واجهة واحدة عربية مبنية للعمل اليومي لا للعروض التقديمية.
          </p>

          <div className="product-stage" aria-hidden={false}>
            <div className="product-stage-bar">
              <span>صندوق الرسائل</span>
              <span className="product-dot" />
              <span>AI نشط</span>
            </div>
            <div className="product-stage-body">
              <aside className="product-list">
                <div className="product-thread is-active">
                  <strong>سارة · طلب سعر</strong>
                  <span>كم سعر السماعات اللاسلكية؟</span>
                </div>
                <div className="product-thread">
                  <strong>مؤسسة النخبة</strong>
                  <span>بانتظار متابعة بعد العرض</span>
                </div>
                <div className="product-thread">
                  <strong>أحمد · فاتورة</strong>
                  <span>تم إرسال رابط التحصيل</span>
                </div>
              </aside>
              <div className="product-chat">
                <div className="bubble in">السلام عليكم، كم سعر السماعات؟ وهل متوفرة؟</div>
                <div className="bubble out">
                  <em>AI</em>
                  وعليكم السلام. السماعات اللاسلكية Pro بسعر 349 ر.س ومتوفرة للشحن خلال 24 ساعة. تحب أرسل لك عرض سعر؟
                </div>
                <div className="bubble in">نعم، وأبغى فاتورة على الشركة</div>
                <div className="bubble out">
                  <em>AI</em>
                  تم تجهيز العرض. تقدر تعتمد الفاتورة من هنا مباشرة وأرسل رابط التحصيل.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="landing-band landing-section" id="services" aria-labelledby="services-title">
        <div className="landing-container">
          <p className="landing-kicker">الخدمات</p>
          <h2 className="landing-title" id="services-title">كل ما تحتاجه لتشغيل المبيعات</h2>
          <p className="landing-lead mb-8">
            ليست إضافة شات بوت فقط — منظومة تشغيل: مندوب، متابعة، عملاء، فواتير، وفرص ظاهرة لفريقك.
          </p>
          <div className="feature-rail">
            {services.map((s) => (
              <article key={s.title} className="feature-item">
                <span className="feature-mark">{s.mark}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="landing-section" id="audience" aria-labelledby="audience-title">
        <div className="landing-container">
          <p className="landing-kicker">لمن؟</p>
          <h2 className="landing-title" id="audience-title">مصمم لمن يبيع عبر واتساب كل يوم</h2>
          <p className="landing-lead mb-8">
            سواء كنت متجراً صغيراً أو فريقاً متعدد المندوبين — المسارات تتكيّف مع حجمك دون تعقيد.
          </p>
          <div className="audience-grid">
            {audiences.map((a) => (
              <article key={a.title} className="audience-item">
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="landing-band landing-section" id="pricing" aria-labelledby="pricing-title">
        <div className="landing-container">
          <p className="landing-kicker">الباقات</p>
          <h2 className="landing-title" id="pricing-title">أسعار واضحة. ترقية متى احتجت.</h2>
          <p className="landing-lead mb-8">
            ابدأ بما يناسب حجمك اليوم. كل الباقات تشمل لوحة عربية، واتساب، ووكيل AI — والفرق في الحجم والمتابعة والتحصيل.
          </p>

          <div className="pricing-grid">
            {plans.map((p) => (
              <article
                key={p.id}
                className={`price-card ${plan === p.id ? 'is-selected' : ''} ${p.popular ? 'is-popular' : ''}`}
                onClick={() => setPlan(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPlan(p.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={plan === p.id}
              >
                {p.popular && (
                  <span className="pill pill-teal text-[10px] !py-1 !px-2.5 w-fit">الأكثر طلباً</span>
                )}
                <div>
                  <h3 className="font-display font-extrabold text-xl text-[var(--teal-dark)] m-0">{p.name}</h3>
                  <p className="text-sm text-[var(--muted)] mt-1 mb-0 leading-relaxed">{p.blurb}</p>
                </div>
                <p className="price-tag m-0">
                  ${p.price}
                  <span>/شهر</span>
                </p>
                <ul>
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`mt-1 ${plan === p.id || p.popular ? 'btn-orange' : 'btn-ghost'} !rounded-2xl w-full justify-center`}
                  onClick={(e) => {
                    e.stopPropagation();
                    start(p.id);
                  }}
                >
                  {plan === p.id ? 'ابدأ بهذه الباقة' : 'اختر وابدأ'}
                </button>
              </article>
            ))}
          </div>
          <p className="text-center text-xs text-[var(--muted)] mt-6 leading-relaxed">
            الأسعار بالدولار الأمريكي · ترقية أو إيقاف من لوحة الاشتراك · دعم تجريبي قبل الالتزام ·{' '}
            <Link href="/terms" className="text-[var(--teal)] font-bold hover:underline">
              الشروط
            </Link>
            {' · '}
            <Link href="/privacy" className="text-[var(--teal)] font-bold hover:underline">
              الخصوصية
            </Link>
          </p>
        </div>
      </section>

      {/* Stories */}
      <section className="landing-section" id="stories" aria-labelledby="stories-title">
        <div className="landing-container">
          <p className="landing-kicker">قصص من الميدان</p>
          <h2 className="landing-title" id="stories-title">فرق بدأت تغلق أسرع</h2>
          <p className="landing-lead mb-8">
            تجارب قريبة من واقع البيع عبر واتساب في السوق العربي — التركيز على التشغيل لا على الوعود الفارغة.
          </p>
          <div className="quotes-grid">
            {quotes.map((q) => (
              <blockquote key={q.name} className="quote-item">
                <p>“{q.text}”</p>
                <footer>
                  <strong>{q.name}</strong>
                  <span>{q.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / security */}
      <section className="landing-band landing-section" id="trust" aria-labelledby="trust-title">
        <div className="landing-container">
          <p className="landing-kicker">الثقة والأمان</p>
          <h2 className="landing-title" id="trust-title">بيانات شركتك ليست مادة تسويق لنا</h2>
          <div className="trust-grid">
            <article>
              <h3>عزل متعدد المستأجرين</h3>
              <p>كل شركة ترى بياناتها فقط. الصلاحيات والأدوار تُدار من لوحة الفريق.</p>
            </article>
            <article>
              <h3>خصوصية واضحة</h3>
              <p>لا بيع لبيانات العملاء. المعالجة لتشغيل الردود والـ CRM والفواتير فقط.</p>
            </article>
            <article>
              <h3>تحكم أنت بالمعرفة</h3>
              <p>قاعدة المعرفة والأسعار والسياسات ملكك — والوكيل يستند إليها لا إلى تخمين عام.</p>
            </article>
            <article>
              <h3>مسار قانوني جاهز</h3>
              <p>
                <Link href="/terms">الشروط</Link>
                {' و'}
                <Link href="/privacy">الخصوصية</Link>
                {' و'}
                <Link href="/contact">قناة التواصل</Link>
                {' موثّقة للبدء بثقة.'}
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-section" id="faq" aria-labelledby="faq-title">
        <div className="landing-container">
          <p className="landing-kicker">الأسئلة الشائعة</p>
          <h2 className="landing-title" id="faq-title">قبل ما تبدأ — إجابات مباشرة</h2>
          <p className="landing-lead mb-8">
            لو لم تجد سؤالك، راسلنا عبر{' '}
            <Link href="/contact" className="text-[var(--teal)] font-bold hover:underline">
              صفحة التواصل
            </Link>{' '}
            وسنوضح خلال يوم عمل.
          </p>
          <div className="faq-list">
            {faqs.map((item, index) => (
              <details key={item.q} className="faq-item" {...(index === 0 ? { open: true } : {})}>
                <summary>{item.q}</summary>
                <div className="faq-body">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-section pt-0" id="contact-cta">
        <div className="landing-container">
          <div className="cta-panel">
            <div>
              <h2>جاهز تشغّل المبيعات بدل ما تطاردها؟</h2>
              <p>
                أنشئ حساباً، اختر مساراً وباقة، وجرّب المندوب على واتساب خلال دقائق — أو تواصل معنا لنضبط الإطلاق مع فريقك.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => start()} className="btn-orange">
                <span>▶</span>
                ابدأ الآن
              </button>
              <Link
                href="/contact"
                className="btn-ghost !bg-white/15 !text-white !border-white/30 hover:!bg-white/25"
              >
                تواصل معنا
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer" id="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">
              ◆ BusinessOS <span>AI</span>
            </div>
            <p className="text-sm leading-relaxed m-0 max-w-sm">
              نظام تشغيل المبيعات: واتساب + ذكاء اصطناعي + CRM + فواتير + فرص ضائعة. صُمم للشركات العربية التي تريد
              إغلاقاً أسرع دون فوضى الأدوات.
            </p>
            <div className="footer-cta-mini">
              <a href="mailto:hello@businessos.ai" dir="ltr">
                hello@businessos.ai
              </a>
              <Link href="/register" className="btn-orange !py-2 !px-4 text-xs w-fit">
                ابدأ مجاناً
              </Link>
            </div>
          </div>

          <div className="footer-col">
            <h4>المنتج</h4>
            <ul>
              <li><a href="#modes">مسارات التشغيل</a></li>
              <li><a href="#how">كيف يعمل</a></li>
              <li><a href="#product">داخل المنصة</a></li>
              <li><a href="#services">الخدمات</a></li>
              <li><a href="#pricing">الباقات والأسعار</a></li>
              <li><a href="#audience">القطاعات</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>الخدمات</h4>
            <ul>
              <li><a href="#services">مندوب واتساب AI</a></li>
              <li><a href="#services">المتابعة التلقائية</a></li>
              <li><a href="#services">CRM والعملاء</a></li>
              <li><a href="#services">الفواتير والتحصيل</a></li>
              <li><a href="#services">الفرص الضائعة</a></li>
              <li><a href="#trust">الأمان والخصوصية</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>الدعم والشركة</h4>
            <ul>
              <li><Link href="/contact">التواصل</Link></li>
              <li><a href="#faq">الأسئلة الشائعة</a></li>
              <li><a href="mailto:support@businessos.ai" dir="ltr">support@businessos.ai</a></li>
              <li><Link href="/login">تسجيل الدخول</Link></li>
              <li><Link href="/register">إنشاء حساب</Link></li>
              <li><a href="#stories">قصص العملاء</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>قانوني</h4>
            <ul>
              <li><Link href="/terms">الشروط والأحكام</Link></li>
              <li><Link href="/privacy">سياسة الخصوصية</Link></li>
              <li><Link href="/contact">طلب حذف بيانات</Link></li>
              <li><a href="#pricing">سياسة الاشتراك</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="m-0">© {new Date().getFullYear()} BusinessOS AI · جميع الحقوق محفوظة</p>
          <p className="m-0 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/privacy">الخصوصية</Link>
            <Link href="/terms">الشروط</Link>
            <Link href="/contact">التواصل</Link>
            <a href="#faq">الأسئلة</a>
            <a href="#pricing">الباقات</a>
            <a href="#services">الخدمات</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
