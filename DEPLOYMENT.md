# JurisFlow Deployment Rehberi

Bu rehber, JurisFlow'u ücretsiz platformlara nasıl deploy edeceğinizi gösterir.

---

## 🚀 Hızlı Başlangıç (Railway - Önerilen)

### Neden Railway?
- ✅ Ücretsiz tier (aylık $5 kredi)
- ✅ Node.js + PostgreSQL dahil
- ✅ Otomatik deploy (GitHub entegrasyonu)
- ✅ Türkiye'den erişilebilir

### Adım 1: Hazırlık

```bash
# 1. Projeyi GitHub'a yükleyin
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/KULLANICI/jurisflow.git
git push -u origin main
```

### Adım 2: Railway Hesabı

1. [railway.app](https://railway.app) adresine gidin
2. GitHub ile giriş yapın

### Adım 3: Yeni Proje Oluşturma

1. **Dashboard** → **New Project** → **Deploy from GitHub repo**
2. **jurisflow** reposunu seçin
3. Railway otomatik olarak Node.js projesini algılayacak

### Adım 4: PostgreSQL Ekleme

1. Proje sayfasında **+ New** → **Database** → **PostgreSQL**
2. Veritabanı oluşturulunca otomatik bağlanır

### Adım 5: Environment Variables

Proje ayarlarında şu değişkenleri ekleyin:

```env
NODE_ENV=production
JWT_SECRET=guclu-bir-secret-key-buraya-yazin
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=3001
```

### Adım 6: Build Ayarları

**Settings** → **Build** kısmına:

```bash
# Build Command
npm install && npx prisma generate && npx prisma db push && npm run build

# Start Command  
npm run start:prod
```

### Adım 7: package.json Güncelleme

```json
{
  "scripts": {
    "build": "vite build",
    "start:prod": "node dist/server/index.js",
    "postinstall": "prisma generate"
  }
}
```

---

## 🌐 Alternatif: Render.com

### Adım 1: Hesap Oluşturma
1. [render.com](https://render.com) → Sign Up (GitHub ile)

### Adım 2: Web Service Oluşturma
1. **New** → **Web Service**
2. GitHub repo bağlayın
3. Ayarlar:
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `node server/index.js`

### Adım 3: Environment Variables
```env
NODE_ENV=production
JWT_SECRET=your-secret-key
DATABASE_URL=your-database-url
```

### Adım 4: PostgreSQL (Opsiyonel)
1. **New** → **PostgreSQL**
2. DATABASE_URL'yi web service'e ekleyin

---

## ⚡ Frontend: Vercel (Ücretsiz)

Frontend'i ayrı deploy etmek için:

### Adım 1: Vercel Hesabı
1. [vercel.com](https://vercel.com) → GitHub ile giriş

### Adım 2: Import Project
1. **New Project** → GitHub repo seçin
2. **Framework Preset**: Vite
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`

### Adım 3: Environment Variables
```env
VITE_API_URL=https://your-railway-backend.up.railway.app
```

---

## 📦 Production Build Ayarları

### 1. Prisma PostgreSQL için Güncelleme

`prisma/schema.prisma` dosyasını güncelleyin:

```prisma
datasource db {
  provider = "postgresql"  // SQLite yerine PostgreSQL
  url      = env("DATABASE_URL")
}
```

### 2. Server CORS Ayarları

`server/index.ts` dosyasına ekleyin:

```typescript
// Production CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.vercel.app']
    : ['http://localhost:3000'],
  credentials: true
};

app.use(cors(corsOptions));
```

### 3. Static Files Sunumu

Production'da frontend'i backend'den sunmak için:

```typescript
// server/index.ts - Production static serving
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}
```

---

## 🔧 Hızlı Kontrol Listesi

### Deploy Öncesi
- [ ] `.env` dosyası `.gitignore`'da mı?
- [ ] `package.json`'da start scripti var mı?
- [ ] Prisma schema doğru provider'ı kullanıyor mu?
- [ ] CORS ayarları production domain'leri içeriyor mu?

### Deploy Sonrası
- [ ] Database migration çalıştı mı?
- [ ] Environment variables doğru mu?
- [ ] API endpoint'leri erişilebilir mi?
- [ ] Frontend backend'e bağlanabiliyor mu?

---

## 💰 Maliyet Karşılaştırması

| Platform | Ücretsiz Tier | Ücretli |
|----------|---------------|---------|
| **Railway** | $5/ay kredi | $5'dan başlar |
| **Render** | 750 saat/ay | $7/ay |
| **Vercel** | Sınırsız static | $20/ay (Pro) |
| **Supabase** (DB) | 500MB ücretsiz | $25/ay |

### Önerilen Combo (Tamamen Ücretsiz Başlangıç)
1. **Backend**: Railway (ücretsiz tier)
2. **Frontend**: Vercel (ücretsiz)
3. **Database**: Railway PostgreSQL (dahil)

---

## 🆘 Sorun Giderme

### "Cannot find module" hatası
```bash
npm install
npx prisma generate
```

### Database connection hatası
- DATABASE_URL environment variable'ı kontrol edin
- Railway'de PostgreSQL addon'ının bağlı olduğundan emin olun

### CORS hatası
- Backend'deki CORS origin listesine frontend domain'ini ekleyin

### Build hatası
```bash
# Local'de test edin
npm run build
npm run start:prod
```

---

## 📞 Yardım

Railway veya Render ile ilgili sorunlarınız için:
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
