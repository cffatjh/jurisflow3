import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAdmins() {
  try {
    console.log('🔍 Admin hesapları sorgulanıyor...\n');

    const admins = await prisma.user.findMany({
      where: {
        role: 'Admin'
      },
      select: {
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (admins.length === 0) {
      console.log('❌ Sistemde admin kullanıcısı bulunamadı.');
      return;
    }

    console.log(`✅ Toplam ${admins.length} admin kullanıcısı bulundu:\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 ADMIN HESAPLARI');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name || 'İsimsiz'}`);
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🔑 Şifre: (Veritabanında şifre hash olarak saklanıyor, şifreler aşağıda listeleniyor)`);
      console.log(`   📅 Oluşturulma: ${admin.createdAt ? new Date(admin.createdAt).toLocaleString('tr-TR') : 'Bilinmiyor'}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔐 BİLİNEN ŞİFRELER (Script\'lerden ve kodlardan):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test Admin
    console.log('1. Test Admin');
    console.log('   📧 Email: testadmin@jurisflow.com');
    console.log('   🔑 Şifre: testadmin123\n');

    // Yeni eklenen adminler
    console.log('2. Beyza');
    console.log('   📧 Email: beyza@gmail.com');
    console.log('   🔑 Şifre: beyza12345\n');

    console.log('3. Hilal');
    console.log('   📧 Email: hilal@gmail.com');
    console.log('   🔑 Şifre: hilal12345\n');

    console.log('4. Tdeniz');
    console.log('   📧 Email: tdeniz@gmail.com');
    console.log('   🔑 Şifre: tdeniz12345\n');

    // Ana admin (eğer varsa)
    const mainAdmin = await prisma.user.findUnique({
      where: { email: 'cffatjh@gmail.com' }
    });
    if (mainAdmin && mainAdmin.role === 'Admin') {
      console.log('5. Ana Admin');
      console.log('   📧 Email: cffatjh@gmail.com');
      console.log('   🔑 Şifre: 4354e643a83C9\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Not: Veritabanında şifreler hash olarak saklanıyor.');
    console.log('   Yukarıdaki şifreler script\'lerden ve kodlardan alınmıştır.\n');

  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listAdmins();

