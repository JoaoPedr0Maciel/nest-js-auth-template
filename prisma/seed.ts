import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // Hash password
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Create ADMIN user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      phone: '+5511999990001',
      password: hashedPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  // Create regular USER
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      phone: '+5511999990002',
      password: hashedPassword,
      name: 'Regular User',
      role: Role.USER,
    },
  });

  console.log('Seed data created successfully:');
  console.log('Admin User:', adminUser);
  console.log('Regular User:', regularUser);
  console.log('\nDefault credentials for all users:');
  console.log('Password: 123456');
  console.log('\nEmails:');
  console.log('Admin: admin@example.com');
  console.log('User: user@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
