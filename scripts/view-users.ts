// Run with: DATABASE_URL="postgresql://..." npx tsx scripts/view-users.ts

import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

console.log('\n=== SwiftSync User Database ===\n');

async function viewUsers() {
  try {
    const users = await prisma.user.findMany();
    
    if (users.length === 0) {
      console.log('No users registered yet.');
    } else {
      console.log(`Total users: ${users.length}\n`);
      
      users.forEach((user, index) => {
        console.log(`--- User ${index + 1} ---`);
        console.log(`ID: ${user.id}`);
        console.log(`Created: ${user.createdAt.toISOString()}`);
        console.log(`Email: ${user.email}`);
        console.log(`Name: ${user.name || '—'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

viewUsers();
