<div align="center">

# ⚖️ JurisFlow

### **Gelişmiş Hukuk Bürosu Yönetim Platformu**

*Türkiye'nin en kapsamlı, modern ve kullanıcı dostu hukuk bürosu yazılımı*

---

![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js)
![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748?style=for-the-badge&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql)

---

🌐 **[Demo Uygulamayı Dene](https://jurisflow3-production.up.railway.app)** | 📖 **[Dokümantasyon](#-kullanım-kılavuzu)** | 💬 **[Destek](#-destek)**

</div>

---

## 📋 İçindekiler

- [🎯 Proje Hakkında](#-proje-hakkında)
- [✨ Temel Özellikler](#-temel-özellikler)
- [🖥️ Ekran Görüntüleri](#️-ekran-görüntüleri)
- [🛠️ Teknoloji Yığını](#️-teknoloji-yığını)
- [🚀 Kurulum](#-kurulum)
- [👥 Kullanıcı Rolleri](#-kullanıcı-rolleri)
- [📁 Proje Yapısı](#-proje-yapısı)
- [🔌 API Endpoints](#-api-endpoints)
- [📊 Veritabanı Şeması](#-veritabanı-şeması)
- [🔐 Güvenlik](#-güvenlik)
- [📞 Destek](#-destek)

---

## 🎯 Proje Hakkında

**JurisFlow**, hukuk bürolarının günlük operasyonlarını dijitalleştirmek ve verimliliklerini maksimum seviyeye çıkarmak için tasarlanmış **kapsamlı bir yönetim sistemidir**.

### 🎪 Neden JurisFlow?

| Özellik | Açıklama |
|---------|----------|
| 🚀 **Modern Arayüz** | Glassmorphism, karanlık mod ve mikro-animasyonlar ile premium tasarım |
| 📱 **PWA Desteği** | Offline çalışma ve mobil uygulama deneyimi |
| 🤖 **AI Entegrasyonu** | Google Gemini ile akıllı belge oluşturma |
| 💰 **Gelişmiş Faturalama** | Trust accounting, IOLTA ve kısmi ödeme desteği |
| 📊 **Detaylı Raporlama** | Finansal analiz ve performans metrikleri |
| 🔔 **Akıllı Bildirimler** | Push notification ve email hatırlatıcıları |

### 🎯 Hedef Kullanıcılar

- ⚖️ **Avukatlar ve Hukuk Danışmanları**
- 🏢 **Hukuk Bürosu Yöneticileri**
- 📋 **Paralegaller ve Stajyer Avukatlar**
- 👥 **İdari Personel ve Sekreterler**
- 💼 **Müvekkiller** (Müvekkil Portalı üzerinden)

---

## ✨ Temel Özellikler

### 📊 Dashboard - Ana Kontrol Paneli

- 📈 Gerçek zamanlı istatistik kartları
- 📅 Yaklaşan görev ve etkinlik bildirimleri
- 💵 Finansal özet (bekleyen faturalar, tahsilat durumu)
- 📊 Haftalık/aylık performans grafikleri
- 🎯 Hedef takibi ve üretkenlik metrikleri

---

### 📁 Dava Yönetimi (Matters)

| Özellik | Açıklama |
|---------|----------|
| ➕ Dava Oluşturma | Detaylı dava dosyası oluşturma |
| 👥 Müvekkil İlişkilendirme | Davayı müvekkile bağlama |
| 📊 Durum Takibi | Open, Pending, Trial, Closed |
| 💰 Trust Account | Emanet hesap yönetimi |
| 📋 Görev Atama | Davaya özel görevler |
| 📄 Doküman Yönetimi | Dava bazlı dosya organizasyonu |
| ⏱️ Zaman Kayıtları | Dava bazlı saat takibi |
| 📧 İletişim Geçmişi | Müvekkil yazışmaları |

---

### ⏱️ Zaman Yönetimi (Time Tracker)

- ⏲️ **Gerçek Zamanlı Timer**: Tek tıkla başlat/durdur
- 📝 **Manuel Kayıt**: Geçmişe dönük giriş
- 💼 **Dava Bazlı**: Her kayıt bir davaya bağlı
- 💰 **Faturalanabilir Saat**: Otomatik hesaplama
- 📊 **Raporlama**: Günlük/haftalık/aylık özet
- 🏷️ **Masraf Takibi**: Ek masrafların kaydı

---

### 💰 Faturalama & Trust Accounting

```
┌────────────────────────────────────────────────────────────────┐
│                    💰 FATURALAMA MODÜLLERİ                     │
├────────────────────────────────────────────────────────────────┤
│  📄 Profesyonel Fatura          │  💵 Trust Accounting         │
│  ├─ KDV Hesaplama               │  ├─ IOLTA Uyumlu            │
│  ├─ İndirim Uygulama            │  ├─ Emanet Takibi           │
│  ├─ Kalem Bazlı Detay           │  ├─ Otomatik Uyarılar       │
│  └─ PDF Export                  │  └─ Müvekkil Bildirimleri   │
│                                 │                              │
│  💳 Ödeme Yönetimi              │  📊 Finansal Raporlar        │
│  ├─ Kısmi Ödeme                 │  ├─ Gelir Analizi           │
│  ├─ Çoklu Ödeme Yöntemi         │  ├─ Tahsilat Durumu         │
│  ├─ Otomatik Bakiye             │  ├─ Performans Metrikleri   │
│  └─ Ödeme Geçmişi               │  └─ Excel Export            │
└────────────────────────────────────────────────────────────────┘
```

**Fatura Durumları:**
- 📝 **Draft** - Taslak
- 📤 **Sent** - Gönderildi
- ⏳ **Pending** - Onay Bekliyor
- 💵 **Partially Paid** - Kısmi Ödendi
- ✅ **Paid** - Ödendi
- ⚠️ **Overdue** - Vadesi Geçti

---

### 📅 Takvim & Planlama

- 📆 **Aylık/Haftalık/Günlük** görünüm
- ⚖️ **Duruşma Takibi**: Mahkeme tarihleri
- 📋 **Deadline Yönetimi**: Kritik son tarihler
- 👥 **Toplantı Planlama**: Müvekkil görüşmeleri
- 🔔 **Otomatik Hatırlatma**: Email/Push
- 🎨 **Renk Kodlama**: Etkinlik tiplerine göre

---

### 📋 Görev Yönetimi (Kanban)

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   BEKLEYEN  │  DEVAM EDEN │   KONTROL   │  TAMAMLANDI │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │
│ │🔴 Acil  │ │ │🟡 Normal│ │ │🟢 İncel.│ │ │✅ Bitti │ │
│ │ Dilekçe │ │ │ Araştır │ │ │ Dosyayı │ │ │ Müvekkil│ │
│ │ Hazırla │ │ │         │ │ │ Kontrol │ │ │ Bilgi   │ │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │ └─────────┘ │
│ ┌─────────┐ │             │             │ ┌─────────┐ │
│ │🟡 Orta  │ │             │             │ │✅ Bitti │ │
│ │ Email   │ │             │             │ │ Fatura  │ │
│ │ Gönder  │ │             │             │ │ Gönder  │ │
│ └─────────┘ │             │             │ └─────────┘ │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

- 🎯 **Sürükle-Bırak**: Kolay durum değişikliği
- 🏷️ **Öncelik Sistemi**: Yüksek, Orta, Düşük
- 📅 **Deadline Takibi**: Renk kodlu uyarılar
- 🔗 **Dava Bağlantısı**: Davaya özel görevler
- 📋 **Şablon Sistemi**: Hazır görev listeleri
- ✅ **Sonuç Takibi**: Başarılı/Başarısız

---

### 📄 Doküman Yönetimi

| Özellik | Desteklenen Formatlar |
|---------|----------------------|
| 📤 **Yükleme** | PDF, DOCX, TXT, JPG, PNG |
| 🔍 **Önizleme** | PDF, Resim dosyaları |
| 📁 **Organizasyon** | Dava bazlı klasörleme |
| 🏷️ **Etiketleme** | Tag ve açıklama ekleme |
| 📥 **İndirme** | Tek/toplu indirme |
| 🔄 **Versiyon** | Dosya sürüm takibi |

---

### 🤖 AI Belge Oluşturma (Google Gemini)

```
┌────────────────────────────────────────────────────────────────┐
│                    🤖 AI BELGE OLUŞTURUCU                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   📝 Desteklenen Belge Tipleri:                                │
│                                                                │
│   ⚖️ DİLEKÇELER          📋 SÖZLEŞMELER        📧 İHTARNAMELER │
│   ├─ Dava Dilekçesi      ├─ İş Sözleşmesi      ├─ Kira İhtarı │
│   ├─ Cevap Dilekçesi     ├─ Kira Sözleşmesi    ├─ Ödeme İhtarı│
│   ├─ Temyiz Dilekçesi    ├─ Hizmet Sözleşmesi  └─ Genel İhtar │
│   └─ Bilirkişi İtiraz    └─ Gizlilik Sözl.                    │
│                                                                │
│   🎯 Nasıl Çalışır?                                            │
│   1. Belge tipini seçin                                       │
│   2. Detayları girin (müvekkil, konu, tarih vb.)              │
│   3. "Oluştur" butonuna tıklayın                              │
│   4. AI belgeyi saniyeler içinde hazırlar                     │
│   5. Düzenleyin ve dışa aktarın (DOCX/PDF)                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### 👥 Müvekkil Yönetimi (CRM)

- 👤 **Müvekkil Profilleri**: Detaylı bilgi kartları
- 📞 **İletişim Bilgileri**: Telefon, email, adres
- 💼 **Şirket Bilgileri**: Kurumsal müvekkiller için
- 📊 **Lead Takibi**: Potansiyel müşteri yönetimi
- 📈 **Dönüşüm Analizi**: Lead → Müvekkil

---

### 🔐 Müvekkil Portalı

Müvekkillerin kendi hesaplarından erişebildiği özel portal:

| Özellik | Açıklama |
|---------|----------|
| 📊 **Dava Durumu** | Davalarının güncel durumunu görme |
| 📄 **Dokümanlar** | Paylaşılan belgeleri indirme |
| 💰 **Faturalar** | Fatura görüntüleme ve ödeme |
| 💬 **Mesajlaşma** | Avukat ile iletişim |
| 📅 **Randevu Talebi** | Online randevu oluşturma |
| ✍️ **E-İmza** | Belge imzalama (yakında) |

---

### 👨‍💼 Çalışan Yönetimi

- 📋 **Personel Kayıtları**: Tüm çalışan bilgileri
- 🏷️ **Rol Ataması**: Sekreter, Paralegal, Stajyer, Muhasebeci
- 📊 **Performans Takibi**: Görev tamamlama metrikleri
- 💰 **Maaş Bilgileri**: Finansal kayıtlar
- 👤 **Sistem Hesabı**: Kullanıcı hesabı ilişkilendirme

---

### ⚙️ Otomasyon & Workflow

```
Tetikleyici                    Aksiyonlar
─────────────────────────────────────────────────────
📁 Yeni Dava Açıldı     →     📧 Hoş geldin emaili gönder
                               📋 Standart görevler oluştur
                               🔔 Ekibe bildirim gönder

⏰ Deadline Yaklaştı    →     📧 Hatırlatma emaili
                               🔔 Push bildirim
                               📋 Kontrol görevi oluştur

✅ Görev Tamamlandı     →     👤 Yöneticiye bildir
                               📊 Raporu güncelle

💰 Fatura Oluşturuldu   →     📧 Müvekkile email
                               🔔 Bildirim gönder
─────────────────────────────────────────────────────
```

---

### 📊 Raporlama & Analitik

- 📈 **Finansal Raporlar**: Gelir, gider, kar analizi
- ⏱️ **Zaman Raporları**: Avukat bazlı performans
- 📊 **Dava Analizi**: Durum dağılımı, kazanma oranı
- 👥 **Müvekkil Analizi**: Segment bazlı analiz
- 📋 **Görev Raporları**: Tamamlanma metrikleri
- 📤 **Dışa Aktarma**: Excel, PDF, CSV

---

### 🔔 Bildirim Sistemi

| Kanal | Kullanım |
|-------|----------|
| 🔔 **Push Notification** | Anlık uygulama bildirimleri |
| 📧 **Email** | Önemli güncellemeler |
| 📱 **SMS** | Kritik uyarılar (opsiyonel) |
| 🔕 **Tercihler** | Kanal ve saat ayarları |

---

### 📱 PWA - Mobil Uygulama Deneyimi

- 📲 **Ana Ekrana Ekle**: Uygulama gibi kullanım
- 📶 **Offline Çalışma**: İnternet olmadan da erişim
- 🔔 **Push Bildirimler**: Mobil bildirimler
- 💾 **Önbellekleme**: Hızlı yükleme

---

## 🛠️ Teknoloji Yığını

### Frontend

| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| ⚛️ React | 19.0 | UI Framework |
| 📘 TypeScript | 5.8 | Type Safety |
| ⚡ Vite | 6.0 | Build Tool |
| 🎨 CSS (Custom) | - | Premium Styling |
| 📊 Recharts | 3.x | Grafikler |
| 🎯 @hello-pangea/dnd | 18.x | Drag & Drop |

### Backend

| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| 🟢 Node.js | 20+ | Runtime |
| 🚂 Express | 5.x | HTTP Server |
| 🔷 Prisma | 5.15 | ORM |
| 🐘 PostgreSQL | 15+ | Database |
| 🔐 JWT | 9.x | Authentication |
| 📁 Multer | 1.x | File Upload |
| 🤖 Google Gemini | - | AI Integration |

### DevOps & Hosting

| Teknoloji | Kullanım |
|-----------|----------|
| 🚂 Railway | Production Hosting |
| 📦 GitHub | Version Control |
| 🔄 GitHub Actions | CI/CD (opsiyonel) |

---

## 🚀 Kurulum

### Gereksinimler

- Node.js 20+
- npm veya yarn
- PostgreSQL veritabanı (veya Railway)

### Yerel Kurulum

```bash
# 1. Repoyu klonlayın
git clone https://github.com/cffatjh/jurisflow3.git
cd jurisflow3

# 2. Bağımlılıkları yükleyin
npm install

# 3. Ortam değişkenlerini ayarlayın
cp .env.example .env
# .env dosyasını düzenleyin

# 4. Veritabanını oluşturun
npx prisma db push
npx prisma generate

# 5. Admin kullanıcı oluşturun
npm run setup-admin

# 6. Geliştirme sunucusunu başlatın
npm run dev
```

### Ortam Değişkenleri (.env)

```env
# Veritabanı
DATABASE_URL="postgresql://user:password@host:5432/database"

# Güvenlik
JWT_SECRET="super-secret-jwt-key-change-this"

# Google Gemini AI (opsiyonel)
GEMINI_API_KEY="your-gemini-api-key"

# Email (SMTP - opsiyonel)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email"
SMTP_PASS="your-password"

# Push Notifications (opsiyonel)
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
```

### Railway Deployment

```bash
# 1. GitHub'a push edin
git push origin main

# 2. Railway'de yeni proje oluşturun
# 3. GitHub reposunu bağlayın
# 4. Environment variables ekleyin
# 5. Deploy otomatik başlayacaktır
```

---

## 👥 Kullanıcı Rolleri

| Rol | Yetkiler |
|-----|----------|
| 🔴 **Admin** | Tam yetki, kullanıcı yönetimi, sistem ayarları |
| 🟡 **Partner** | Dava, fatura, rapor, çalışan yönetimi |
| 🟢 **Associate** | Dava, görev, zaman kaydı |
| 🔵 **Employee** | Atanan görevler, zaman kaydı |
| 👤 **Client** | Portal erişimi, dava görüntüleme |

### Demo Hesapları

| Rol | Email | Şifre |
|-----|-------|-------|
| Admin | hilal@jf.com | hilal123 |
| Admin | tdeniz@jf.com | tdeniz123 |
| Avukat | avukat@gmail.com | avukat |
| Müvekkil | müvekkil@jurisflow.com | müvekkil123 |

---

## 📁 Proje Yapısı

```
jurisflow/
├── 📁 components/              # React Bileşenleri
│   ├── Dashboard.tsx           # Ana panel
│   ├── Matters.tsx             # Dava yönetimi
│   ├── TimeTracker.tsx         # Zaman takibi
│   ├── Billing.tsx             # Faturalama
│   ├── TrustAccounting.tsx     # Emanet hesap
│   ├── CalendarView.tsx        # Takvim
│   ├── Documents.tsx           # Dokümanlar
│   ├── Tasks.tsx               # Görevler
│   ├── CRM.tsx                 # Müvekkil yönetimi
│   ├── Reports.tsx             # Raporlama
│   ├── Employees.tsx           # Çalışanlar
│   ├── WorkflowBuilder.tsx     # Otomasyon
│   ├── AIDrafter.tsx           # AI belge oluşturucu
│   ├── AdminPanel.tsx          # Admin yönetimi
│   ├── Settings.tsx            # Ayarlar
│   └── 📁 client/              # Müvekkil portalı
│       ├── ClientPortal.tsx
│       ├── ClientLogin.tsx
│       ├── ClientDashboard.tsx
│       ├── ClientMatters.tsx
│       ├── ClientMessages.tsx
│       └── ClientAppointments.tsx
│
├── 📁 contexts/                # React Context
│   ├── AuthContext.tsx         # Kimlik doğrulama
│   ├── ClientAuthContext.tsx   # Müvekkil auth
│   ├── DataContext.tsx         # Veri yönetimi
│   ├── LanguageContext.tsx     # Çoklu dil
│   └── ThemeContext.tsx        # Tema (karanlık mod)
│
├── 📁 server/                  # Backend
│   ├── index.ts                # Ana sunucu + API
│   ├── 📁 middleware/          # Ara yazılımlar
│   │   ├── errorHandler.ts     # Hata yönetimi
│   │   ├── fileUpload.ts       # Dosya yükleme
│   │   └── auditLog.ts         # İşlem kaydı
│   └── 📁 services/            # Servisler
│       ├── emailService.ts     # Email gönderimi
│       └── pdfService.ts       # PDF oluşturma
│
├── 📁 prisma/
│   └── schema.prisma           # Veritabanı şeması
│
├── 📁 public/
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service Worker
│   └── offline.html            # Offline sayfası
│
├── App.tsx                     # Ana uygulama
├── types.ts                    # TypeScript tipleri
├── translations.ts             # Dil dosyaları
└── index.css                   # Global stiller
```

---

## 🔌 API Endpoints

### 🔐 Kimlik Doğrulama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/login` | Kullanıcı girişi |
| POST | `/api/client/login` | Müvekkil girişi |
| POST | `/api/auth/forgot-password` | Şifre sıfırlama emaili |
| POST | `/api/auth/reset-password` | Yeni şifre belirleme |

### 📁 Davalar (Matters)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/matters` | Tüm davalar |
| POST | `/api/matters` | Yeni dava oluştur |
| PUT | `/api/matters/:id` | Dava güncelle |
| DELETE | `/api/matters/:id` | Dava sil |

### 📋 Görevler (Tasks)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/tasks` | Tüm görevler |
| POST | `/api/tasks` | Yeni görev |
| PUT | `/api/tasks/:id` | Görev güncelle |
| DELETE | `/api/tasks/:id` | Görev sil |
| POST | `/api/tasks/from-template` | Şablondan oluştur |

### 📄 Dokümanlar

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/documents` | Tüm dokümanlar |
| POST | `/api/documents/upload` | Dosya yükle |
| PUT | `/api/documents/:id` | Doküman güncelle |
| DELETE | `/api/documents/:id` | Doküman sil |
| GET | `/api/documents/:id/download` | Dosya indir |

### 💰 Faturalar

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/invoices` | Tüm faturalar |
| POST | `/api/invoices` | Yeni fatura |
| PUT | `/api/invoices/:id` | Fatura güncelle |
| POST | `/api/invoices/:id/payments` | Ödeme kaydet |
| GET | `/api/invoices/:id/pdf` | PDF indir |

### 💵 Trust Accounting

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/trust/transactions` | İşlemler |
| POST | `/api/trust/transactions` | Yeni işlem |
| GET | `/api/trust/summary` | Özet |

### 👥 Admin

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/admin/users` | Kullanıcılar |
| POST | `/api/admin/users` | Yeni kullanıcı |
| PUT | `/api/admin/users/:id` | Güncelle |
| DELETE | `/api/admin/users/:id` | Sil |
| GET | `/api/admin/audit-logs` | İşlem kayıtları |

---

## 📊 Veritabanı Şeması

### Ana Modeller

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      User       │     │     Client      │     │     Matter      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ email           │     │ name            │     │ caseNumber      │
│ name            │     │ email           │     │ name            │
│ role            │     │ phone           │     │ practiceArea    │
│ passwordHash    │     │ company         │     │ status          │
│ phone           │     │ type            │     │ clientId ───────┼──→
│ ...             │     │ portalEnabled   │     │ trustBalance    │
└─────────────────┘     │ passwordHash    │     │ ...             │
                        └─────────────────┘     └─────────────────┘
                                ↑                       ↑
                                │                       │
        ┌───────────────────────┴───────────────────────┤
        │                                               │
┌───────┴─────────┐     ┌─────────────────┐     ┌───────┴─────────┐
│    Invoice      │     │      Task       │     │   TimeEntry     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ number          │     │ title           │     │ matterId        │
│ amount          │     │ description     │     │ description     │
│ status          │     │ priority        │     │ duration        │
│ clientId        │     │ status          │     │ rate            │
│ matterId        │     │ matterId        │     │ date            │
│ ...             │     │ dueDate         │     │ billed          │
└─────────────────┘     │ outcome         │     └─────────────────┘
                        └─────────────────┘
```

### Tüm Modeller

| Model | Açıklama |
|-------|----------|
| User | Sistem kullanıcıları |
| Client | Müvekkiller |
| Matter | Davalar |
| Task | Görevler |
| TaskTemplate | Görev şablonları |
| TimeEntry | Zaman kayıtları |
| Expense | Masraflar |
| Invoice | Faturalar |
| InvoiceLineItem | Fatura kalemleri |
| InvoicePayment | Ödemeler |
| Document | Dokümanlar |
| DocumentVersion | Doküman versiyonları |
| CalendarEvent | Takvim etkinlikleri |
| Employee | Çalışanlar |
| Notification | Bildirimler |
| ClientMessage | Müvekkil mesajları |
| TrustTransaction | Emanet işlemleri |
| TrustRequest | Emanet talepleri |
| DeadlineRule | Deadline kuralları |
| CalculatedDeadline | Hesaplanan deadlinelar |
| Workflow | Otomasyon akışları |
| WorkflowExecution | Akış çalıştırma kayıtları |
| SignatureRequest | E-imza talepleri |
| AppointmentRequest | Randevu talepleri |
| AuditLog | Denetim günlükleri |
| PushSubscription | Push abonelikleri |
| PasswordResetToken | Şifre sıfırlama |
| DocumentTemplate | Belge şablonları |
| Reminder | Hatırlatıcılar |
| Payment | Ödemeler |
| PaymentReminder | Ödeme hatırlatıcıları |

---

## 🔐 Güvenlik

| Önlem | Açıklama |
|-------|----------|
| 🔒 **JWT Authentication** | Güvenli token tabanlı kimlik doğrulama |
| 🔑 **bcrypt** | Şifrelerin güvenli hash'lenmesi |
| 🛡️ **Helmet** | HTTP güvenlik başlıkları |
| ⚡ **Rate Limiting** | DDoS koruması |
| 📝 **Audit Logging** | Tüm işlemlerin kaydı |
| 🔐 **CORS** | Cross-Origin güvenliği |
| ✅ **Input Validation** | Giriş doğrulama |

---

## 📱 PWA Kurulumu

### Chrome/Edge (Desktop)

1. Siteyi açın
2. Adres çubuğundaki "Yükle" ikonuna tıklayın
3. "Yükle" butonuna basın

### Chrome (Android)

1. Siteyi açın
2. Menü → "Ana ekrana ekle"
3. "Ekle" butonuna basın

### Safari (iOS)

1. Siteyi açın
2. Paylaş butonu → "Ana Ekrana Ekle"
3. "Ekle" butonuna basın

---

## 📞 Destek

### İletişim

- 📧 **Email**: support@jurisflow.com
- 💬 **GitHub Issues**: [Sorun Bildir](https://github.com/cffatjh/jurisflow3/issues)
- 📖 **Wiki**: [Dokümantasyon](https://github.com/cffatjh/jurisflow3/wiki)

### SSS

<details>
<summary><b>Şifremi unuttum, ne yapmalıyım?</b></summary>
Giriş sayfasındaki "Şifremi Unuttum" linkine tıklayarak email ile şifre sıfırlama talebinde bulunabilirsiniz.
</details>

<details>
<summary><b>Müvekkil portalına nasıl erişirim?</b></summary>
/client-portal adresine giderek müvekkil email ve şifrenizle giriş yapabilirsiniz.
</details>

<details>
<summary><b>Offline modda ne yapabilirim?</b></summary>
PWA olarak yüklediyseniz, daha önce görüntülediğiniz sayfaları offline olarak görüntüleyebilirsiniz.
</details>

---

## 📜 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

<div align="center">

### 🚀 JurisFlow ile Hukuk Büronuzu Dijitalleştirin!

**Modern • Güvenli • Kapsamlı**

---

⭐ Bu projeyi beğendiyseniz, GitHub'da yıldız vermeyi unutmayın!

[![GitHub Stars](https://img.shields.io/github/stars/cffatjh/jurisflow3?style=social)](https://github.com/cffatjh/jurisflow3)

</div>
