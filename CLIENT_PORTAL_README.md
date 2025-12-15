# Müvekkil Portalı (Client Portal) Kullanım Kılavuzu

## Giriş

Müvekkil portalı, müvekkillerin kendi davalarını, faturalarını, dokümanlarını görüntüleyebileceği ve avukatlarıyla iletişim kurabileceği güvenli bir platformdur.

## Erişim

Müvekkil portalına erişmek için:
- URL: `http://localhost:3000/client` veya `http://localhost:3000/#/client`

## Test Müvekkil Bilgileri

Server başlatıldığında otomatik olarak oluşturulan test müvekkil:

**Email:** `client@test.com`  
**Şifre:** `client123`

## Özellikler

### 1. Dashboard
- Aktif davaların özeti
- Toplam fatura sayısı
- Ödenmemiş faturalar
- Toplam bakiye

### 2. My Cases (Davalarım)
- Tüm davaların listesi
- Dava detayları:
  - Dava numarası ve adı
  - Durum (Açık/Kapalı)
  - Uygulama alanı
  - Ücret yapısı
  - Sorumlu avukat
- Faturalanmamış zaman kayıtları
- Faturalanmamış giderler
- Toplam WIP (Work in Progress) tutarı

### 3. Invoices (Faturalar)
- Tüm faturaların listesi
- Filtreleme (Tümü, Ödenmemiş, Gecikmiş, Ödenen)
- Fatura detayları:
  - Fatura numarası
  - Tutar
  - Vade tarihi
  - Durum
- Özet istatistikler

### 4. Documents (Dokümanlar)
- Dava bazında doküman görüntüleme
- Dava filtresi
- Doküman indirme

### 5. Messages (Mesajlar)
- Avukatla mesajlaşma
- Dava bazında mesaj gönderme
- Mesaj geçmişi

### 6. Profile (Profil)
- Kişisel bilgiler
- İletişim bilgileri
- Profil güncelleme (avukat ile iletişime geçerek)

## Yeni Müvekkil Oluşturma ve Portal Erişimi

### Admin Panel'den:

1. **CRM** sekmesine gidin
2. Yeni müvekkil ekleyin veya mevcut müvekkili düzenleyin
3. Müvekkil için portal erişimini etkinleştirin:
   - `portalEnabled: true` olarak işaretleyin
   - Şifre belirleyin (passwordHash oluşturulacak)

### Server Tarafında (Programatik):

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Müvekkil oluşturma
const passwordHash = await bcrypt.hash('müvekkil-şifresi', 10);
const client = await prisma.client.create({
  data: {
    name: 'Müvekkil Adı',
    email: 'müvekkil@email.com',
    passwordHash,
    portalEnabled: true,
    type: 'Individual',
    status: 'Active',
    // ... diğer alanlar
  }
});
```

## Güvenlik

- Tüm API endpoint'leri JWT token ile korunmaktadır
- Müvekkiller sadece kendi davalarını görebilir
- Portal erişimi `portalEnabled` flag'i ile kontrol edilir
- Şifreler bcrypt ile hash'lenmiştir

## API Endpoints

Tüm client portal API'leri `/api/client/*` prefix'i ile başlar ve `Authorization: Bearer <token>` header'ı gerektirir:

- `POST /api/client/login` - Müvekkil girişi
- `GET /api/client/matters` - Müvekkilin davaları
- `GET /api/client/invoices` - Faturalar
- `GET /api/client/documents` - Dokümanlar
- `GET /api/client/messages` - Mesajlar
- `POST /api/client/messages` - Mesaj gönderme
- `GET /api/client/notifications` - Bildirimler
- `GET /api/client/profile` - Profil bilgileri

## Notlar

- Server başlatıldığında otomatik olarak test müvekkili oluşturulur
- Test müvekkil bilgileri server console'unda görüntülenir
- Production ortamında müvekkil şifreleri güvenli bir şekilde oluşturulmalıdır

