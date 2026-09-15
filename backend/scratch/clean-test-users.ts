import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanTestUsers() {
  const result = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { contains: 'dep.writer.' } },
        { email: { contains: 'new.editor.' } },
        { email: { contains: 'siteadmin.escalate.' } },
        { email: { contains: 'test.lockout.' } },
        { email: { contains: 'bf.p9.' } },
      ],
    },
  });
  console.log(`Cleaned up ${result.count} test artifact accounts from database.`);

  const slugUpdate = await prisma.blogTranslation.updateMany({
    where: {
      slug: 'b2b-saas-funnel-optimization-demo',
    },
    data: {
      slug: 'b2b-saas-funnel-optimization',
    },
  });
  console.log(`Cleaned up ${slugUpdate.count} demo slugs to 'b2b-saas-funnel-optimization'.`);
}

cleanTestUsers().finally(() => prisma.$disconnect());
