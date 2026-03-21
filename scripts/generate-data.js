// generate-data.js
// Unified Personal Finance Data Generator
// Generates: accounts, transactions, bills, budgets
// TO RUN: node scripts/generate-data.js

const fs = require("fs");
const path = require("path");

// ==============================================================================
// CONFIGURATION
// ==============================================================================

const CONFIG = {
  startDate: new Date("2000-01-01"),
  endDate: new Date(),
  currency: "EUR",
  locale: "pt-PT",
  
  // Salary configuration (grows over time)
  baseSalary: 800, // Starting salary in 2000
  salaryGrowthPerYear: 0.04, // 4% annual growth
  salaryPayDay: 1,
  
  // Transaction frequency (probability per day)
  transactionsPerDay: { min: 0, max: 4 },
};

// ==============================================================================
// ACCOUNTS
// ==============================================================================

const ACCOUNTS = [
  { id: "acc_checking", name: "Main Checking", type: "checking", institution: "Millennium BCP", color: "rgba(59, 130, 246, 1)" },
  { id: "acc_savings", name: "Savings", type: "savings", institution: "Caixa Geral de Depósitos", color: "rgba(34, 197, 94, 1)" },
  { id: "acc_credit", name: "Credit Card", type: "credit_card", institution: "Santander", color: "rgba(239, 68, 68, 1)" },
  { id: "acc_digital", name: "Revolut", type: "digital_wallet", institution: "Revolut", color: "rgba(139, 92, 246, 1)" },
];

// ==============================================================================
// TAGS & TRANSACTION TEMPLATES
// ==============================================================================

// Income templates
const INCOME_TEMPLATES = [
  { tags: ["salary", "work"], description: "Monthly Salary", minAmount: null, maxAmount: null, isSalary: true, dayOfMonth: 1, probability: 1 },
  { tags: ["freelance", "work"], description: ["Logo Design", "Website Project", "Consulting", "Photography Gig", "Writing Article"], minAmount: 100, maxAmount: 2000, probability: 0.02 },
  { tags: ["investment", "dividends"], description: ["Stock Dividends", "ETF Distribution", "Bond Interest"], minAmount: 20, maxAmount: 500, probability: 0.005 },
  { tags: ["refund"], description: ["Tax Refund", "Purchase Refund", "Insurance Refund", "Utility Refund"], minAmount: 10, maxAmount: 300, probability: 0.01 },
  { tags: ["gift"], description: ["Birthday Gift", "Christmas Gift", "Gift from Family"], minAmount: 20, maxAmount: 200, probability: 0.005 },
  { tags: ["bonus", "work"], description: ["Year-end Bonus", "Performance Bonus", "Holiday Bonus"], minAmount: 200, maxAmount: 2000, probability: 0.003, monthOnly: [3, 6, 12] },
];

