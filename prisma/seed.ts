import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Hash password
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Create MASTER user
  const masterUser = await prisma.user.upsert({
    where: { email: 'master@example.com' },
    update: {},
    create: {
      email: 'master@example.com',
      password: hashedPassword,
      name: 'Master User',
      role: Role.MASTER,
    },
  });

  // Create ADMIN user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
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
      password: hashedPassword,
      name: 'Regular User',
      role: Role.USER,
    },
  });

  console.log('Seed data created successfully:');
  console.log('Master User:', masterUser);
  console.log('Admin User:', adminUser);
  console.log('Regular User:', regularUser);
  console.log('\nDefault credentials for all users:');
  console.log('Password: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
