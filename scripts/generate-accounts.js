// generate-accounts.js
// Generates bank accounts and financial accounts data
// TO RUN: node generate-accounts.js

const fs = require("fs");

// Helper: random integer in range
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: random float in range with 2 decimals
function randFloat(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

// Generate random account number
function generateAccountNumber(type) {
    if (type === "credit_card") {
        return `${rand(4000, 5999)}${rand(1000, 9999)}${rand(1000, 9999)}${rand(1000, 9999)}`;
    }
    return `PT50${rand(1000, 9999)}${rand(1000, 9999)}${rand(1000, 9999)}${rand(1000, 9999)}`;
}

// Account templates
const accountTemplates = [
    // Checking accounts
    {
        name: "Main Checking",
        type: "checking",
        institution: "Millennium BCP",
        minBalance: 500,
        maxBalance: 8000,
        color: "bg-blue-500",
    },
    {
        name: "Secondary Checking",
        type: "checking",
        institution: "Caixa Geral de Depósitos",
        minBalance: 100,
        maxBalance: 3000,
        color: "bg-blue-600",
    },
    // Savings accounts
    {
        name: "Emergency Fund",
        type: "savings",
        institution: "Millennium BCP",
        minBalance: 2000,
        maxBalance: 15000,
        color: "bg-green-500",
    },
    {
        name: "Vacation Savings",
        type: "savings",
        institution: "Santander",
        minBalance: 500,
        maxBalance: 5000,
        color: "bg-green-600",
    },
    {
        name: "House Down Payment",
        type: "savings",
        institution: "Novo Banco",
        minBalance: 5000,
        maxBalance: 30000,
        color: "bg-green-700",
    },
    // Credit cards
    {
        name: "Visa Gold",
        type: "credit_card",
        institution: "Millennium BCP",
        minBalance: 100,
        maxBalance: 2500,
        color: "bg-purple-500",
    },
    {
        name: "Mastercard Platinum",
        type: "credit_card",
        institution: "Caixa Geral de Depósitos",
        minBalance: 50,
        maxBalance: 1500,
        color: "bg-purple-600",
    },
    // Cash
    {
        name: "Wallet Cash",
        type: "cash",
        institution: "Cash",
        minBalance: 20,
        maxBalance: 500,
        color: "bg-yellow-500",
    },
    // Investments
    {
        name: "Stock Portfolio",
        type: "investment",
        institution: "DEGIRO",
        minBalance: 5000,
        maxBalance: 50000,
        color: "bg-cyan-500",
    },
    {
        name: "ETF Portfolio",
        type: "investment",
        institution: "Trading 212",
        minBalance: 2000,
        maxBalance: 20000,
        color: "bg-cyan-600",
    },
    {
        name: "Crypto Holdings",
        type: "investment",
        institution: "Coinbase",
        minBalance: 500,
        maxBalance: 10000,
        color: "bg-cyan-700",
    },
    // Loans
    {
        name: "Car Loan",
        type: "loan",
        institution: "Millennium BCP",
        minBalance: 5000,
        maxBalance: 25000,
        color: "bg-red-500",
    },
    {
        name: "Personal Loan",
        type: "loan",
        institution: "Cofidis",
        minBalance: 1000,
        maxBalance: 10000,
        color: "bg-red-600",
    },
];

// Generate accounts
function generateAccounts() {
    const accounts = [];
    const today = new Date();

    // Randomly select 8-12 accounts from templates
    const numAccounts = rand(8, 12);
    const shuffled = [...accountTemplates].sort(() => Math.random() - 0.5);
    const selectedTemplates = shuffled.slice(0, numAccounts);

    // Ensure at least one of each essential type
    const types = new Set(selectedTemplates.map(t => t.type));
    const essentialTypes = ["checking", "savings", "credit_card"];
    
    for (const type of essentialTypes) {
        if (!types.has(type)) {
            const template = accountTemplates.find(t => t.type === type);
            if (template) {
                selectedTemplates.push(template);
            }
        }
    }

    selectedTemplates.forEach((template, index) => {
        const balance = randFloat(template.minBalance, template.maxBalance);
        
        // Monthly change: positive for assets, negative trend for liabilities
        let monthlyChange;
        if (template.type === "credit_card" || template.type === "loan") {
            monthlyChange = randFloat(-500, 100); // Mostly paying down
        } else if (template.type === "savings" || template.type === "investment") {
            monthlyChange = randFloat(-200, 800); // Usually growing
        } else {
            monthlyChange = randFloat(-1000, 1000); // Variable
        }

        // Last updated: random time in last 24 hours
        const lastUpdated = new Date(today);
        lastUpdated.setHours(lastUpdated.getHours() - rand(0, 24));

        accounts.push({
            id: index + 1,
            name: template.name,
            type: template.type,
            institution: template.institution,
            balance: template.type === "credit_card" || template.type === "loan" 
                ? -Math.abs(balance) // Negative for debts
                : balance,
            currency: "EUR",
            lastUpdated: formatDate(lastUpdated),
            isActive: Math.random() > 0.1, // 90% are active
            accountNumber: generateAccountNumber(template.type),
            color: template.color,
            monthlyChange,
            transactionCount: rand(5, 50),
        });
    });

    // Sort: checking first, then savings, then others
    const typeOrder = ["checking", "savings", "cash", "investment", "credit_card", "loan"];
    accounts.sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));

    // Re-assign IDs after sorting
    accounts.forEach((account, index) => {
        account.id = index + 1;
    });

    return accounts;
}

// Generate and save
const accounts = generateAccounts();

fs.writeFileSync(
    "public/accounts.json",
    JSON.stringify(accounts, null, 4)
);

console.log(`Generated ${accounts.length} accounts into public/accounts.json`);

// Summary
const assets = accounts
    .filter(a => a.type !== "credit_card" && a.type !== "loan")
    .reduce((acc, a) => acc + a.balance, 0);

const liabilities = accounts
    .filter(a => a.type === "credit_card" || a.type === "loan")
    .reduce((acc, a) => acc + Math.abs(a.balance), 0);

const netWorth = assets - liabilities;

console.log(`\nAccounts Summary:`);
console.log(`Total Assets: €${assets.toFixed(2)}`);
console.log(`Total Liabilities: €${liabilities.toFixed(2)}`);
console.log(`Net Worth: €${netWorth.toFixed(2)}`);
console.log(`\nBy Type:`);

const byType = {};
accounts.forEach(a => {
    if (!byType[a.type]) {
        byType[a.type] = { count: 0, total: 0 };
    }
    byType[a.type].count++;
    byType[a.type].total += a.balance;
});

for (const [type, data] of Object.entries(byType)) {
    console.log(`  ${type}: ${data.count} accounts, €${data.total.toFixed(2)}`);
}