// Expense templates
const EXPENSE_TEMPLATES = [
  // Housing - monthly
  { tags: ["housing", "rent", "recurring"], description: "Monthly Rent", minAmount: 300, maxAmount: 800, dayOfMonth: 5, probability: 1, accountPreference: "acc_checking" },
  
  // Utilities - monthly
  { tags: ["utilities", "electricity", "recurring"], description: "EDP Electricity", minAmount: 30, maxAmount: 120, dayOfMonth: 10, probability: 1, accountPreference: "acc_checking" },
  { tags: ["utilities", "water", "recurring"], description: "Water Bill", minAmount: 15, maxAmount: 40, dayOfMonth: 12, probability: 1, accountPreference: "acc_checking" },
  { tags: ["utilities", "gas", "recurring"], description: "Gas Bill", minAmount: 20, maxAmount: 60, dayOfMonth: 14, probability: 0.8, accountPreference: "acc_checking" },
  { tags: ["utilities", "internet", "recurring"], description: "Internet Bill", minAmount: 30, maxAmount: 50, dayOfMonth: 15, probability: 1, accountPreference: "acc_checking" },
  { tags: ["utilities", "phone", "recurring"], description: "Phone Bill", minAmount: 15, maxAmount: 40, dayOfMonth: 16, probability: 1, accountPreference: "acc_checking" },
  
  // Subscriptions
  { tags: ["subscriptions", "entertainment", "recurring"], description: ["Netflix", "HBO Max", "Disney+", "Spotify", "YouTube Premium", "Apple Music"], minAmount: 6, maxAmount: 18, dayOfMonth: 20, probability: 0.8, accountPreference: "acc_credit" },
  { tags: ["subscriptions", "health", "recurring"], description: "Gym Membership", minAmount: 25, maxAmount: 50, dayOfMonth: 1, probability: 0.6, accountPreference: "acc_checking" },
  { tags: ["subscriptions", "software", "recurring"], description: ["Cloud Storage", "VPN", "Adobe CC", "Microsoft 365"], minAmount: 5, maxAmount: 30, dayOfMonth: 22, probability: 0.4, accountPreference: "acc_credit" },
  
  // Insurance - monthly
  { tags: ["insurance", "health", "recurring"], description: "Health Insurance", minAmount: 40, maxAmount: 150, dayOfMonth: 8, probability: 0.7, accountPreference: "acc_checking" },
  { tags: ["insurance", "car", "recurring"], description: "Car Insurance", minAmount: 30, maxAmount: 80, dayOfMonth: 9, probability: 0.5, accountPreference: "acc_checking" },
  
  // Food - daily
  { tags: ["food", "groceries"], description: ["Pingo Doce", "Continente", "Lidl", "Auchan", "Mini Preço", "Mercadona"], minAmount: 15, maxAmount: 120, probability: 0.4, accountPreference: "acc_credit" },
  { tags: ["food", "dining"], description: ["Restaurant", "Café", "Lunch", "Dinner Out", "Takeaway"], minAmount: 8, maxAmount: 50, probability: 0.25, accountPreference: "acc_credit" },
  { tags: ["food", "coffee"], description: ["Coffee Shop", "Starbucks", "Padaria"], minAmount: 2, maxAmount: 8, probability: 0.3, accountPreference: "acc_digital" },
  { tags: ["food", "delivery"], description: ["Uber Eats", "Glovo", "Bolt Food"], minAmount: 12, maxAmount: 35, probability: 0.1, accountPreference: "acc_credit" },
  
  // Transport
  { tags: ["transport", "fuel"], description: ["Galp", "Repsol", "BP", "Cepsa"], minAmount: 30, maxAmount: 80, probability: 0.15, accountPreference: "acc_credit" },
  { tags: ["transport", "public"], description: ["Metro Ticket", "Bus Pass", "Train Ticket", "Viva Viagem"], minAmount: 2, maxAmount: 50, probability: 0.2, accountPreference: "acc_digital" },
  { tags: ["transport", "rideshare"], description: ["Uber", "Bolt", "Taxi"], minAmount: 5, maxAmount: 25, probability: 0.08, accountPreference: "acc_digital" },
  { tags: ["transport", "parking"], description: ["Parking", "EMEL"], minAmount: 2, maxAmount: 15, probability: 0.1, accountPreference: "acc_digital" },
  { tags: ["transport", "maintenance"], description: ["Car Service", "Car Wash", "Tire Change", "Oil Change"], minAmount: 20, maxAmount: 300, probability: 0.02, accountPreference: "acc_credit" },
  
  // Shopping
  { tags: ["shopping", "clothes"], description: ["Zara", "H&M", "Primark", "Pull&Bear", "Bershka"], minAmount: 20, maxAmount: 150, probability: 0.05, accountPreference: "acc_credit" },
  { tags: ["shopping", "electronics"], description: ["Worten", "FNAC", "Amazon", "PC Diga"], minAmount: 30, maxAmount: 500, probability: 0.02, accountPreference: "acc_credit" },
  { tags: ["shopping", "home"], description: ["IKEA", "Leroy Merlin", "Home Decor", "Furniture"], minAmount: 20, maxAmount: 300, probability: 0.02, accountPreference: "acc_credit" },
  
  // Entertainment
  { tags: ["entertainment", "cinema"], description: ["Cinema Ticket", "NOS Cinemas", "UCI"], minAmount: 7, maxAmount: 20, probability: 0.04, accountPreference: "acc_digital" },
  { tags: ["entertainment", "events"], description: ["Concert", "Theatre", "Museum", "Event Ticket"], minAmount: 15, maxAmount: 80, probability: 0.02, accountPreference: "acc_credit" },
  { tags: ["entertainment", "games"], description: ["PlayStation Store", "Steam", "Nintendo", "Game Purchase"], minAmount: 10, maxAmount: 70, probability: 0.03, accountPreference: "acc_credit" },
  { tags: ["entertainment", "books"], description: ["Bookstore", "Kindle Book", "FNAC Books", "Wook"], minAmount: 10, maxAmount: 40, probability: 0.03, accountPreference: "acc_credit" },
  
  // Health
  { tags: ["health", "pharmacy"], description: ["Pharmacy", "Farmácia", "Medicine"], minAmount: 5, maxAmount: 50, probability: 0.08, accountPreference: "acc_credit" },
  { tags: ["health", "medical"], description: ["Doctor Visit", "Dentist", "Lab Tests", "Specialist"], minAmount: 30, maxAmount: 150, probability: 0.02, accountPreference: "acc_credit" },
  
  // Education
  { tags: ["education", "courses"], description: ["Online Course", "Udemy", "Coursera", "Workshop"], minAmount: 10, maxAmount: 100, probability: 0.01, accountPreference: "acc_credit" },
  { tags: ["education", "books"], description: ["Textbook", "Learning Material"], minAmount: 20, maxAmount: 80, probability: 0.01, accountPreference: "acc_credit" },
  
  // Travel
  { tags: ["travel", "accommodation"], description: ["Hotel", "Airbnb", "Hostel"], minAmount: 50, maxAmount: 200, probability: 0.01, accountPreference: "acc_credit" },
  { tags: ["travel", "flights"], description: ["Flight Ticket", "TAP", "Ryanair", "EasyJet"], minAmount: 50, maxAmount: 300, probability: 0.008, accountPreference: "acc_credit" },
  
  // Services
  { tags: ["services", "personal"], description: ["Haircut", "Barber", "Spa", "Beauty"], minAmount: 15, maxAmount: 60, probability: 0.04, accountPreference: "acc_digital" },
  { tags: ["services", "home"], description: ["Cleaning Service", "Repair", "Plumber", "Electrician"], minAmount: 30, maxAmount: 150, probability: 0.01, accountPreference: "acc_checking" },
  
  // Taxes - annual/quarterly
  { tags: ["taxes", "income"], description: "IRS Payment", minAmount: 200, maxAmount: 2000, monthOnly: [4, 5], dayOfMonth: 15, probability: 0.5, accountPreference: "acc_checking" },
  { tags: ["taxes", "property"], description: "IMI Property Tax", minAmount: 100, maxAmount: 500, monthOnly: [4, 7, 11], dayOfMonth: 20, probability: 0.3, accountPreference: "acc_checking" },
  { tags: ["taxes", "vehicle"], description: "IUC Vehicle Tax", minAmount: 50, maxAmount: 300, monthOnly: [1, 2], dayOfMonth: 25, probability: 0.4, accountPreference: "acc_checking" },
  
  // Other
  { tags: ["other", "gifts"], description: ["Birthday Gift", "Christmas Present", "Wedding Gift"], minAmount: 20, maxAmount: 100, probability: 0.02, accountPreference: "acc_credit" },
  { tags: ["other", "donations"], description: ["Charity Donation", "NGO Donation"], minAmount: 5, maxAmount: 50, probability: 0.01, accountPreference: "acc_checking" },
  { tags: ["other", "fees"], description: ["Bank Fee", "ATM Fee", "Service Fee"], minAmount: 2, maxAmount: 20, probability: 0.02, accountPreference: "acc_checking" },
];

