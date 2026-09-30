const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const updates = [
  {
    slug: 'top-10-boarding-schools-in-himachal-pradesh-for-your-child-future',
    date: new Date('2024-11-09T10:00:00.000Z')
  },
  {
    slug: 'essential-considerations-for-selecting-a-boarding-school',
    date: new Date('2024-04-12T10:00:00.000Z')
  },
  {
    slug: 'transformative-impact-on-your-child-growth',
    date: new Date('2024-04-03T10:00:00.000Z')
  },
  {
    slug: 'unveiling-the-benefits-of-an-education-beyond-classroom',
    date: new Date('2024-03-20T10:00:00.000Z')
  },
  {
    slug: 'best-residential-schools-in-north-india',
    date: new Date('2024-03-01T10:00:00.000Z')
  },
  {
    slug: 'the-best-schools-in-north-india-shaping-future-leaders',
    date: new Date('2024-02-15T10:00:00.000Z')
  }
];

async function main() {
  console.log('Connecting to database...');
  for (const item of updates) {
    const translation = await prisma.blogTranslation.findFirst({
      where: {
        slug: item.slug,
        blog: { websiteId: 'site-pinegrove' }
      },
      include: { blog: true }
    });

    if (translation && translation.blog) {
      const updated = await prisma.blog.update({
        where: { id: translation.blog.id },
        data: { publishDate: item.date }
      });
      console.log(`Updated [${item.slug}]: publishDate = ${updated.publishDate.toISOString()}`);
    } else {
      console.warn(`Could not find blog with slug: ${item.slug}`);
    }
  }
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
