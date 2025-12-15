// Script to setup a test client with portal access
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setupClient() {
  try {
    // Create or update a test client
    const email = 'client@test.com';
    const password = 'client123';
    const passwordHash = await bcrypt.hash(password, 10);

    // First, try to find existing client
    let client = await prisma.client.findUnique({ where: { email } });

    if (client) {
      // Update existing client
      client = await prisma.client.update({
        where: { email },
        data: {
          passwordHash,
          portalEnabled: true,
          status: 'Active'
        }
      });
      console.log('✅ Client updated:', client.email);
    } else {
      // Create new client
      client = await prisma.client.create({
        data: {
          name: 'Test Client',
          email,
          passwordHash,
          portalEnabled: true,
          type: 'Individual',
          status: 'Active',
          phone: '555-0100',
          address: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'USA'
        }
      });
      console.log('✅ Client created:', client.email);
    }

    console.log('\n📧 Client Portal Login Credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\n✅ Setup complete!');
  } catch (error) {
    console.error('❌ Error setting up client:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupClient();

