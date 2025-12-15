// Fix duplicate client emails before migration
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixClientEmails() {
  try {
    // Get all clients
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'asc' }
    });

    // Group by email
    const emailMap = new Map<string, any[]>();
    clients.forEach(client => {
      if (!emailMap.has(client.email)) {
        emailMap.set(client.email, []);
      }
      emailMap.get(client.email)!.push(client);
    });

    // Find duplicates
    const duplicates = Array.from(emailMap.entries()).filter(([_, clients]) => clients.length > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate emails found');
      return;
    }

    console.log(`Found ${duplicates.length} duplicate email(s)`);

    // Keep the first one, update others with unique email
    for (const [email, clientList] of duplicates) {
      const [first, ...rest] = clientList;
      console.log(`Keeping: ${first.id} (${first.email})`);
      
      for (let i = 0; i < rest.length; i++) {
        const newEmail = `${email.split('@')[0]}+${i + 1}@${email.split('@')[1]}`;
        await prisma.client.update({
          where: { id: rest[i].id },
          data: { email: newEmail }
        });
        console.log(`Updated: ${rest[i].id} -> ${newEmail}`);
      }
    }

    console.log('✅ Duplicate emails fixed');
  } catch (error) {
    console.error('❌ Error fixing emails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixClientEmails();