// ==============================================================================
// BILLS (Recurring)
// ==============================================================================

const BILLS = [
  { id: "bill_rent", name: "Monthly Rent", amount: 650, tags: ["housing", "rent", "recurring"], dueDay: 5, frequency: "monthly", accountId: "acc_checking" },
  { id: "bill_electricity", name: "EDP Electricity", amount: 60, tags: ["utilities", "electricity", "recurring"], dueDay: 10, frequency: "monthly", accountId: "acc_checking" },
  { id: "bill_water", name: "Water Bill", amount: 25, tags: ["utilities", "water", "recurring"], dueDay: 12, frequency: "monthly", accountId: "acc_checking" },
  { id: "bill_internet", name: "Internet", amount: 40, tags: ["utilities", "internet", "recurring"], dueDay: 15, frequency: "monthly", accountId: "acc_checking" },
  { id: "bill_phone", name: "Phone Plan", amount: 25, tags: ["utilities", "phone", "recurring"], dueDay: 16, frequency: "monthly", accountId: "acc_checking" },
  { id: "bill_netflix", name: "Netflix", amount: 14, tags: ["subscriptions", "entertainment", "recurring"], dueDay: 20, frequency: "monthly", accountId: "acc_credit" },
  { id: "bill_spotify", name: "Spotify", amount: 11, tags: ["subscriptions", "entertainment", "recurring"], dueDay: 20, frequency: "monthly", accountId: "acc_credit" },
  { id: "bill_gym", name: "Gym Membership", amount: 35, tags: ["subscriptions", "health", "recurring"], dueDay: 1, frequency: "monthly", accountId: "acc_checking" },
  { id: "bill_health_insurance", name: "Health Insurance", amount: 80, tags: ["insurance", "health", "recurring"], dueDay: 8, frequency: "monthly", accountId: "acc_checking" },
];

