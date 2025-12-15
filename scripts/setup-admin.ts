// Script to manually add an admin user to the system
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

// Helper function to read input from command line
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Helper function to read password (hidden input)
function askPassword(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function setupAdmin() {
  try {
    console.log('\n🔐 Admin Kullanıcı Ekleme\n');
    console.log('Sisteme yeni bir admin kullanıcı eklemek için bilgileri girin:\n');

    // Get user input
    const email = await askQuestion('Email: ');
    if (!email || !email.includes('@')) {
      console.error('❌ Geçerli bir email adresi girin!');
      process.exit(1);
    }

    const name = await askQuestion('Ad Soyad: ');
    if (!name || name.trim().length === 0) {
      console.error('❌ Ad soyad boş olamaz!');
      process.exit(1);
    }

    const password = await askPassword('Şifre: ');
    if (!password || password.length < 6) {
      console.error('❌ Şifre en az 6 karakter olmalıdır!');
      process.exit(1);
    }

    const confirmPassword = await askPassword('Şifre (Tekrar): ');
    if (password !== confirmPassword) {
      console.error('❌ Şifreler eşleşmiyor!');
      process.exit(1);
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`\n⚠️  Bu email adresi zaten kullanılıyor: ${email}`);
      const update = await askQuestion('Mevcut kullanıcıyı güncellemek istiyor musunuz? (e/h): ');
      if (update.toLowerCase() !== 'e' && update.toLowerCase() !== 'evet') {
        console.log('❌ İşlem iptal edildi.');
        process.exit(0);
      }

      // Update existing user
      const passwordHash = await bcrypt.hash(password, 10);
      const updated = await prisma.user.update({
        where: { email },
        data: {
          name,
          role: 'Admin',
          passwordHash,
        },
      });
      console.log('\n✅ Admin kullanıcı güncellendi!');
      console.log(`   Email: ${updated.email}`);
      console.log(`   Ad Soyad: ${updated.name}`);
      console.log(`   Rol: ${updated.role}`);
    } else {
      // Create new admin user
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          name,
          role: 'Admin',
          passwordHash,
        },
      });
      console.log('\n✅ Admin kullanıcı başarıyla oluşturuldu!');
      console.log(`   Email: ${user.email}`);
      console.log(`   Ad Soyad: ${user.name}`);
      console.log(`   Rol: ${user.role}`);
    }

    console.log('\n✅ İşlem tamamlandı!');
  } catch (error: any) {
    console.error('\n❌ Hata oluştu:', error.message);
    if (error.code === 'P2002') {
      console.error('   Bu email adresi zaten kullanılıyor!');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();

