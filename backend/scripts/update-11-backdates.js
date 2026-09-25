/**
 * update-11-backdates.js
 * Updates the 11 latest blogs with their authentic publication dates
 * directly from jupsoft.com/blog/ listing cards.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BACKDATES = [
  {
    id: '3fa563dc-ac7d-41b9-9632-ea4083a8b00c',
    slug: 'learning-management-software-buying-guide-for-schools-in-2026-27',
    dateText: 'Thursday 30 July, 2026',
    date: new Date('2026-07-30T10:00:00.000Z'),
  },
  {
    id: '855f9f79-892a-4533-895e-da9751576b34',
    slug: 'how-ai-is-transforming-school-admission-management',
    dateText: 'Thursday 30 July, 2026',
    date: new Date('2026-07-30T10:00:00.000Z'),
  },
  {
    id: '75439447-80ab-4179-9dad-8d3a7dc3f683',
    slug: 'why-ai-school-erp-is-better-than-traditional-school-software',
    dateText: 'Thursday 30 July, 2026',
    date: new Date('2026-07-30T10:00:00.000Z'),
  },
  {
    id: 'e84fec44-57af-4091-9ba7-709320f1f000',
    slug: 'benefits-of-cloud-based-school-management-software-for-modern-schools',
    dateText: 'Wednesday 01 April, 2026',
    date: new Date('2026-04-01T10:00:00.000Z'),
  },
  {
    id: 'b5678d28-26dc-4fee-bd4c-8494a60a2f88',
    slug: 'how-an-all-in-one-school-erp-can-digitally-transform-your-education-system',
    dateText: 'Tuesday 24 March, 2026',
    date: new Date('2026-03-24T10:00:00.000Z'),
  },
  {
    id: '72e98849-20b4-4918-873b-abe17807cda6',
    slug: 'role-of-ai-in-school-management-systems',
    dateText: 'Friday 02 January, 2026',
    date: new Date('2026-01-02T10:00:00.000Z'),
  },
  {
    id: '6f96c091-995e-40ce-a016-522b26926770',
    slug: 'up-board-mandatory-vocational-education-from-class-9',
    dateText: 'Friday 02 January, 2026',
    date: new Date('2026-01-02T10:00:00.000Z'),
  },
  {
    id: '769e13c8-6c79-44f2-8032-0641ef5d7831',
    slug: 'how-ai-is-revolutionizing-personalized-school-erp-software-for-better-education',
    dateText: 'Saturday 18 October, 2025',
    date: new Date('2025-10-18T10:00:00.000Z'),
  },
  {
    id: '75c3f838-2df1-43ec-8602-1701f083d04d',
    slug: 'top-10-school-management-software-in-india-2025',
    dateText: 'Tuesday 12 August, 2025',
    date: new Date('2025-08-12T10:00:00.000Z'),
  },
  {
    id: '4b6d2e5a-ea9c-44de-ad4f-aec7c454676b',
    slug: 'the-role-of-school-management-software-in-ensuring-data-security-and-privacy',
    dateText: 'Monday 1 July, 2024',
    date: new Date('2024-07-01T10:00:00.000Z'),
  },
  {
    id: '19a4e9da-3e93-475d-a42f-1bbe7c00ac64',
    slug: 'all-you-need-to-know-about-the-student-information-system-software',
    dateText: 'Monday, September 18 2023',
    date: new Date('2023-09-18T10:00:00.000Z'),
  },
];

async function main() {
  console.log('========================================================================');
  console.log('🗓️ UPDATING 11 BLOGS WITH AUTHENTIC BACKDATES FROM JUPSOFT.COM/BLOG/');
  console.log('========================================================================\n');

  for (const item of BACKDATES) {
    const updated = await prisma.blog.update({
      where: { id: item.id },
      data: {
        publishDate: item.date,
        createdAt: item.date,
        updatedAt: item.date,
      },
    });

    console.log(`✅ [${item.slug}]`);
    console.log(`   ID:          ${item.id}`);
    console.log(`   Source Date: ${item.dateText}`);
    console.log(`   publishDate: ${updated.publishDate.toISOString()}`);
    console.log('----------------------------------------------------');
  }

  console.log('\n🎉 All 11 blogs successfully synchronized to their authentic backdates!');
}

main()
  .catch((e) => {
    console.error('Backdate update failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
