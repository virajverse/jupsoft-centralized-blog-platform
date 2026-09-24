const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Jupsoft#SuperAdmin2026!$', 10);
  
  // 1. Recreate superadmin in Supabase
  const user = await prisma.user.upsert({
    where: { id: 'usr-superadmin' },
    update: {
      name: 'Sachin Sharma (Super Admin)',
      email: 'superadmin@jupsoft.com',
      passwordHash: hash,
      status: 'active',
      roleAssignments: {
        deleteMany: {},
        create: [
          { websiteId: null, isGlobal: true, role: 'Super Admin' },
          { websiteId: 'site-cloud', isGlobal: false, role: 'Super Admin' },
          { websiteId: 'site-growth', isGlobal: false, role: 'Super Admin' },
          { websiteId: 'site-jupsoft-test', isGlobal: false, role: 'Super Admin' },
        ],
      },
    },
    create: {
      id: 'usr-superadmin',
      name: 'Sachin Sharma (Super Admin)',
      email: 'superadmin@jupsoft.com',
      passwordHash: hash,
      avatar: '/uploads/avatars/avatar-1.webp',
      status: 'active',
      lastLoginIp: '127.0.0.1',
      roleAssignments: {
        create: [
          { websiteId: null, isGlobal: true, role: 'Super Admin' },
          { websiteId: 'site-cloud', isGlobal: false, role: 'Super Admin' },
          { websiteId: 'site-growth', isGlobal: false, role: 'Super Admin' },
          { websiteId: 'site-jupsoft-test', isGlobal: false, role: 'Super Admin' },
        ],
      },
    },
    include: { roleAssignments: true },
  });
  console.log('✅ RECREATED SUPERADMIN IN SUPABASE:', user.id, user.name, user.email);

  // 2. Install PostgreSQL BEFORE DELETE trigger on "users" table
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION prevent_superadmin_deletion()
    RETURNS TRIGGER AS $$
    BEGIN
        IF OLD.id = 'usr-superadmin' OR OLD.email = 'superadmin@jupsoft.com' THEN
            RAISE EXCEPTION 'CRITICAL SECURITY: Super Admin account cannot be deleted or revoked under any circumstances.';
        END IF;
        RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_prevent_superadmin_deletion ON "users";`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_prevent_superadmin_deletion
    BEFORE DELETE ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_superadmin_deletion();
  `);
  console.log('🛡️ TRIGGER 1: prevent_superadmin_deletion APPLIED ON "users"');

  // 3. Install PostgreSQL BEFORE DELETE trigger on "user_role_assignments" table
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION prevent_superadmin_role_deletion()
    RETURNS TRIGGER AS $$
    BEGIN
        IF OLD."userId" = 'usr-superadmin' AND OLD.role = 'Super Admin' AND OLD."isGlobal" = true THEN
            RAISE EXCEPTION 'CRITICAL SECURITY: Global Super Admin master role cannot be revoked.';
        END IF;
        RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_prevent_superadmin_role_deletion ON "user_role_assignments";`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_prevent_superadmin_role_deletion
    BEFORE DELETE ON "user_role_assignments"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_superadmin_role_deletion();
  `);
  console.log('🛡️ TRIGGER 2: prevent_superadmin_role_deletion APPLIED ON "user_role_assignments"');

  // 4. Install PostgreSQL BEFORE UPDATE trigger on "users" status
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION prevent_superadmin_deactivation()
    RETURNS TRIGGER AS $$
    BEGIN
        IF (OLD.id = 'usr-superadmin' OR OLD.email = 'superadmin@jupsoft.com') AND NEW.status != 'active' THEN
            RAISE EXCEPTION 'CRITICAL SECURITY: Super Admin account cannot be suspended or deactivated.';
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_prevent_superadmin_deactivation ON "users";`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_prevent_superadmin_deactivation
    BEFORE UPDATE ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_superadmin_deactivation();
  `);
  console.log('🛡️ TRIGGER 3: prevent_superadmin_deactivation APPLIED ON "users"');

  // 5. TEST: Try to delete superadmin via raw query or prisma to confirm trigger blocks it
  console.log('🧪 Verifying DB Trigger protection with test delete...');
  try {
    await prisma.user.delete({ where: { id: 'usr-superadmin' } });
    console.error('❌ FAILED: Delete succeeded when it should have been blocked!');
  } catch (err) {
    console.log('✅ SUCCESS: PostgreSQL TRIGGER BLOCKED DELETION AT DB LEVEL:');
    console.log('   Expected DB error:', err.message.slice(0, 150));
  }

  // 6. Verify user is still present
  const verify = await prisma.user.findUnique({
    where: { id: 'usr-superadmin' },
    include: { roleAssignments: true },
  });
  console.log('🔒 VERIFIED USER STILL IN DATABASE:', verify?.id, verify?.name, verify?.email, 'STATUS:', verify?.status);
}

main()
  .catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
