import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const admins = [
  {
    email: 'hilal@jf.com',
    password: 'hilal123',
    name: 'Hilal'
  },
  {
    email: 'tdeniz@jf.com',
    password: 'tdeniz123',
    name: 'TDeniz'
  }
];

async function addAdmins() {
  try {
    console.log('🔐 Admin kullanıcıları ekleniyor...\n');

    for (const admin of admins) {
      const existing = await prisma.user.findUnique({
        where: { email: admin.email }
      });

      if (existing) {
        // Update existing user to ensure it's admin
        const passwordHash = await bcrypt.hash(admin.password, 10);
        await prisma.user.update({
          where: { email: admin.email },
          data: {
            passwordHash,
            role: 'Admin',
            name: admin.name
          }
        });
        console.log(`✅ ${admin.email} güncellendi (Admin)`);
      } else {
        // Create new admin user
        const passwordHash = await bcrypt.hash(admin.password, 10);
        await prisma.user.create({
          data: {
            email: admin.email,
            name: admin.name,
            role: 'Admin',
            passwordHash
          }
        });
        console.log(`✅ ${admin.email} oluşturuldu (Admin)`);
      }
    }

    console.log('\n✨ Tüm admin kullanıcıları başarıyla eklendi!');
    console.log('\n📋 Admin Giriş Bilgileri:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    admins.forEach(admin => {
      console.log(`   Email: ${admin.email}`);
      console.log(`   Şifre: ${admin.password}`);
      console.log(`   Rol: Admin\n`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addAdmins();

