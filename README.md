# BusinessOS AI

نظام تشغيل مبيعات عبر واتساب + ذكاء اصطناعي + CRM + فواتير + فرص ضائعة.

## تشغيل

```bash
cd backend && npm install --legacy-peer-deps && npm run start:dev
cd frontend && npm install --legacy-peer-deps && npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:3001/api/health

## Seed

```bash
cd backend && npm run seed
```

| الحساب | البريد | كلمة المرور | الوجهة |
|--------|--------|-------------|--------|
| أدمن المنصة | `admin@businessos.ai` | `123456` | `/admin` |
| شركة تجريبية | `demo@businessos.ai` | `123456` | `/dashboard` |

## ربط واتساب عبر فيسبوك (الموصى به)

أفضل طريقة للسوق: **WhatsApp Embedded Signup** — صفحة تسجيل دخول فيسبوك داخل المنصة.

1. أنشئ تطبيق Meta (Business) + منتج WhatsApp  
2. Facebook Login for Business → Configuration بنوع Embedded Signup  
3. في `backend/.env`:

```bash
META_APP_ID=...
META_APP_SECRET=...
META_EMBEDDED_SIGNUP_CONFIG_ID=...
```

4. افتح: http://localhost:3000/dashboard/whatsapp/connect  

البديل اليدوي يبقى في `/dashboard/whatsapp` (Phone Number ID + Token).

## الدفع

`PAYMENT_PROVIDER=demo|stripe|moyasar` في `.env`

- **demo**: فاتورة + تأكيد من `/dashboard/billing` (يُعطَّل تلقائياً عند `NODE_ENV=production` إلا إذا `ALLOW_DEMO_PAYMENTS=true`)
- **stripe / moyasar**: checkout حقيقي عبر المفاتيح في `.env.example`

## ما تم إضافته

- فواتير اشتراك المنصة · تقارير نمو/Churn
- أدوار أدمن (دعم/مالية) · Impersonate · CSV · أرشفة
- تنبيهات انتهاء الاشتراك · حدود رسائل يومية
- فريق بالدعوات · White-label · Webhooks · CI
- متابعات تشغيلية (`/dashboard/followups`) · تقارير الشركة (`/dashboard/reports`)
- إيقاف AI لكل محادثة · تعيين موظف · ردود سريعة في الصندوق
- استعادة كلمة المرور · إشعارات داخل التطبيق
- نشر المحتوى كحملة واتساب من استوديو المحتوى
