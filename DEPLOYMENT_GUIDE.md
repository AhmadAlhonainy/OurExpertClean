# دليل النشر على Railway 🚀

## خطوة 1: إعداد GitHub

1. اذهب إلى https://github.com/new
2. أنشئ repository جديد باسم `experience-booking-platform`
3. بعد الإنشاء، نسخ الأوامر التالية:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/experience-booking-platform.git
git branch -M main
git push -u origin main
```

## خطوة 2: إعداد Railway

1. اذهب إلى https://railway.app
2. سجّل دخول بـ GitHub
3. اضغط "Create New Project"
4. اختر "Deploy from GitHub repo"
5. ختر repository `experience-booking-platform`

## خطوة 3: إضافة قاعدة البيانات

1. في لوحة Railway، اضغط "+ Add"
2. اختر "PostgreSQL"
3. Railway ستُنشئ قاعدة بيانات تلقائياً

## خطوة 4: تعيين المتغيرات البيئية

انسخ هذه المتغيرات وأضفها في Railway variables:

```
PORT=5000
NODE_ENV=production
SESSION_SECRET=generate-random-secret-key-here
DATABASE_URL=postgresql://user:password@host:port/db
```

**ملاحظة مهمة:** Railway ستملأ `DATABASE_URL` تلقائياً عند إضافة PostgreSQL.

للـ `SESSION_SECRET`: استخدم أي مفتاح عشوائي طويل (مثل: `your-super-secret-key-2024`)

## خطوة 5: النشر

1. عند حفظ المتغيرات، Railway ستبني الكود تلقائياً
2. عندما تكتمل البناء، ستظهر URL مثل: `yourapp.up.railway.app`
3. هذه هي URL التطبيق الحقيقية! 🎉

## الخادم جاهز الآن!

- جميع المستخدمين يرون نفس البيانات
- يدعم 1000+ مرشد بسهولة
- يعمل 24/7 بدون توقف