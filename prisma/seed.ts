import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Hash password
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Create USER user
  const adminUser = await prisma.user.upsert({
    where: { phone: '+244924123456' },
    update: {},
    create: {
      phone: '+244924123456',
      password: hashedPassword,
      name: 'User User',
      role: Role.USER,
    },
  });

  // Create regular USER
  const regularUser = await prisma.user.upsert({
    where: { phone: '+244925123456' },
    update: {},
    create: {
      phone: '+244925123456',
      password: hashedPassword,
      name: 'Regular User',
      role: Role.USER,
    },
  });

  console.log('Seed data created successfully:');
  console.log('Admin User:', adminUser);
  console.log('Admin User:', adminUser);
  console.log('Regular User:', regularUser);
  console.log('\nDefault credentials for all users:');
  console.log('Password: 123456');
  console.log('\nPhone numbers (Angola format):');
  console.log('Master: +244923123456');
  console.log('Admin: +244924123456');
  console.log('User: +244925123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
