const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const hash = await bcrypt.hash('admin123', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@rebelseason.com',
      password: hash,
      role: 'ADMIN',
    },
  });
  console.log('Admin created:', user.email);
  await prisma.$disconnect();
}

main().catch(console.error);
