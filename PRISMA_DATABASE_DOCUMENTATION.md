# Prisma Veritabanı Kullanım Dökümanı

Bu döküman, JurisFlow projesindeki Prisma veritabanı şemasını ve kullanımını açıklar.

## 📋 İçindekiler

1. [Kurulum ve Yapılandırma](#kurulum-ve-yapılandırma)
2. [Veritabanı Modelleri](#veritabanı-modelleri)
3. [İlişkiler (Relations)](#ilişkiler-relations)
4. [Prisma CLI Komutları](#prisma-cli-komutları)
5. [Veritabanı İşlemleri](#veritabanı-işlemleri)
6. [Örnek Sorgular](#örnek-sorgular)
7. [Migration İşlemleri](#migration-işlemleri)

---

## 🚀 Kurulum ve Yapılandırma

### Veritabanı Yapılandırması

Proje şu anda **SQLite** veritabanı kullanıyor. `prisma/schema.prisma` dosyasında:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

### Prisma Client Oluşturma

Schema değişikliklerinden sonra Prisma Client'ı yeniden oluşturun:

```bash
npx prisma generate
```

### Veritabanını Görselleştirme (Prisma Studio)

Veritabanını görsel olarak incelemek ve düzenlemek için:

```bash
npx prisma studio
```

Bu komut `http://localhost:5555` adresinde bir web arayüzü açar.

---

## 📊 Veritabanı Modelleri

### 1. **User (Sistem Kullanıcısı - Avukat/Admin)**

Avukatlar ve admin kullanıcılar için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz kullanıcı ID'si (CUID)
- `email` (String, Unique): E-posta adresi
- `name` (String): Kullanıcı adı
- `role` (String): Kullanıcı rolü - `Admin`, `Partner`, `Associate`
- `passwordHash` (String): Şifrelenmiş şifre
- `phone` (String, Optional): Telefon numarası
- `mobile` (String, Optional): Cep telefonu
- `address` (String, Optional): Adres
- `city` (String, Optional): Şehir
- `state` (String, Optional): Eyalet/Bölge
- `zipCode` (String, Optional): Posta kodu
- `country` (String, Optional): Ülke
- `barNumber` (String, Optional): Baro sicil numarası
- `bio` (String, Optional): Biyografi
- `avatar` (String, Optional): Avatar URL'si
- `preferences` (String, Optional): JSON string - kullanıcı tercihleri
- `createdAt` (DateTime, Optional): Oluşturulma tarihi
- `updatedAt` (DateTime): Güncellenme tarihi

**İlişkiler:**
- `notifications`: Kullanıcının bildirimleri

**Örnek Kullanım:**
```typescript
// Kullanıcı oluştur
const user = await prisma.user.create({
  data: {
    email: 'avukat@example.com',
    name: 'Ahmet Yılmaz',
    role: 'Partner',
    passwordHash: hashedPassword,
  }
});

// Kullanıcı sorgula
const user = await prisma.user.findUnique({
  where: { email: 'avukat@example.com' }
});

// Tüm adminleri getir
const admins = await prisma.user.findMany({
  where: { role: 'Admin' }
});
```

---

### 2. **Client (Müvekkil)**

Müvekkiller için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz müvekkil ID'si (CUID)
- `name` (String): Müvekkil adı
- `email` (String, Unique): E-posta adresi
- `phone` (String, Optional): Telefon numarası
- `mobile` (String, Optional): Cep telefonu
- `company` (String, Optional): Şirket adı
- `type` (String): Müvekkil tipi - `Individual` veya `Corporate`
- `status` (String): Durum - `Active` veya `Inactive`
- `address` (String, Optional): Adres
- `city` (String, Optional): Şehir
- `state` (String, Optional): Eyalet/Bölge
- `zipCode` (String, Optional): Posta kodu
- `country` (String, Optional): Ülke
- `taxId` (String, Optional): Vergi kimlik numarası / SSN
- `notes` (String, Optional): Ek notlar
- `passwordHash` (String, Optional): Müvekkil portal şifresi
- `portalEnabled` (Boolean): Portal erişimi aktif mi?
- `lastLogin` (DateTime, Optional): Son giriş tarihi
- `createdAt` (DateTime, Optional): Oluşturulma tarihi
- `updatedAt` (DateTime): Güncellenme tarihi

**İlişkiler:**
- `matters`: Müvekkilin dava dosyaları
- `invoices`: Müvekkilin faturaları
- `clientMessages`: Müvekkilin mesajları
- `notifications`: Müvekkilin bildirimleri

**Örnek Kullanım:**
```typescript
// Müvekkil oluştur
const client = await prisma.client.create({
  data: {
    name: 'Mehmet Demir',
    email: 'mehmet@example.com',
    type: 'Individual',
    status: 'Active',
    portalEnabled: true,
  }
});

// Müvekkil ve dava dosyalarını birlikte getir
const client = await prisma.client.findUnique({
  where: { id: 'client-id' },
  include: { matters: true }
});
```

---

### 3. **Matter (Dava Dosyası)**

Dava dosyaları için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz dava dosyası ID'si (CUID)
- `caseNumber` (String): Dava numarası
- `name` (String): Dava dosyası adı
- `practiceArea` (String): Hukuk alanı
- `status` (String): Durum - `Open` veya `Closed`
- `feeStructure` (String): Ücret yapısı - `Hourly` veya `Fixed`
- `openDate` (DateTime): Açılış tarihi
- `responsibleAttorney` (String): Sorumlu avukat adı
- `billableRate` (Float): Faturalanabilir saat ücreti
- `trustBalance` (Float): Güven hesabı bakiyesi
- `clientId` (String, Foreign Key): Müvekkil ID'si

**İlişkiler:**
- `client`: Müvekkil (Many-to-One)
- `timeEntries`: Zaman kayıtları
- `expenses`: Gider kayıtları
- `tasks`: Görevler
- `events`: Takvim etkinlikleri
- `clientMessages`: Mesajlar
- `documents`: Dokümanlar

**Örnek Kullanım:**
```typescript
// Dava dosyası oluştur
const matter = await prisma.matter.create({
  data: {
    caseNumber: '2024-001',
    name: 'Ticari Uyuşmazlık',
    practiceArea: 'Commercial Law',
    status: 'Open',
    feeStructure: 'Hourly',
    responsibleAttorney: 'Ahmet Yılmaz',
    billableRate: 500.0,
    clientId: 'client-id',
  }
});

// Dava dosyası ve zaman kayıtlarını getir
const matter = await prisma.matter.findUnique({
  where: { id: 'matter-id' },
  include: {
    timeEntries: true,
    expenses: true,
    documents: true,
  }
});
```

---

### 4. **Document (Doküman)**

Yüklenen dokümanlar için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz doküman ID'si (CUID)
- `name` (String): Orijinal dosya adı
- `fileName` (String): Sunucuda saklanan dosya adı
- `filePath` (String): Dosya yolu (`/uploads/{fileName}`)
- `fileSize` (Int): Dosya boyutu (byte)
- `mimeType` (String): MIME tipi (örn: `application/pdf`)
- `matterId` (String, Optional, Foreign Key): İlgili dava dosyası ID'si
- `uploadedBy` (String, Optional): Yükleyen kullanıcı ID'si
- `version` (Int): Versiyon numarası (varsayılan: 1)
- `description` (String, Optional): Açıklama
- `createdAt` (DateTime): Oluşturulma tarihi
- `updatedAt` (DateTime): Güncellenme tarihi

**İlişkiler:**
- `matter`: Dava dosyası (Many-to-One, Optional)

**Örnek Kullanım:**
```typescript
// Doküman oluştur
const document = await prisma.document.create({
  data: {
    name: 'Sözleşme.pdf',
    fileName: 'sozlesme-1234567890.pdf',
    filePath: '/uploads/sozlesme-1234567890.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    matterId: 'matter-id',
    uploadedBy: 'user-id',
  }
});

// Bir dava dosyasına ait tüm dokümanları getir
const documents = await prisma.document.findMany({
  where: { matterId: 'matter-id' },
  orderBy: { createdAt: 'desc' }
});
```

---

### 5. **TimeEntry (Zaman Kaydı)**

Çalışılan saatlerin kaydı için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz kayıt ID'si (CUID)
- `matterId` (String, Optional, Foreign Key): Dava dosyası ID'si
- `description` (String): Açıklama
- `duration` (Int): Süre (dakika cinsinden)
- `rate` (Float): Saat ücreti
- `date` (DateTime): Tarih
- `billed` (Boolean): Faturalandı mı? (varsayılan: false)
- `type` (String): Tip (varsayılan: `time`)

**İlişkiler:**
- `matter`: Dava dosyası (Many-to-One, Optional)

**Örnek Kullanım:**
```typescript
// Zaman kaydı oluştur
const timeEntry = await prisma.timeEntry.create({
  data: {
    matterId: 'matter-id',
    description: 'Müşteri görüşmesi',
    duration: 120, // 2 saat = 120 dakika
    rate: 500.0,
    date: new Date(),
    billed: false,
  }
});

// Faturalanmamış zaman kayıtlarını getir
const unbilledEntries = await prisma.timeEntry.findMany({
  where: { billed: false }
});
```

---

### 6. **Expense (Gider Kaydı)**

Gider kayıtları için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz kayıt ID'si (CUID)
- `matterId` (String, Optional, Foreign Key): Dava dosyası ID'si
- `description` (String): Açıklama
- `amount` (Float): Tutar
- `date` (DateTime): Tarih
- `category` (String): Kategori
- `billed` (Boolean): Faturalandı mı? (varsayılan: false)
- `type` (String): Tip (varsayılan: `expense`)

**İlişkiler:**
- `matter`: Dava dosyası (Many-to-One, Optional)

**Örnek Kullanım:**
```typescript
// Gider kaydı oluştur
const expense = await prisma.expense.create({
  data: {
    matterId: 'matter-id',
    description: 'Mahkeme harçları',
    amount: 500.0,
    date: new Date(),
    category: 'Court Fees',
    billed: false,
  }
});
```

---

### 7. **Invoice (Fatura)**

Faturalar için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz fatura ID'si (CUID)
- `number` (String): Fatura numarası
- `amount` (Float): Tutar
- `dueDate` (DateTime): Vade tarihi
- `status` (String): Durum - `Paid`, `Overdue`, `Draft`, `Sent`
- `clientId` (String, Foreign Key): Müvekkil ID'si

**İlişkiler:**
- `client`: Müvekkil (Many-to-One)

**Örnek Kullanım:**
```typescript
// Fatura oluştur
const invoice = await prisma.invoice.create({
  data: {
    number: 'INV-2024-001',
    amount: 5000.0,
    dueDate: new Date('2024-02-01'),
    status: 'Sent',
    clientId: 'client-id',
  }
});

// Ödenmemiş faturaları getir
const unpaidInvoices = await prisma.invoice.findMany({
  where: {
    status: { in: ['Sent', 'Overdue'] }
  }
});
```

---

### 8. **Task (Görev)**

Görevler için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz görev ID'si (CUID)
- `title` (String): Başlık
- `dueDate` (DateTime, Optional): Bitiş tarihi
- `priority` (String): Öncelik - `High`, `Medium`, `Low`
- `status` (String): Durum
- `matterId` (String, Optional, Foreign Key): Dava dosyası ID'si
- `assignedTo` (String, Optional): Atanan kullanıcı

**İlişkiler:**
- `matter`: Dava dosyası (Many-to-One, Optional)

**Örnek Kullanım:**
```typescript
// Görev oluştur
const task = await prisma.task.create({
  data: {
    title: 'Dava dilekçesi hazırla',
    dueDate: new Date('2024-01-15'),
    priority: 'High',
    status: 'Pending',
    matterId: 'matter-id',
    assignedTo: 'user-id',
  }
});
```

---

### 9. **Lead (CRM – Potansiyel Müşteri)**

Potansiyel müşteriler için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz lead ID'si (CUID)
- `name` (String): Lead adı
- `source` (String): Kaynak (örn: Website, Referral, vb.)
- `status` (String): Durum - `New`, `Contacted`, `Converted`, `Lost`
- `estimatedValue` (Float): Tahmini değer
- `practiceArea` (String): Hukuk alanı

**Örnek Kullanım:**
```typescript
// Lead oluştur
const lead = await prisma.lead.create({
  data: {
    name: 'Yeni Müşteri',
    source: 'Website',
    status: 'New',
    estimatedValue: 10000.0,
    practiceArea: 'Commercial Law',
  }
});

// Yeni lead'leri getir
const newLeads = await prisma.lead.findMany({
  where: { status: 'New' }
});
```

---

### 10. **AuditLog (İşlem Kayıtları)**

Tüm sistem işlemlerinin kaydı için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz kayıt ID'si (CUID)
- `userId` (String, Optional): İşlemi yapan kullanıcı ID'si (avukat/admin)
- `userEmail` (String, Optional): Kullanıcı e-postası
- `clientId` (String, Optional): İşlemi yapan müvekkil ID'si
- `clientEmail` (String, Optional): Müvekkil e-postası
- `action` (String): İşlem tipi - `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `UPLOAD`, vb.
- `entityType` (String): Entity tipi - `USER`, `CLIENT`, `MATTER`, `DOCUMENT`, vb.
- `entityId` (String, Optional): Etkilenen entity ID'si
- `oldValues` (String, Optional): Eski değerler (JSON string)
- `newValues` (String, Optional): Yeni değerler (JSON string)
- `details` (String, Optional): Detaylı açıklama
- `ipAddress` (String, Optional): IP adresi
- `userAgent` (String, Optional): Tarayıcı bilgisi
- `createdAt` (DateTime): Oluşturulma tarihi

**Örnek Kullanım:**
```typescript
// Audit log kaydı oluştur
await prisma.auditLog.create({
  data: {
    userId: 'user-id',
    userEmail: 'user@example.com',
    action: 'CREATE',
    entityType: 'DOCUMENT',
    entityId: 'document-id',
    details: 'User uploaded document: contract.pdf',
    ipAddress: '192.168.1.1',
  }
});

// Bir kullanıcının tüm işlemlerini getir
const logs = await prisma.auditLog.findMany({
  where: { userId: 'user-id' },
  orderBy: { createdAt: 'desc' }
});
```

---

### 11. **Notification (Bildirim)**

Bildirimler için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz bildirim ID'si (CUID)
- `userId` (String, Optional, Foreign Key): Kullanıcı ID'si
- `clientId` (String, Optional, Foreign Key): Müvekkil ID'si
- `title` (String): Başlık
- `message` (String): Mesaj
- `type` (String): Tip - `info`, `warning`, `error`, `success`
- `read` (Boolean): Okundu mu? (varsayılan: false)
- `link` (String, Optional): İlgili sayfa linki
- `createdAt` (DateTime): Oluşturulma tarihi

**İlişkiler:**
- `user`: Kullanıcı (Many-to-One, Optional)
- `client`: Müvekkil (Many-to-One, Optional)

---

### 12. **ClientMessage (Müvekkil Mesajı)**

Müvekkillerden gelen mesajlar için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz mesaj ID'si (CUID)
- `clientId` (String, Foreign Key): Müvekkil ID'si
- `matterId` (String, Optional, Foreign Key): Dava dosyası ID'si
- `subject` (String): Konu
- `message` (String): Mesaj içeriği
- `read` (Boolean): Okundu mu? (varsayılan: false)
- `createdAt` (DateTime): Oluşturulma tarihi

**İlişkiler:**
- `client`: Müvekkil (Many-to-One)
- `matter`: Dava dosyası (Many-to-One, Optional)

---

### 13. **CalendarEvent (Takvim Etkinliği)**

Takvim etkinlikleri için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz etkinlik ID'si (CUID)
- `title` (String): Başlık
- `date` (DateTime): Tarih
- `type` (String): Tip - `Meeting`, `Court`, `Deadline`
- `matterId` (String, Optional, Foreign Key): Dava dosyası ID'si

**İlişkiler:**
- `matter`: Dava dosyası (Many-to-One, Optional)

---

### 14. **PasswordResetToken (Şifre Sıfırlama Token'ı)**

Şifre sıfırlama token'ları için model.

**Alanlar:**
- `id` (String, Primary Key): Benzersiz token ID'si (CUID)
- `email` (String): E-posta adresi
- `token` (String, Unique): Token değeri
- `expiresAt` (DateTime): Son kullanma tarihi
- `used` (Boolean): Kullanıldı mı? (varsayılan: false)
- `createdAt` (DateTime): Oluşturulma tarihi

---

## 🔗 İlişkiler (Relations)

### One-to-Many İlişkiler

1. **Client → Matters**: Bir müvekkilin birden fazla dava dosyası olabilir
2. **Client → Invoices**: Bir müvekkilin birden fazla faturası olabilir
3. **Matter → TimeEntries**: Bir dava dosyasının birden fazla zaman kaydı olabilir
4. **Matter → Expenses**: Bir dava dosyasının birden fazla gider kaydı olabilir
5. **Matter → Documents**: Bir dava dosyasının birden fazla dokümanı olabilir
6. **User → Notifications**: Bir kullanıcının birden fazla bildirimi olabilir
7. **Client → Notifications**: Bir müvekkilin birden fazla bildirimi olabilir

### Cascade Delete

Bazı ilişkilerde `onDelete: Cascade` kullanılmıştır:
- User silindiğinde → Notifications silinir
- Client silindiğinde → Notifications ve ClientMessages silinir
- Matter silindiğinde → Documents silinir

---

## 🛠️ Prisma CLI Komutları

### Temel Komutlar

```bash
# Prisma Client'ı oluştur (schema değişikliklerinden sonra)
npx prisma generate

# Veritabanını görselleştir
npx prisma studio

# Veritabanı şemasını veritabanına uygula (migration oluştur)
npx prisma migrate dev --name migration-name

# Production için migration uygula
npx prisma migrate deploy

# Veritabanı şemasını sıfırdan oluştur (dev.db silinir!)
npx prisma migrate reset

# Mevcut veritabanından schema oluştur (introspection)
npx prisma db pull

# Schema'yı veritabanına push et (migration olmadan)
npx prisma db push
```

### Prisma Studio

Veritabanını görsel olarak yönetmek için:

```bash
npx prisma studio
```

Bu komut `http://localhost:5555` adresinde bir web arayüzü açar. Buradan:
- Tüm tabloları görüntüleyebilirsiniz
- Veri ekleyebilir, düzenleyebilir, silebilirsiniz
- İlişkileri görselleştirebilirsiniz
- Filtreleme ve arama yapabilirsiniz

---

## 💾 Veritabanı İşlemleri

### Create (Oluşturma)

```typescript
// Basit oluşturma
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    name: 'Test User',
    role: 'Associate',
    passwordHash: 'hashed-password',
  }
});

// İlişkili veri ile oluşturma
const matter = await prisma.matter.create({
  data: {
    caseNumber: '2024-001',
    name: 'Test Case',
    practiceArea: 'Commercial Law',
    status: 'Open',
    feeStructure: 'Hourly',
    responsibleAttorney: 'John Doe',
    billableRate: 500.0,
    client: {
      connect: { id: 'client-id' }
    }
  }
});
```

### Read (Okuma)

```typescript
// Tekil kayıt
const user = await prisma.user.findUnique({
  where: { id: 'user-id' }
});

// Çoklu kayıt
const users = await prisma.user.findMany({
  where: { role: 'Admin' }
});

// İlişkileri dahil etme
const client = await prisma.client.findUnique({
  where: { id: 'client-id' },
  include: {
    matters: true,
    invoices: true,
  }
});

// Sıralama ve limit
const recentDocuments = await prisma.document.findMany({
  orderBy: { createdAt: 'desc' },
  take: 10
});
```

### Update (Güncelleme)

```typescript
// Basit güncelleme
const user = await prisma.user.update({
  where: { id: 'user-id' },
  data: {
    name: 'Updated Name',
    phone: '555-1234',
  }
});

// Çoklu güncelleme
await prisma.timeEntry.updateMany({
  where: { matterId: 'matter-id' },
  data: { billed: true }
});
```

### Delete (Silme)

```typescript
// Tekil silme
await prisma.user.delete({
  where: { id: 'user-id' }
});

// Çoklu silme
await prisma.notification.deleteMany({
  where: { read: true }
});
```

---

## 📝 Örnek Sorgular

### Kullanıcı Sorguları

```typescript
// Tüm adminleri getir
const admins = await prisma.user.findMany({
  where: { role: 'Admin' },
  select: {
    id: true,
    name: true,
    email: true,
  }
});

// E-posta ile kullanıcı bul
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' }
});
```

### Müvekkil Sorguları

```typescript
// Aktif müvekkilleri getir
const activeClients = await prisma.client.findMany({
  where: { status: 'Active' },
  include: {
    matters: {
      where: { status: 'Open' }
    }
  }
});

// Portal erişimi olan müvekkiller
const portalClients = await prisma.client.findMany({
  where: { portalEnabled: true }
});
```

### Dava Dosyası Sorguları

```typescript
// Bir müvekkilin açık dava dosyaları
const openMatters = await prisma.matter.findMany({
  where: {
    clientId: 'client-id',
    status: 'Open'
  },
  include: {
    timeEntries: true,
    expenses: true,
  }
});

// Faturalanmamış zaman kayıtları olan dava dosyaları
const mattersWithUnbilledTime = await prisma.matter.findMany({
  where: {
    timeEntries: {
      some: {
        billed: false
      }
    }
  }
});
```

### Doküman Sorguları

```typescript
// Bir dava dosyasına ait tüm dokümanlar
const documents = await prisma.document.findMany({
  where: { matterId: 'matter-id' },
  orderBy: { createdAt: 'desc' }
});

// PDF dokümanları
const pdfDocuments = await prisma.document.findMany({
  where: {
    mimeType: 'application/pdf'
  }
});
```

### Audit Log Sorguları

```typescript
// Bir kullanıcının son işlemleri
const userActions = await prisma.auditLog.findMany({
  where: { userId: 'user-id' },
  orderBy: { createdAt: 'desc' },
  take: 50
});

// Belirli bir tarih aralığındaki işlemler
const recentActions = await prisma.auditLog.findMany({
  where: {
    createdAt: {
      gte: new Date('2024-01-01'),
      lte: new Date('2024-01-31')
    }
  }
});

// Document işlemleri
const documentActions = await prisma.auditLog.findMany({
  where: {
    entityType: 'DOCUMENT',
    action: { in: ['UPLOAD', 'DELETE'] }
  }
});
```

### Fatura Sorguları

```typescript
// Ödenmemiş faturalar
const unpaidInvoices = await prisma.invoice.findMany({
  where: {
    status: { in: ['Sent', 'Overdue'] }
  },
  include: {
    client: true
  }
});

// Vadesi geçmiş faturalar
const overdueInvoices = await prisma.invoice.findMany({
  where: {
    status: 'Overdue',
    dueDate: { lt: new Date() }
  }
});
```

### Zaman ve Gider Sorguları

```typescript
// Faturalanmamış zaman kayıtları
const unbilledTime = await prisma.timeEntry.findMany({
  where: {
    billed: false,
    matterId: 'matter-id'
  }
});

// Bir dava dosyasının toplam giderleri
const totalExpenses = await prisma.expense.aggregate({
  where: { matterId: 'matter-id' },
  _sum: { amount: true }
});
```

---

## 🔄 Migration İşlemleri

### Migration Oluşturma

Schema değişikliklerinden sonra migration oluşturun:

```bash
npx prisma migrate dev --name add-client-portal
```

Bu komut:
1. Yeni bir migration dosyası oluşturur
2. Migration'ı veritabanına uygular
3. Prisma Client'ı yeniden oluşturur

### Migration Dosyaları

Migration dosyaları `prisma/migrations/` klasöründe saklanır. Her migration:
- Benzersiz bir isim içerir
- SQL komutlarını içerir
- Geri alınabilir (rollback) olmalıdır

### Production Migration

Production ortamında migration uygulamak için:

```bash
npx prisma migrate deploy
```

Bu komut sadece uygulanmamış migration'ları çalıştırır.

### Migration Sıfırlama (Dikkatli!)

Development ortamında veritabanını sıfırlamak için:

```bash
npx prisma migrate reset
```

⚠️ **UYARI**: Bu komut tüm verileri siler ve veritabanını sıfırdan oluşturur!

---

## 📌 Önemli Notlar

1. **SQLite Sınırlamaları:**
   - SQLite production için önerilmez
   - PostgreSQL veya MySQL'e geçiş yapılabilir
   - Schema'da sadece `datasource` ve `url` değiştirilir

2. **CUID Kullanımı:**
   - Tüm ID'ler CUID formatında (örn: `clx1234567890abcdef`)
   - Otomatik olarak Prisma tarafından oluşturulur

3. **DateTime Alanları:**
   - `createdAt` ve `updatedAt` otomatik yönetilir
   - `@default(now())` ve `@updatedAt` direktifleri kullanılır

4. **İlişkiler:**
   - Foreign key'ler otomatik oluşturulur
   - Cascade delete dikkatli kullanılmalıdır

5. **Veri Güvenliği:**
   - Şifreler asla düz metin saklanmaz
   - `passwordHash` alanında bcrypt hash'leri saklanır

---

## 🔍 Hata Ayıklama

### Prisma Client Hatası

Eğer "Prisma Client not found" hatası alırsanız:

```bash
npx prisma generate
```

### Schema Değişiklikleri Uygulanmıyor

```bash
npx prisma db push
```

veya

```bash
npx prisma migrate dev
```

### Veritabanı Bağlantı Hatası

`prisma/schema.prisma` dosyasındaki `url` değerini kontrol edin:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"  // Bu dosya mevcut mu?
}
```

---

## 📚 Ek Kaynaklar

- [Prisma Dokümantasyonu](https://www.prisma.io/docs)
- [Prisma Client API Referansı](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Prisma Schema Referansı](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

**Son Güncelleme:** 2024-01-XX
**Versiyon:** 1.0.0

