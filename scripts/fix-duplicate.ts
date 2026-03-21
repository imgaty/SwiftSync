import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const ids = ['cmlv2xmf10001m9y14l73cqim', 'cmljo4xum0005jhy1jlqfa5t8'];
  for (const id of ids) {
    const accounts = await prisma.bankAccount.count({ where: { userId: id } });
    const txns = await prisma.transaction.count({ where: { userId: id } });
    const bills = await prisma.bill.count({ where: { userId: id } });
    const budgets = await prisma.budget.count({ where: { userId: id } });
    console.log(`User ${id} - Accounts: ${accounts} | Txns: ${txns} | Bills: ${bills} | Budgets: ${budgets}`);
  }

  // Delete the duplicate (app-created, no data, wrong password)
  const dupeId = 'cmlv2xmf10001m9y14l73cqim';
  const dupeAccounts = await prisma.bankAccount.count({ where: { userId: dupeId } });
  if (dupeAccounts === 0) {
    await prisma.user.delete({ where: { id: dupeId } });
    console.log(`\nDeleted duplicate user ${dupeId}`);
  } else {
    console.log(`\nDuplicate user has ${dupeAccounts} accounts, NOT deleting`);
  }

  process.exit(0);
}
check();
