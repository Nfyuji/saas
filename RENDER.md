# رفع المشروع على Render — ماذا ترفع والأوامر

المشروع مجلدين رئيسيين. على Render تسجّل **خدمتين** (Web Services) من نفس مستودع GitHub:

| الخدمة | المجلد (Root Directory) | الدور |
|--------|-------------------------|--------|
| **API** | `backend` | NestJS |
| **الموقع** | `frontend` | Next.js |

قاعدة البيانات: **MongoDB Atlas** (منفصلة — Render لا يكفي لوحده بدون DB).

---

## 0) قبل Render — ارفع الكود على GitHub

من جهازك (داخل مجلد المشروع):

```bash
cd saas
git init
git add .
git commit -m "Deploy BusinessOS to Render"
```

على GitHub: أنشئ مستودع → انسخ رابطه، ثم:

```bash
git remote add origin https://github.com/USERNAME/REPO.git
git branch -M main
git push -u origin main
```

> لا ترفع ملفات `.env` فيها أسرار. تأكد أنها في `.gitignore`.

---

## 1) MongoDB Atlas (إلزامي)

1. افتح: https://www.mongodb.com/atlas  
2. أنشئ Cluster مجاني  
3. Database Access → مستخدم + كلمة مرور  
4. Network Access → اسمح `0.0.0.0/0` (أو IPs Render)  
5. Connect → Driver → انسخ:

```text
mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/businessos?retryWrites=true&w=majority
```

---

## 2) خدمة الـ Backend على Render

1. https://dashboard.render.com → **New +** → **Web Service**  
2. اربط مستودع GitHub  
3. الإعدادات:

| الحقل | القيمة |
|--------|--------|
| **Name** | `businessos-api` |
| **Region** | أقرب لك (مثل Frankfurt) |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | انظر بالأسفل |
| **Start Command** | انظر بالأسفل |
| **Instance** | Free أو Starter |

### أوامر الـ Backend

**Build Command:**

```bash
npm install --legacy-peer-deps && npm run build
```

**Start Command:**

```bash
npm run start:prod
```

### متغيرات البيئة (Environment) للـ Backend

في Render → Environment → أضف:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/businessos?retryWrites=true&w=majority
JWT_SECRET=ضع-مفتاحا-طويلا-وعشوائيا-32-حرف-على-الاقل
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://businessos-web.onrender.com
API_URL=https://businessos-api.onrender.com
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
WHATSAPP_VERIFY_TOKEN=any-secret-token
WHATSAPP_API_VERSION=v21.0
PAYMENT_PROVIDER=demo
ALLOW_DEMO_PAYMENTS=true
```

بعد إنشاء خدمة الواجهة، حدّث `FRONTEND_URL` لرابطها الحقيقي.

> Render يمرّر `PORT` تلقائياً أحياناً — اتركه أو استخدم القيمة التي يعطيها. Nest يقرأ `process.env.PORT`.

### بعد أول Deploy ناجح للـ API

شغّل الـ Seed مرة واحدة (من جهازك موجّهاً لنفس قاعدة Atlas، أو Shell على Render إن وُجد):

```bash
cd backend
# ضع نفس MONGODB_URI في .env محلي مؤقت
npm run seed
```

حسابات التجربة بعد الـ seed:

- `demo@businessos.ai` / `123456` → `/dashboard`  
- `admin@businessos.ai` / `123456` → `/admin`

---

## 3) خدمة الـ Frontend على Render

1. **New +** → **Web Service** (نفس المستودع)  
2. الإعدادات:

| الحقل | القيمة |
|--------|--------|
| **Name** | `businessos-web` |
| **Root Directory** | `frontend` |
| **Runtime** | `Node` |
| **Build Command** | انظر بالأسفل |
| **Start Command** | انظر بالأسفل |

### أوامر الـ Frontend

**Build Command:**

```bash
npm install --legacy-peer-deps && npm run build
```

**Start Command:**

```bash
npm run start
```

### متغيرات البيئة للـ Frontend

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://businessos-api.onrender.com/api
```

> غيّر الرابط لاسم خدمة الـ API الفعلي عندك على Render.  
> مهم: ينتهي بـ `/api`.

---

## 4) ماذا ترفع؟ (ملخص المجلدات)

```
saas/                    ← ارفعه كله على GitHub
├── backend/             ← Root Directory لخدمة API
│   ├── package.json
│   ├── src/
│   └── ...
├── frontend/            ← Root Directory لخدمة الموقع
│   ├── package.json
│   ├── src/
│   └── ...
├── docker-compose.yml   ← اختياري (لـ VPS؛ Render لا يحتاجه هنا)
└── README.md
```

**لا تحتاج** ترفع يدوياً مجلدات مثل:

- `node_modules/`
- `.next/`
- `backend/dist/`
- `.env` (الأسرار تُضبط من لوحة Render فقط)

---

## 5) بعد التشغيل — اربط الروابط ببعض

1. افتح رابط الواجهة: `https://businessos-web.onrender.com`  
2. تأكد أن تسجيل الدخول يعمل عبر الـ API  
3. في Backend Environment حدّث:

```env
FRONTEND_URL=https://businessos-web.onrender.com
API_URL=https://businessos-api.onrender.com
```

4. أعد Deploy للـ API (Manual Deploy → Deploy latest commit)

### واتساب Meta (Webhook)

في لوحة Meta:

```text
Callback URL:
https://businessos-api.onrender.com/api/webhooks/whatsapp

Verify Token:
نفس WHATSAPP_VERIFY_TOKEN في Environment
```

> خطة Free على Render قد تنام الخدمة بعد خمول — الويب هوك قد يتأخر. للإنتاج الحقيقي استخدم خطة مدفوعة أو Railway.

---

## 6) أوامر مفيدة محلياً قبل الرفع

```bash
# تأكد أن البناء ينجح
cd backend
npm install --legacy-peer-deps
npm run build

cd ../frontend
npm install --legacy-peer-deps
npm run build
```

إذا نجح البناء محلياً، غالباً ينجح على Render.

---

## 7) مشاكل شائعة

| المشكلة | الحل |
|---------|------|
| Frontend لا يتصل بالـ API | تأكد `NEXT_PUBLIC_API_URL` ينتهي بـ `/api` وأعد Build للواجهة |
| CORS / رفض طلبات | `FRONTEND_URL` في الـ backend = رابط الواجهة بالضبط |
| Mongo connection failed | Atlas Network Access يسمح `0.0.0.0/0` وكلمة المرور صحيحة في URI |
| Build يفشل على peer deps | استخدم دائماً `npm install --legacy-peer-deps` |
| الخدمة تنام (Free) | أول طلب بعد الخمول بطيء ~30–60 ثانية |

---

## ترتيب سريع (Checklist)

1. [ ] GitHub فيه المشروع  
2. [ ] MongoDB Atlas + `MONGODB_URI`  
3. [ ] Web Service → Root = `backend` → build/start أعلاه  
4. [ ] Web Service → Root = `frontend` → build/start أعلاه  
5. [ ] `NEXT_PUBLIC_API_URL` يشير للـ API  
6. [ ] `FRONTEND_URL` يشير للواجهة  
7. [ ] `npm run seed` على قاعدة Atlas  
8. [ ] تجربة دخول `demo@businessos.ai`
