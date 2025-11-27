# دليل النشر على Render - منصة Wisdom Connect

## 📋 المتطلبات الأساسية

قبل البدء، تأكد من أن لديك:
- ✅ حساب GitHub (مع رفع الكود)
- ✅ حساب Render (مجاني)
- ✅ Stripe API Keys
- ✅ SendGrid API Key
- ✅ Replit Auth credentials (CLIENT_ID, CLIENT_SECRET)

---

## 🚀 خطوات النشر الكاملة

### **الخطوة 1: إنشاء حساب على Render**

1. اذهب إلى: https://render.com
2. اضغط **"Get Started for Free"**
3. سجل دخول بحساب **GitHub**
4. ✅ اقبل الأذونات

---

### **الخطوة 2: إنشاء PostgreSQL Database**

1. من لوحة التحكم، اضغط **"New +"**
2. اختر **"PostgreSQL"**
3. املأ المعلومات:
   - **Name**: `wisdom-connect-db`
   - **Database**: `wisdomconnect`
   - **User**: (تلقائي)
   - **Region**: `Oregon (US West)` أو الأقرب لك
   - **Plan**: **Free**
4. اضغط **"Create Database"**
5. ⏳ انتظر حتى يكتمل الإنشاء (1-2 دقيقة)
6. 📝 **احتفظ بـ "Internal Database URL"** - ستحتاجه لاحقاً

---

### **الخطوة 3: إنشاء Web Service**

1. اضغط **"New +"** مرة أخرى
2. اختر **"Web Service"**
3. اربط GitHub repository:
   - اختر **"Connect a repository"**
   - اختر `wisdom-connect` repository
   - اضغط **"Connect"**

4. املأ معلومات الخدمة:
   - **Name**: `wisdom-connect`
   - **Region**: نفس المنطقة التي اخترتها للـ Database
   - **Branch**: `main`
   - **Runtime**: **Node**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

---

### **الخطوة 4: إضافة Environment Variables**

في قسم **"Environment"**، اضغط **"Add Environment Variable"** وأضف التالي:

#### **1. Database**
```
Key: DATABASE_URL
Value: [الصق Internal Database URL من الخطوة 2]
```

#### **2. Session Secret** (سيتم توليده تلقائياً)
```
Key: SESSION_SECRET
Value: [اضغط "Generate" أو ضع أي نص عشوائي طويل]
```

#### **3. Stripe Keys** (من حسابك على Stripe)
```
Key: STRIPE_SECRET_KEY
Value: sk_test_... أو sk_live_...

Key: STRIPE_PUBLISHABLE_KEY
Value: pk_test_... أو pk_live_...
```

#### **4. SendGrid** (من حسابك على SendGrid)
```
Key: SENDGRID_API_KEY
Value: SG.xxxxxxxxxxxxx
```

#### **5. Replit Auth** (من Replit)
```
Key: ISSUER_URL
Value: https://replit.com/

Key: CLIENT_ID
Value: [من Replit Auth Integration]

Key: CLIENT_SECRET
Value: [من Replit Auth Integration]
```

#### **6. Node Environment**
```
Key: NODE_ENV
Value: production
```

---

### **الخطوة 5: Deploy!**

1. اضغط **"Create Web Service"**
2. ⏳ Render سيبدأ البناء والنشر (5-10 دقائق)
3. راقب **"Logs"** للتأكد من عدم وجود أخطاء

---

### **الخطوة 6: إعداد Database Schema**

بعد نجاح النشر:

1. في صفحة Web Service، اذهب إلى **"Shell"**
2. نفذ الأمر التالي لإنشاء الجداول:
   ```bash
   npm run db:push
   ```
3. ✅ انتظر حتى يكتمل

---

### **الخطوة 7: الوصول للموقع**

1. في صفحة Web Service، ستجد **URL** مثل:
   ```
   https://wisdom-connect.onrender.com
   ```
2. 🎉 **افتح الرابط** - موقعك الآن حي!

---

## 🔧 إعدادات إضافية

### **تحديث الكود**
عند تحديث الكود على GitHub:
1. اضغط **"Manual Deploy"** في Render
2. اختر **"Deploy latest commit"**
3. ✅ سيتم النشر تلقائياً

### **Auto-Deploy**
لتفعيل النشر التلقائي:
1. اذهب إلى **Settings**
2. في **"Build & Deploy"**
3. فعّل **"Auto-Deploy"**
4. ✅ الآن كل push على GitHub = نشر تلقائي!

### **Custom Domain**
لإضافة نطاق خاص:
1. اذهب إلى **Settings → Custom Domain**
2. اضغط **"Add Custom Domain"**
3. اتبع التعليمات لإضافة DNS records

---

## ⚠️ استكشاف الأخطاء

### **خطأ "Build failed"**
- تحقق من Logs
- تأكد من صحة أوامر Build/Start في package.json

### **خطأ "Database connection failed"**
- تحقق من DATABASE_URL
- تأكد أن Database في نفس منطقة Web Service

### **خطأ "Module not found"**
- تأكد من تثبيت جميع المكتبات في package.json
- حاول إعادة Deploy

---

## 💰 التكلفة

- ✅ **Database (PostgreSQL)**: مجاني حتى 1 GB
- ✅ **Web Service**: مجاني حتى 750 ساعة/شهر
- ⚠️ **ملاحظة**: الخطة المجانية تتوقف بعد 15 دقيقة من عدم النشاط

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع **Render Documentation**: https://render.com/docs
2. تحقق من **Community Forum**: https://community.render.com
3. راجع **Logs** في لوحة التحكم

---

✅ **تهانينا! موقعك الآن منشور على Render!** 🎉
