/**
 * Populate the real user (Hilário Ferreira) with realistic financial data.
 * This script:
 * 1. Finds the real user by name
 * 2. Ensures banks exist
 * 3. Creates bank accounts for the user
 * 4. Creates ~200 realistic transactions over the last 6 months
 * 5. Creates budgets and recurring bills
 *
 * Run: npx tsx scripts/populate-user-data.ts
 */

import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(startDaysAgo: number, endDaysAgo: number): Date {
  const now = Date.now();
  const start = now - startDaysAgo * 86400000;
  const end = now - endDaysAgo * 86400000;
  return new Date(start + Math.random() * (end - start));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Transaction templates — realistic Portuguese finance
// ---------------------------------------------------------------------------

const INCOME_TEMPLATES = [
  { description: "Salário - Empresa XYZ", tags: ["salary"], minAmt: 1800, maxAmt: 2400 },
  { description: "Freelance - Projeto Web", tags: ["freelance"], minAmt: 300, maxAmt: 1200 },
  { description: "Transferência recebida", tags: ["transfer"], minAmt: 50, maxAmt: 500 },
  { description: "Reembolso IRS", tags: ["tax_refund"], minAmt: 200, maxAmt: 800 },
  { description: "Venda OLX", tags: ["other"], minAmt: 20, maxAmt: 150 },
  { description: "Cashback Revolut", tags: ["cashback"], minAmt: 2, maxAmt: 15 },
  { description: "Dividendos", tags: ["investment"], minAmt: 10, maxAmt: 100 },
  { description: "Rendas recebidas", tags: ["rental"], minAmt: 400, maxAmt: 700 },
];

const EXPENSE_TEMPLATES = [
  // Housing & Utilities
  { description: "Renda - Apartamento", tags: ["housing"], minAmt: 600, maxAmt: 900, freq: "monthly" },
  { description: "EDP - Eletricidade", tags: ["utilities"], minAmt: 40, maxAmt: 120, freq: "monthly" },
  { description: "Águas de Portugal", tags: ["utilities"], minAmt: 15, maxAmt: 45, freq: "monthly" },
  { description: "NOS - Internet & TV", tags: ["utilities"], minAmt: 35, maxAmt: 55, freq: "monthly" },
  { description: "Galp - Gás Natural", tags: ["utilities"], minAmt: 25, maxAmt: 70, freq: "monthly" },

  // Groceries
  { description: "Continente", tags: ["groceries"], minAmt: 30, maxAmt: 150 },
  { description: "Pingo Doce", tags: ["groceries"], minAmt: 15, maxAmt: 90 },
  { description: "Lidl", tags: ["groceries"], minAmt: 20, maxAmt: 80 },
  { description: "Mercadona", tags: ["groceries"], minAmt: 25, maxAmt: 110 },
  { description: "Mini Preço", tags: ["groceries"], minAmt: 10, maxAmt: 50 },

  // Transport
  { description: "Galp - Combustível", tags: ["transport"], minAmt: 30, maxAmt: 80 },
  { description: "BP - Combustível", tags: ["transport"], minAmt: 25, maxAmt: 75 },
  { description: "Via Verde - Portagens", tags: ["transport"], minAmt: 5, maxAmt: 30 },
  { description: "CP - Comboio", tags: ["transport"], minAmt: 3, maxAmt: 25 },
  { description: "Uber", tags: ["transport"], minAmt: 5, maxAmt: 20 },
  { description: "Bolt", tags: ["transport"], minAmt: 4, maxAmt: 18 },

  // Food & Dining
  { description: "McDonald's", tags: ["food"], minAmt: 5, maxAmt: 15 },
  { description: "Restaurante O Manel", tags: ["food"], minAmt: 12, maxAmt: 35 },
  { description: "Uber Eats", tags: ["food"], minAmt: 10, maxAmt: 30 },
  { description: "Starbucks", tags: ["food"], minAmt: 3, maxAmt: 8 },
  { description: "Padaria Modelo", tags: ["food"], minAmt: 2, maxAmt: 8 },
  { description: "Telepizza", tags: ["food"], minAmt: 8, maxAmt: 20 },
  { description: "Glovo", tags: ["food"], minAmt: 12, maxAmt: 28 },

  // Shopping
  { description: "Zara", tags: ["shopping"], minAmt: 20, maxAmt: 120 },
  { description: "Primark", tags: ["shopping"], minAmt: 10, maxAmt: 60 },
  { description: "FNAC", tags: ["shopping"], minAmt: 15, maxAmt: 200 },
  { description: "Worten", tags: ["shopping"], minAmt: 20, maxAmt: 300 },
  { description: "Amazon.es", tags: ["shopping"], minAmt: 10, maxAmt: 150 },
  { description: "IKEA", tags: ["shopping"], minAmt: 15, maxAmt: 250 },

  // Health
  { description: "Farmácia Holon", tags: ["health"], minAmt: 5, maxAmt: 50 },
  { description: "CUF - Consulta", tags: ["health"], minAmt: 30, maxAmt: 80 },
  { description: "Wells - Farmácia", tags: ["health"], minAmt: 8, maxAmt: 40 },

  // Entertainment
  { description: "Netflix", tags: ["entertainment"], minAmt: 8, maxAmt: 16, freq: "monthly" },
  { description: "Spotify", tags: ["entertainment"], minAmt: 7, maxAmt: 11, freq: "monthly" },
  { description: "Cinema NOS", tags: ["entertainment"], minAmt: 7, maxAmt: 15 },
  { description: "PlayStation Store", tags: ["entertainment"], minAmt: 10, maxAmt: 70 },
  { description: "Steam", tags: ["entertainment"], minAmt: 5, maxAmt: 50 },

  // Education & Personal
  { description: "Udemy", tags: ["education"], minAmt: 10, maxAmt: 15 },
  { description: "ChatGPT Plus", tags: ["education"], minAmt: 20, maxAmt: 20, freq: "monthly" },
  { description: "GitHub Pro", tags: ["education"], minAmt: 4, maxAmt: 4, freq: "monthly" },
  { description: "Vercel Pro", tags: ["education"], minAmt: 20, maxAmt: 20, freq: "monthly" },

  // Insurance & Finance
  { description: "Seguro Automóvel - Fidelidade", tags: ["insurance"], minAmt: 30, maxAmt: 50, freq: "monthly" },
  { description: "Seguro Saúde - Médis", tags: ["insurance"], minAmt: 25, maxAmt: 40, freq: "monthly" },

  // ATM & Transfers
  { description: "Levantamento ATM", tags: ["cash"], minAmt: 20, maxAmt: 200 },
  { description: "MB Way - Transferência", tags: ["transfer"], minAmt: 5, maxAmt: 100 },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("📊 Populating user data...\n");

  // 1. Find the real user
  const user = await prisma.user.findFirst({
    where: { name: "Hilário Ferreira" },
  });

  if (!user) {
    console.error("❌ User 'Hilário Ferreira' not found in database!");
    process.exit(1);
  }

  console.log(`👤 Found user: ${user.name} (${user.id})`);

  // 2. Clean existing data for THIS user only (don't touch seed users)
  const deleted = await Promise.all([
    prisma.transaction.deleteMany({ where: { userId: user.id } }),
    prisma.bill.deleteMany({ where: { userId: user.id } }),
    prisma.budget.deleteMany({ where: { userId: user.id } }),
    prisma.financialGoal.deleteMany({ where: { userId: user.id } }),
    prisma.notification.deleteMany({ where: { userId: user.id } }),
    prisma.bankAccount.deleteMany({ where: { userId: user.id } }),
  ]);
  console.log("🗑️  Cleared existing user data");

  // 3. Ensure banks exist
  const bankNames = ["Millennium BCP", "Revolut", "Caixa Geral de Depósitos"];
  const banks: Record<string, string> = {};
  for (const name of bankNames) {
    const bank = await prisma.bank.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    banks[name] = bank.id;
  }
  console.log(`🏦 Ensured ${Object.keys(banks).length} banks exist`);

  // 4. Create bank accounts
  const accounts = await Promise.all([
    prisma.bankAccount.create({
      data: {
        userId: user.id,
        bankId: banks["Millennium BCP"],
        accountType: "checking",
        cardName: "Conta à Ordem - Millennium",
        cardNumber: BigInt("4532015112830366"),
        expirationDate: new Date("2028-09-01"),
        balance: 3245.67,
        color: "#3B82F6",
        isActive: true,
      },
    }),
    prisma.bankAccount.create({
      data: {
        userId: user.id,
        bankId: banks["Revolut"],
        accountType: "digital_wallet",
        cardName: "Revolut",
        balance: 847.30,
        color: "#8B5CF6",
        isActive: true,
      },
    }),
    prisma.bankAccount.create({
      data: {
        userId: user.id,
        bankId: banks["Caixa Geral de Depósitos"],
        accountType: "savings",
        cardName: "Poupança - CGD",
        balance: 15200.00,
        color: "#22C55E",
        isActive: true,
      },
    }),
  ]);

  console.log(`💳 Created ${accounts.length} bank accounts`);

  const checkingId = accounts[0].id;
  const revolutId = accounts[1].id;
  const savingsId = accounts[2].id;

  // 5. Generate transactions over the last ~6 months
  const transactions: Array<{
    userId: string;
    date: Date;
    type: string;
    amount: number;
    description: string;
    tags: string[];
    accountId: string;
  }> = [];

  // Monthly salary (6 months)
  for (let m = 0; m < 6; m++) {
    const salaryDate = new Date();
    salaryDate.setMonth(salaryDate.getMonth() - m);
    salaryDate.setDate(1); // First of each month
    transactions.push({
      userId: user.id,
      date: salaryDate,
      type: "in",
      amount: randomBetween(2100, 2400),
      description: "Salário - Empresa XYZ",
      tags: ["salary"],
      accountId: checkingId,
    });
  }

  // Monthly recurring expenses
  const monthlyExpenses = EXPENSE_TEMPLATES.filter((t) => t.freq === "monthly");
  for (let m = 0; m < 6; m++) {
    for (const template of monthlyExpenses) {
      const day = Math.floor(Math.random() * 25) + 1;
      const date = new Date();
      date.setMonth(date.getMonth() - m);
      date.setDate(day);
      transactions.push({
        userId: user.id,
        date,
        type: "out",
        amount: randomBetween(template.minAmt, template.maxAmt),
        description: template.description,
        tags: template.tags,
        accountId: pick([checkingId, revolutId]),
      });
    }
  }

  // Random one-off expenses (100–150 over 6 months)
  const oneOffExpenses = EXPENSE_TEMPLATES.filter((t) => !t.freq);
  for (let i = 0; i < 130; i++) {
    const template = pick(oneOffExpenses);
    const daysAgo = Math.floor(Math.random() * 180);
    transactions.push({
      userId: user.id,
      date: randomDate(daysAgo, daysAgo),
      type: "out",
      amount: randomBetween(template.minAmt, template.maxAmt),
      description: template.description,
      tags: template.tags,
      accountId: pick([checkingId, revolutId, checkingId]), // Weighted toward checking
    });
  }

  // Random income (freelance, transfers, etc.)
  for (let i = 0; i < 15; i++) {
    const template = pick(INCOME_TEMPLATES.filter((t) => t.tags[0] !== "salary"));
    const daysAgo = Math.floor(Math.random() * 180);
    transactions.push({
      userId: user.id,
      date: randomDate(daysAgo, daysAgo),
      type: "in",
      amount: randomBetween(template.minAmt, template.maxAmt),
      description: template.description,
      tags: template.tags,
      accountId: pick([checkingId, revolutId]),
    });
  }

  // Savings deposits
  for (let m = 0; m < 6; m++) {
    const date = new Date();
    date.setMonth(date.getMonth() - m);
    date.setDate(5);
    transactions.push({
      userId: user.id,
      date,
      type: "out",
      amount: randomBetween(200, 500),
      description: "Transferência para Poupança",
      tags: ["savings"],
      accountId: checkingId,
    });
    transactions.push({
      userId: user.id,
      date,
      type: "in",
      amount: randomBetween(200, 500),
      description: "Depósito Poupança",
      tags: ["savings"],
      accountId: savingsId,
    });
  }

  // Sort by date (newest first) and batch create
  transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Batch create transactions in chunks
  const CHUNK_SIZE = 50;
  for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
    const chunk = transactions.slice(i, i + CHUNK_SIZE);
    await prisma.transaction.createMany({ data: chunk });
  }

  console.log(`💰 Created ${transactions.length} transactions`);

  // 6. Create budgets
  const budgets = await prisma.budget.createMany({
    data: [
      { userId: user.id, tag: "groceries", category: "Mercearia", limit: 400, color: "#22C55E" },
      { userId: user.id, tag: "food", category: "Alimentação", limit: 200, color: "#F59E0B" },
      { userId: user.id, tag: "transport", category: "Transporte", limit: 150, color: "#3B82F6" },
      { userId: user.id, tag: "entertainment", category: "Entretenimento", limit: 100, color: "#8B5CF6" },
      { userId: user.id, tag: "shopping", category: "Compras", limit: 250, color: "#EC4899" },
      { userId: user.id, tag: "utilities", category: "Utilidades", limit: 300, color: "#06B6D4" },
      { userId: user.id, tag: "health", category: "Saúde", limit: 100, color: "#EF4444" },
      { userId: user.id, tag: "housing", category: "Habitação", limit: 900, color: "#F97316" },
    ],
  });

  console.log(`📋 Created ${budgets.count} budgets`);

  // 7. Create bills
  const bills = await prisma.bill.createMany({
    data: [
      { userId: user.id, name: "Renda Apartamento", amount: 750, tags: ["housing"], dueDay: 1, frequency: "monthly", accountId: checkingId, category: "housing", autopay: true, status: "paid" },
      { userId: user.id, name: "EDP Eletricidade", amount: 65, tags: ["utilities"], dueDay: 15, frequency: "monthly", accountId: checkingId, category: "utilities", autopay: true, status: "paid" },
      { userId: user.id, name: "Águas de Portugal", amount: 28, tags: ["utilities"], dueDay: 20, frequency: "monthly", accountId: checkingId, category: "utilities", autopay: false, status: "pending" },
      { userId: user.id, name: "NOS Internet & TV", amount: 45, tags: ["utilities"], dueDay: 10, frequency: "monthly", accountId: checkingId, category: "utilities", autopay: true, status: "paid" },
      { userId: user.id, name: "Netflix", amount: 13.99, tags: ["entertainment"], dueDay: 5, frequency: "monthly", accountId: revolutId, category: "entertainment", autopay: true, status: "paid" },
      { userId: user.id, name: "Spotify", amount: 9.99, tags: ["entertainment"], dueDay: 12, frequency: "monthly", accountId: revolutId, category: "entertainment", autopay: true, status: "paid" },
      { userId: user.id, name: "ChatGPT Plus", amount: 20, tags: ["education"], dueDay: 18, frequency: "monthly", accountId: revolutId, category: "education", autopay: true, status: "paid" },
      { userId: user.id, name: "Seguro Automóvel", amount: 42, tags: ["insurance"], dueDay: 25, frequency: "monthly", accountId: checkingId, category: "insurance", autopay: true, status: "upcoming" },
      { userId: user.id, name: "Seguro Saúde - Médis", amount: 35, tags: ["insurance"], dueDay: 28, frequency: "monthly", accountId: checkingId, category: "insurance", autopay: true, status: "upcoming" },
      { userId: user.id, name: "GitHub Pro", amount: 4, tags: ["education"], dueDay: 7, frequency: "monthly", accountId: revolutId, category: "education", autopay: true, status: "paid" },
      { userId: user.id, name: "Galp Gás Natural", amount: 45, tags: ["utilities"], dueDay: 22, frequency: "monthly", accountId: checkingId, category: "utilities", autopay: false, status: "pending" },
    ],
  });

  console.log(`📄 Created ${bills.count} bills`);

  // 8. Create financial goals
  const goals = await prisma.financialGoal.createMany({
    data: [
      { userId: user.id, name: "Férias 2026", targetAmount: 3000, currentAmount: 1850, deadline: new Date("2026-07-01"), category: "travel", color: "#F59E0B", status: "active" },
      { userId: user.id, name: "Fundo de Emergência", targetAmount: 10000, currentAmount: 6500, category: "emergency", color: "#EF4444", status: "active" },
      { userId: user.id, name: "MacBook Pro M5", targetAmount: 2500, currentAmount: 800, deadline: new Date("2026-09-01"), category: "purchase", color: "#8B5CF6", status: "active" },
      { userId: user.id, name: "Investimento ETFs", targetAmount: 5000, currentAmount: 2100, category: "investment", color: "#22C55E", status: "active" },
    ],
  });

  console.log(`🎯 Created ${goals.count} financial goals`);

  // Done
  console.log("\n✅ User data populated successfully!");
  console.log(`   Accounts:     ${accounts.length}`);
  console.log(`   Transactions: ${transactions.length}`);
  console.log(`   Budgets:      ${budgets.count}`);
  console.log(`   Bills:        ${bills.count}`);
  console.log(`   Goals:        ${goals.count}`);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
