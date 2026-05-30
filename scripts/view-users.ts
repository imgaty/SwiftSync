//
//  view-users.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides the view users maintenance script for Argent, automating operational or
//  data-repair work that supports local development and administration.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

console.log('\n=== Argent User Database ===\n');

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
