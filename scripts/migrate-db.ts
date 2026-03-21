// Legacy MySQL migration script — no longer needed (migrated to Prisma/PostgreSQL)

async function migrate() {
    console.log('⚠️ This migration script is deprecated. Use Prisma migrations instead.');
    console.log('   Run: pnpm prisma migrate dev');
    process.exit(0);
}

migrate();

migrate();
