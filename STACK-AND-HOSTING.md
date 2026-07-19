# اللغات والتقنيات + أين ترفع المشروع

## اللغات البرمجية المستخدمة

| الجزء | اللغة | الإطار / الأدوات |
|--------|--------|-------------------|
| الواجهة (Frontend) | **TypeScript** + **JavaScript** | Next.js 15 · React 19 · Tailwind CSS 4 |
| الخادم (Backend) | **TypeScript** | NestJS 11 · Node.js |
| قاعدة البيانات | — (استعلامات عبر ODM) | **MongoDB** + Mongoose |
| التنسيق / الواجهة | **CSS** | Tailwind + `globals.css` |
| الأتمتة / الطابور (اختياري) | TypeScript | BullMQ + Redis (إن فُعّل) |
| التكاملات | REST / HTTP | WhatsApp Meta Cloud API · OpenAI · Stripe / Moyasar |

**باختصار:** المشروع مكتوب أساساً بـ **TypeScript** على **Node.js**، مع واجهة **Next.js/React** وقاعدة **MongoDB**.

### هيكل المجلدات

```
saas/
├── frontend/     → Next.js (TypeScript/React)
├── backend/      → NestJS API (TypeScript)
├── docker-compose.yml
└── README.md
```

---

## أين ترفع الكود (استضافة موصى بها)

المشروع **جزئين** (واجهة + API) + **MongoDB**، لذلك الأفضل استضافة تدعم Node.js وقاعدة منفصلة.

### الخيار الأسهل للبداية (موصى به)

| الخدمة | ماذا ترفع عليها | الرابط |
|--------|------------------|--------|
| **Vercel** | `frontend/` فقط | https://vercel.com |
| **Railway** أو **Render** | `backend/` + MongoDB | https://railway.app · https://render.com |
| **MongoDB Atlas** | قاعدة البيانات السحابية | https://www.mongodb.com/atlas |

**تدفق سريع:**

1. ارفع الكود على **GitHub** (مستودع خاص أو عام).
2. اربط `frontend` بـ **Vercel** → Root Directory = `frontend`.
3. اربط `backend` بـ **Railway / Render** → Root Directory = `backend` · أمر التشغيل: `npm run start:prod` بعد `npm run build`.
4. أنشئ Cluster على **MongoDB Atlas** وضع `MONGODB_URI` في متغيرات البيئة للـ backend.
5. اضبط المتغيرات (انظر الجدول أدناه).

### خيارات أخرى جيدة

| المنصة | مناسبة لـ | ملاحظات |
|--------|-----------|---------|
| **Railway** | Frontend + Backend + Mongo معاً | أبسط غالباً لمشروع كامل |
| **Render** | Backend + Frontend كخدمتين | خطة مجانية محدودة |
| **Fly.io** | Backend قريب من المستخدمين | يحتاج Dockerfile |
| **DigitalOcean App Platform** أو **Droplet** | كامل المشروع | تحكم أكبر · يحتاج إعداد سيرفر |
| **VPS عربي** (مثل Hostinger VPS) | Docker Compose كامل | استخدم `docker-compose.yml` الموجود |
| **AWS / Azure / GCP** | إنتاج كبير | أعقد وأغلى للمبتدئ |

### استضافة بكل شيء عبر Docker (على VPS)

إذا عندك سيرفر Linux:

```bash
git clone <رابط-المستودع>
cd saas
# عدّل المتغيرات في .env ثم:
docker compose up -d --build
```

الملف: `docker-compose.yml` في جذر المشروع.

---

## متغيرات البيئة المهمة قبل الرفع

### Backend (`backend/.env`)

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://USER:PASS@cluster/...
JWT_SECRET=مفتاح-طويل-وسري
FRONTEND_URL=https://your-frontend.vercel.app
API_URL=https://your-api.railway.app
OPENAI_API_KEY=...
META_APP_ID=...
META_APP_SECRET=...
META_EMBEDDED_SIGNUP_CONFIG_ID=...
PAYMENT_PROVIDER=stripe
# أو moyasar — ولا تستخدم demo في الإنتاج
```

### Frontend (`frontend/.env.local` أو إعدادات Vercel)

```env
NEXT_PUBLIC_API_URL=https://your-api.railway.app/api
```

### Meta WhatsApp (مهم)

- Callback URL للويب هوك يجب أن يكون عنواناً **عاماً HTTPS** (ليس localhost).
- مثال: `https://your-api.railway.app/api/webhooks/whatsapp`

---

## أوامر البناء للإنتاج

```bash
# Backend
cd backend
npm install --legacy-peer-deps
npm run build
npm run start:prod

# Frontend
cd frontend
npm install --legacy-peer-deps
npm run build
npm run start
```

---

## توصية عملية لك

| الهدف | الاستضافة |
|--------|-----------|
| تجربة سريعة وديمو | **Railway** (كل شيء) أو Vercel + Railway + Atlas |
| واجهة سريعة ورخيصة | **Vercel** للـ frontend |
| سوق / عملاء حقيقيين | Railway/Render للـ API + Atlas + Vercel + Meta Webhook عام |
| تحكم كامل على سيرفرك | **VPS + Docker Compose** |

---

## رفع الكود على GitHub أولاً

```bash
cd saas
git init
git add .
git commit -m "Initial BusinessOS AI"
# أنشئ مستودعاً على github.com ثم:
git remote add origin https://github.com/USERNAME/businessos.git
git push -u origin main
```

بعدها اربط المستودع بمنصة الاستضافة (Vercel / Railway / Render) من لوحة التحكم → **New Project** → اختر المستودع.
