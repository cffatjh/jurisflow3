import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const testAccounts = [
  { email: 'testadmin@jurisflow.com', password: 'testadmin123' },
  { email: 'beyza@gmail.com', password: 'beyza12345' },
  { email: 'cffatjh@gmail.com', password: '4354e643a83C9' },
  { email: 'hilal@gmail.com', password: 'hilal12345' },
  { email: 'tdeniz@gmail.com', password: 'tdeniz12345' },
];

async function checkLogin() {
  try {
    console.log('🔍 Login kontrolü yapılıyor...\n');

    for (const account of testAccounts) {
      console.log(`\n📧 Kontrol ediliyor: ${account.email}`);
      
      const user = await prisma.user.findUnique({
        where: { email: account.email }
      });

      if (!user) {
        console.log(`   ❌ Kullanıcı bulunamadı!`);
        continue;
      }

      console.log(`   ✅ Kullanıcı bulundu`);
      console.log(`   👤 İsim: ${user.name}`);
      console.log(`   🔑 Rol: ${user.role}`);
      console.log(`   📅 Oluşturulma: ${user.createdAt ? new Date(user.createdAt).toLocaleString('tr-TR') : 'Bilinmiyor'}`);

      // Şifre kontrolü
      if (user.passwordHash) {
        const isValid = await bcrypt.compare(account.password, user.passwordHash);
        if (isValid) {
          console.log(`   ✅ Şifre doğru!`);
        } else {
          console.log(`   ❌ Şifre yanlış!`);
          console.log(`   💡 Veritabanındaki hash ile test şifresi eşleşmiyor.`);
        }
      } else {
        console.log(`   ⚠️  Şifre hash'i bulunamadı!`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔧 Tüm admin kullanıcıları listeleniyor:\n');

    const allAdmins = await prisma.user.findMany({
      where: { role: 'Admin' },
      select: {
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        createdAt: true
      }
    });

    console.log(`Toplam ${allAdmins.length} admin kullanıcısı:\n`);
    allAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name || 'İsimsiz'}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Şifre Hash: ${admin.passwordHash ? '✅ Var' : '❌ Yok'}`);
      console.log(`   Oluşturulma: ${admin.createdAt ? new Date(admin.createdAt).toLocaleString('tr-TR') : 'Bilinmiyor'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogin();

