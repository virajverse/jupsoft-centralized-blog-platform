import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, roleAssignments: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total users in DB: ${users.length}`);
  users.forEach(u => {
    console.log(`- ${u.name} | ${u.email} | Roles: ${JSON.stringify(u.roleAssignments.map(r => `${r.websiteId}:${r.role}`))}`);
  });
}

main().finally(() => prisma.$disconnect());
