/**
 * FTS Migration Runner Script
 * Applies add_fts_search_vector.sql to the connected PostgreSQL database.
 *
 * Usage:
 *   pnpm run fts:migrate
 *
 * Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS guards).
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('🔍 Running PostgreSQL FTS migration...');

  const sqlPath = path.join(__dirname, '..', 'prisma', 'migrations', 'add_fts_search_vector.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split on semicolons to execute each statement separately via Prisma $executeRawUnsafe
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement + ';');
      console.log(`  ✅ Executed: ${statement.slice(0, 60).replace(/\n/g, ' ')}...`);
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('does not exist')) {
        console.log(`  ⚠️  Skipped (already applied): ${statement.slice(0, 60).replace(/\n/g, ' ')}`);
      } else {
        console.error(`  ❌ Failed: ${err.message}`);
        throw err;
      }
    }
  }

  await prisma.$disconnect();
  console.log('✅ FTS migration complete — search_vector column + GIN index applied.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