// ==============================================================================
// BUDGETS
// ==============================================================================

const BUDGETS = [
  { tag: "food", limit: 400, color: "rgba(249, 115, 22, 1)" },
  { tag: "transport", limit: 150, color: "rgba(59, 130, 246, 1)" },
  { tag: "housing", limit: 700, color: "rgba(139, 92, 246, 1)" },
  { tag: "utilities", limit: 200, color: "rgba(234, 179, 8, 1)" },
  { tag: "subscriptions", limit: 80, color: "rgba(236, 72, 153, 1)" },
  { tag: "entertainment", limit: 100, color: "rgba(168, 85, 247, 1)" },
  { tag: "shopping", limit: 200, color: "rgba(20, 184, 166, 1)" },
  { tag: "health", limit: 150, color: "rgba(34, 197, 94, 1)" },
  { tag: "insurance", limit: 150, color: "rgba(99, 102, 241, 1)" },
  { tag: "services", limit: 100, color: "rgba(244, 63, 94, 1)" },
  { tag: "other", limit: 100, color: "rgba(107, 114, 128, 1)" },
];

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function chance(probability) {
  return Math.random() < probability;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getYearsSince(date, startDate) {
  return (date - startDate) / (365.25 * 24 * 60 * 60 * 1000);
}

function generateId() {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==============================================================================
// TRANSACTION GENERATION
// ==============================================================================

function calculateSalary(date, startDate) {
  const yearsSince = getYearsSince(date, startDate);
  const growthMultiplier = Math.pow(1 + CONFIG.salaryGrowthPerYear, yearsSince);
  
  // Salary also grows with inflation and jumps over time
  let baseSalary = CONFIG.baseSalary;
  
  // Job changes / promotions over time
  if (yearsSince > 5) baseSalary = 1200;
  if (yearsSince > 10) baseSalary = 1800;
  if (yearsSince > 15) baseSalary = 2500;
  if (yearsSince > 20) baseSalary = 3200;
  
  return Math.round(baseSalary * growthMultiplier);
}

function shouldGenerateTransaction(template, date) {
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  
  // Check if this is a specific day-of-month transaction
  if (template.dayOfMonth && dayOfMonth !== template.dayOfMonth) {
    return false;
  }
  
  // Check if this is month-restricted
  if (template.monthOnly && !template.monthOnly.includes(month)) {
    return false;
  }
  
  // Random probability check
  return chance(template.probability);
}

function createTransaction(template, date, type, accountId) {
  let amount;
  
  if (template.isSalary) {
    amount = calculateSalary(date, CONFIG.startDate);
  } else {
    amount = randFloat(template.minAmount, template.maxAmount);
  }
  
  // Scale amounts based on year (inflation adjustment)
  const yearsSince = getYearsSince(date, CONFIG.startDate);
  if (!template.isSalary) {
    const inflationMultiplier = Math.pow(1.02, yearsSince); // 2% inflation
    amount = Math.round(amount * inflationMultiplier * 100) / 100;
  }
  
  const description = Array.isArray(template.description) 
    ? randomItem(template.description) 
    : template.description;
  
  return {
    id: generateId(),
    date: formatDate(date),
    type,
    amount,
    tags: [...template.tags],
    description,
    accountId: accountId || template.accountPreference || randomItem(ACCOUNTS).id,
  };
}

function generateTransactions() {
  const transactions = [];
  let current = new Date(CONFIG.startDate);
  let transactionIdCounter = 0;
  
  while (current <= CONFIG.endDate) {
    const isWeekendDay = isWeekend(current);
    
    // Generate income transactions
    for (const template of INCOME_TEMPLATES) {
      if (shouldGenerateTransaction(template, current)) {
        const accountId = template.isSalary ? "acc_checking" : randomItem(["acc_checking", "acc_digital"]);
        const txn = createTransaction(template, current, "in", accountId);
        txn.id = `txn_${++transactionIdCounter}`;
        transactions.push(txn);
      }
    }
    
    // Generate expense transactions
    for (const template of EXPENSE_TEMPLATES) {
      // Adjust probability for weekends
      let adjustedProbability = template.probability;
      if (isWeekendDay) {
        // More entertainment, dining, shopping on weekends
        if (template.tags.some(t => ["entertainment", "dining", "shopping"].includes(t))) {
          adjustedProbability *= 2;
        }
        // Less work-related on weekends
        if (template.tags.includes("work")) {
          adjustedProbability *= 0.3;
        }
      }
      
      const modifiedTemplate = { ...template, probability: adjustedProbability };
      
      if (shouldGenerateTransaction(modifiedTemplate, current)) {
        const txn = createTransaction(template, current, "out", template.accountPreference);
        txn.id = `txn_${++transactionIdCounter}`;
        transactions.push(txn);
      }
    }
    
    // Advance one day
    current.setDate(current.getDate() + 1);
  }
  
  return transactions;
}

// ==============================================================================
// ACCOUNT BALANCE CALCULATION
// ==============================================================================

function calculateAccountBalances(transactions) {
  const accounts = ACCOUNTS.map(acc => ({
    ...acc,
    balance: 0,
    totalIn: 0,
    totalOut: 0,
    transactionCount: 0,
  }));
  
  const accountMap = new Map(accounts.map(acc => [acc.id, acc]));
  
  for (const txn of transactions) {
    const account = accountMap.get(txn.accountId);
    if (account) {
      if (txn.type === "in") {
        account.balance += txn.amount;
        account.totalIn += txn.amount;
      } else {
        account.balance -= txn.amount;
        account.totalOut += txn.amount;
      }
      account.transactionCount++;
    }
  }
  
  // Round balances
  accounts.forEach(acc => {
    acc.balance = Math.round(acc.balance * 100) / 100;
    acc.totalIn = Math.round(acc.totalIn * 100) / 100;
    acc.totalOut = Math.round(acc.totalOut * 100) / 100;
  });
  
  return accounts;
}

// ==============================================================================
// MAIN
// ==============================================================================

console.log("🚀 Generating financial data...\n");

const startTime = Date.now();

// Generate transactions
console.log("📝 Generating transactions...");
const transactions = generateTransactions();

// Calculate account balances
console.log("💰 Calculating account balances...");
const accounts = calculateAccountBalances(transactions);

// Build final data object
const data = {
  meta: {
    generatedAt: new Date().toISOString(),
    currency: CONFIG.currency,
    locale: CONFIG.locale,
    dateRange: {
      start: formatDate(CONFIG.startDate),
      end: formatDate(CONFIG.endDate),
    },
    totalTransactions: transactions.length,
  },
  accounts,
  transactions,
  bills: BILLS,
  budgets: BUDGETS,
};

// Write to file
const outputPath = path.join(__dirname, "..", "public", "data.json");
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

const endTime = Date.now();
const duration = ((endTime - startTime) / 1000).toFixed(2);

// Summary
console.log("\n" + "=".repeat(60));
console.log("✅ GENERATION COMPLETE");
console.log("=".repeat(60));
console.log(`📁 Output: ${outputPath}`);
console.log(`⏱️  Duration: ${duration}s`);
console.log(`📅 Date range: ${formatDate(CONFIG.startDate)} → ${formatDate(CONFIG.endDate)}`);
console.log(`📝 Transactions: ${transactions.length.toLocaleString()}`);
console.log(`🏦 Accounts: ${accounts.length}`);
console.log(`📋 Bills: ${BILLS.length}`);
console.log(`💳 Budgets: ${BUDGETS.length}`);
console.log("\n📊 Account Summary:");
accounts.forEach(acc => {
  const balanceStr = acc.balance >= 0 
    ? `€${acc.balance.toLocaleString()}` 
    : `-€${Math.abs(acc.balance).toLocaleString()}`;
  console.log(`   ${acc.name}: ${balanceStr} (${acc.transactionCount.toLocaleString()} transactions)`);
});

const totalIn = transactions.filter(t => t.type === "in").reduce((sum, t) => sum + t.amount, 0);
const totalOut = transactions.filter(t => t.type === "out").reduce((sum, t) => sum + t.amount, 0);
console.log("\n💵 Totals:");
console.log(`   Income:   €${Math.round(totalIn).toLocaleString()}`);
console.log(`   Expenses: €${Math.round(totalOut).toLocaleString()}`);
console.log(`   Net:      €${Math.round(totalIn - totalOut).toLocaleString()}`);
