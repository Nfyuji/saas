# دليل الإطلاق الليلة — BusinessOS AI

## تشغيل سريع (٥ دقائق)

### 1) تأكد أن MongoDB يعمل
خدمة MongoDB على الجهاز يجب أن تكون Running.

### 2) تثبيت وتشغيل

```bash
cd backend
npm install --legacy-peer-deps
# تأكد من وجود backend/.env

cd ../frontend
npm install --legacy-peer-deps

# الطرفية 1
cd backend && npm run start:dev

# الطرفية 2
cd frontend && npm run dev
```

أو من الجذر بعد `npm install` في المجلد الرئيسي:

```bash
npm run install:all
npm run seed
npm run dev
```

### 3) افتح المنصة
- الواجهة: http://localhost:3000
- API / Health: http://localhost:3001/api/health

### 4) حساب العرض (بعد seed)
- البريد: `demo@businessos.ai`
- كلمة المرور: `123456`

أو سجّل حساباً جديداً → سيذهب لـ **Onboarding** تلقائياً.

---

## مسار الإطلاق التجريبي الليلة

1. تسجيل شركة جديدة
2. اختيار القطاع في Onboarding
3. تفعيل واتساب التجريبي
4. محاكاة رسالة عميل
5. مشاهدة:
   - الرد في صندوق الرسائل
   - صفقة جديدة
   - متابعة مجدولة
   - قاعدة المعرفة (إن وُجدت)
6. أنشئ فاتورة من صفحة الفواتير وأرسل نص واتساب

---

## ربط واتساب الحقيقي (بعد التجربة)

1. Meta Developers → WhatsApp → API Setup
2. انسخ Phone Number ID + Access Token
3. لوحة التحكم → إعدادات واتساب → حفظ الربط الحقيقي
4. Webhook:
   - URL: `https://YOUR_PUBLIC_URL/api/webhooks/whatsapp`
   - Verify Token: من `WHATSAPP_VERIFY_TOKEN` في `.env`
   - Subscribe: `messages`
5. للتطوير المحلي: `ngrok http 3001`

---

## متغيرات مهمة (`backend/.env`)

```
MONGODB_URI=mongodb://localhost:27017/businessos
JWT_SECRET= ضع سراً قوياً
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
WHATSAPP_VERIFY_TOKEN=businessos-verify
OPENAI_API_KEY=  (اختياري — يعمل بدونها بردود افتراضية)
```

---

## قائمة تحقق الإطلاق

- [ ] `/api/health` يعمل
- [ ] تسجيل/دخول يعمل
- [ ] Onboarding يطبق قطاعاً
- [ ] Demo WhatsApp يحاكي رسالة ويرد
- [ ] Inbox يعرض المحادثة
- [ ] الصفقات/الفواتير/المعرفة/الاشتراك تظهر
- [ ] JWT_SECRET مغيّر عن الافتراضي قبل نشر عام
- [ ] OPENAI_API_KEY إن أردت ردوداً احترافية

---

## ملاحظات

- وضع Demo كافٍ للعروض الليلة بدون Meta.
- الدفع الحقيقي (Moyasar/Stripe) جاهز للربط لاحقاً؛ حالياً رابط دفع تجريبي `/pay/INV-...`.
- لا تنشر Access Token الحقيقي في Git.
