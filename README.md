# JurisFlow - Hukuk Bürosu Yönetim Sistemi

<div align="center">

![JurisFlow](https://img.shields.io/badge/JurisFlow-v1.0.0-blue)
![React](https://img.shields.io/badge/React-19.0-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)
![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748)

**Modern, kullanıcı dostu hukuk bürosu yönetim platformu**

</div>

---

## 📋 İçindekiler

- [Genel Bakış](#-genel-bakış)
- [Özellikler](#-özellikler)
- [Teknoloji Yığını](#-teknoloji-yığını)
- [Kurulum](#-kurulum)
- [Proje Yapısı](#-proje-yapısı)
- [API Endpoints](#-api-endpoints)
- [Veritabanı Şeması](#-veritabanı-şeması)
- [Konfigürasyon](#-konfigürasyon)

---

## 🎯 Genel Bakış

JurisFlow, hukuk bürolarının günlük operasyonlarını dijitalleştirmek ve verimliliklerini artırmak için tasarlanmış kapsamlı bir yönetim sistemidir. Dava takibi, müvekkil yönetimi, zaman kayıtları, faturalama ve doküman yönetimi gibi temel işlevleri tek bir platformda birleştirir.

### Hedef Kullanıcılar
- Avukatlar ve hukuk danışmanları
- Hukuk bürosu yöneticileri
- Paralegaller ve stajyer avukatlar
- İdari personel

---

## ✨ Özellikler

### 📊 Dashboard
- Gerçek zamanlı istatistik kartları
- Günlük/haftalık performans özetleri
- Yaklaşan görev ve etkinlik bildirimleri
- Finansal özet (bekleyen faturalar, tahsilat durumu)

### 📁 Dava Yönetimi (Matters)
- Dava oluşturma ve düzenleme
- Müvekkil ilişkilendirme
- Durum takibi (Open, Pending, Trial, Closed)
- Trust account yönetimi
- İlişkili görevler görünümü
- Dava dosyaları ve dokümanlar

### ⏱️ Zaman Yönetimi (Time Tracker)
- Manuel ve zamanlayıcı bazlı kayıt
- Dava bazlı zaman takibi
- Faturalanabilir saat hesaplaması
- Masraf kayıtları

### 💰 Faturalama (Billing)
- Profesyonel fatura oluşturma
- KDV ve indirim hesaplama
- Line items (kalem bazlı) detaylandırma
- Ödeme takibi ve kayıt
- Kısmi ödeme desteği
- Fatura durumu yönetimi (Draft, Sent, Paid, Overdue)

### 📅 Takvim Entegrasyonu
- Etkinlik ve görev deadline görünümü
- Görev deadline'ları takvimde gösterilir
- Duruşma, toplantı ve deadline takibi
- Renk kodlu etkinlik tipleri

### 📋 Görev Yönetimi (Tasks)
- Kanban tarzı görev tahtası
- Öncelik belirleme (High, Medium, Low)
- Dava bazlı görev atama
- Görev şablonları
- Deadline takibi
- Matter detaylarında ilişkili görevler

### 📄 Doküman Yönetimi
- Dosya yükleme (PDF, DOCX, TXT, resim)
- Dava bazlı dosya organizasyonu
- Dosya önizleme ve indirme
- Tag ve açıklama ekleme
- Toplu işlemler

### 👥 CRM (Müvekkil İlişkileri)
- Müvekkil ve lead yönetimi
- İletişim geçmişi
- Potansiyel müvekkil takibi
- Durum güncellemeleri

### 🔐 Müvekkil Portalı
- Müvekkillere özel giriş
- Dava durumu görüntüleme
- Doküman paylaşımı
- Mesajlaşma

### ⚙️ Ayarlar
- Karanlık mod desteği
- Dil seçimi (TR/EN)
- Para birimi formatı
- Profil yönetimi

### 📊 Denetim Günlükleri (Audit Logs)
- Tüm sistem aktivitelerinin kaydı
- Filtreleme ve arama
- İstatistik görselleştirme
- CSV/JSON dışa aktarma

---

## 🛠️ Teknoloji Yığını

### Frontend
| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| React | 19.0 | UI Framework |
| TypeScript | 5.0 | Type Safety |
| Vite | 6.0 | Build Tool |
| Tailwind CSS | 3.4 (CDN) | Styling |
| Recharts | 2.x | Grafikler |

### Backend
| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| Node.js | 20+ | Runtime |
| Express | 4.x | HTTP Server |
| Prisma | 6.0 | ORM |
| SQLite | 3.x | Database |
| JWT | - | Authentication |
| Multer | - | File Upload |

---

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+ 
- npm veya yarn

### Adımlar

```bash
# 1. Repoyu klonlayın
git clone <repo-url>
cd jurisflow

# 2. Bağımlılıkları yükleyin
npm install

# 3. Veritabanını oluşturun
npx prisma db push
npx prisma generate

# 4. Admin kullanıcı oluşturun
npm run setup-admin

# 5. Geliştirme sunucusunu başlatın
npm run dev
```

### Ortam Değişkenleri (.env)
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"

# Google OAuth (opsiyonel)
VITE_GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-secret"

# E-posta (opsiyonel)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email"
SMTP_PASS="your-password"
```

---

## 📁 Proje Yapısı

```
jurisflow/
├── components/           # React bileşenleri
│   ├── Dashboard.tsx     # Ana panel
│   ├── Matters.tsx       # Dava yönetimi
│   ├── TimeTracker.tsx   # Zaman takibi
│   ├── Billing.tsx       # Faturalama
│   ├── CalendarView.tsx  # Takvim
│   ├── Documents.tsx     # Doküman yönetimi
│   ├── Tasks.tsx         # Görev yönetimi
│   ├── Settings.tsx      # Ayarlar
│   └── client/           # Müvekkil portalı
├── contexts/             # React Context'ler
│   ├── AuthContext.tsx   # Kimlik doğrulama
│   ├── DataContext.tsx   # Veri yönetimi
│   ├── LanguageContext.tsx # Çoklu dil
│   └── ThemeContext.tsx  # Karanlık mod
├── server/               # Backend
│   ├── index.ts          # Ana sunucu
│   └── middleware/       # Ara yazılımlar
├── prisma/
│   └── schema.prisma     # Veritabanı şeması
├── types.ts              # TypeScript tipleri
└── translations.ts       # Dil dosyaları
```

---

## 🔌 API Endpoints

### Kimlik Doğrulama
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/login` | Giriş |
| POST | `/api/auth/forgot-password` | Şifre sıfırlama |
| POST | `/api/auth/reset-password` | Yeni şifre belirleme |

### Matters (Davalar)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/matters` | Tüm davalar |
| POST | `/api/matters` | Yeni dava |
| PUT | `/api/matters/:id` | Dava güncelle |
| DELETE | `/api/matters/:id` | Dava sil |

### Tasks (Görevler)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/tasks` | Tüm görevler |
| POST | `/api/tasks` | Yeni görev |
| PUT | `/api/tasks/:id` | Görev güncelle |
| POST | `/api/tasks/from-template` | Şablondan oluştur |

### Documents (Dokümanlar)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/documents` | Tüm dokümanlar |
| POST | `/api/documents/upload` | Dosya yükle |
| PUT | `/api/documents/:id` | Doküman güncelle |
| DELETE | `/api/documents/:id` | Doküman sil |

### Invoices (Faturalar)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/invoices` | Tüm faturalar |
| POST | `/api/invoices` | Yeni fatura |

---

## 🗄️ Veritabanı Şeması

### Ana Modeller

```
User            - Sistem kullanıcıları (avukat, personel)
Client          - Müvekkiller
Matter          - Davalar
Task            - Görevler
TimeEntry       - Zaman kayıtları
Expense         - Masraflar
Invoice         - Faturalar
Document        - Dokümanlar
CalendarEvent   - Takvim etkinlikleri
Notification    - Bildirimler
AuditLog        - Denetim günlükleri
DocumentTemplate - Doküman şablonları
```

---

## 🔧 Konfigürasyon

### Karanlık Mod
Ayarlar > Tercihler > Tema seçeneklerinden aktif edilebilir.

### Dil Değiştirme
Ayarlar > Tercihler > Dil sekmesinden Türkçe/İngilizce arasında geçiş yapılabilir.

### Müvekkil Portalı
Müvekkillere özel portal için `/client-portal` adresini kullanın.

---

## 📞 Destek

Sorun veya önerileriniz için:
- GitHub Issues
- E-posta: support@jurisflow.com

---

## 📜 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

<div align="center">

**JurisFlow** ile hukuk büronuzu dijitalleştirin! 🚀

</div>
