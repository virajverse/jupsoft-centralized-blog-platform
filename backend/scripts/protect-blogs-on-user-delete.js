const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🛡️ Configuring Database so blogs are NEVER deleted when a user is deleted or suspended...');

  // 1. Drop NOT NULL on blogs.authorId so it can be preserved via SET NULL
  await prisma.$executeRawUnsafe(`
    ALTER TABLE blogs ALTER COLUMN "authorId" DROP NOT NULL;
  `);

  // 2. Drop all old authorId FK constraints (both case-sensitive and lowercase)
  await prisma.$executeRawUnsafe(`ALTER TABLE blogs DROP CONSTRAINT IF EXISTS "blogs_authorId_fkey";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE blogs DROP CONSTRAINT IF EXISTS blogs_authorid_fkey;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE blogs DROP CONSTRAINT IF EXISTS blogs_author_fkey;`);

  // 3. Add single robust FK constraint with ON DELETE SET NULL
  await prisma.$executeRawUnsafe(`
    ALTER TABLE blogs 
    ADD CONSTRAINT blogs_authorId_fkey 
    FOREIGN KEY ("authorId") 
    REFERENCES users(id) 
    ON DELETE SET NULL;
  `);

  // 4. Verify all foreign keys on blogs table
  const fks = await prisma.$queryRawUnsafe(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'blogs'
    ORDER BY tc.constraint_name;
  `);
  console.log('🔒 VERIFIED ACTIVE FKs ON BLOGS:');
  console.table(fks);
}

main()
  .catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
