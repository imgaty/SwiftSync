// generate-transactions.js
// Generates realistic transaction data for the finance app
// TO RUN: node generate-transactions.js

const fs = require("fs");

// Helper: random integer in range
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: random element from array
function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: random float in range with 2 decimals
function randFloat(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Format date for Portuguese (DD-MM-YYYY)
function formatDatePT(date) {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

// Categories and their typical expenses
const expenseCategories = {
    Food: {
        descriptions: [
            "Supermarket", "Restaurant", "Coffee Shop", "Bakery", "Fast Food",
            "Grocery Store", "Food Delivery", "Lunch", "Dinner", "Breakfast",
            "Pingo Doce", "Continente", "Lidl", "Auchan", "Mini Preço"
        ],
        minAmount: 3,
        maxAmount: 150,
    },
    Transport: {
        descriptions: [
            "Fuel", "Metro Ticket", "Bus Pass", "Uber", "Taxi", "Bolt",
            "Train Ticket", "Parking", "Car Wash", "Toll", "CP Train",
            "Carris", "Viva Viagem", "Car Insurance"
        ],
        minAmount: 2,
        maxAmount: 100,
    },
    Bills: {
        descriptions: [
            "Electricity Bill", "Water Bill", "Gas Bill", "Internet Bill",
            "Phone Bill", "Rent", "Condominium", "EDP", "Endesa", "NOS",
            "MEO", "Vodafone"
        ],
        minAmount: 20,
        maxAmount: 800,
    },
    Entertainment: {
        descriptions: [
            "Netflix", "Spotify", "Cinema", "Concert", "Game Purchase",
            "Book", "Magazine", "Streaming Service", "HBO Max", "Disney+",
            "YouTube Premium", "PlayStation Plus", "Xbox Game Pass"
        ],
        minAmount: 5,
        maxAmount: 80,
    },
    Shopping: {
        descriptions: [
            "Clothes", "Electronics", "Home Decor", "Furniture", "Amazon",
            "Zara", "H&M", "IKEA", "Worten", "FNAC", "Online Shopping",
            "Shoes", "Accessories"
        ],
        minAmount: 15,
        maxAmount: 500,
    },
    Health: {
        descriptions: [
            "Pharmacy", "Doctor Visit", "Dentist", "Gym Membership",
            "Medicine", "Health Insurance", "Lab Tests", "Vitamins",
            "Optician", "Therapy"
        ],
        minAmount: 10,
        maxAmount: 200,
    },
    Education: {
        descriptions: [
            "Online Course", "Books", "University Fee", "Workshop",
            "Udemy", "Coursera", "Language Course", "Certification",
            "School Supplies", "Tutoring"
        ],
        minAmount: 10,
        maxAmount: 300,
    },
    Other: {
        descriptions: [
            "ATM Withdrawal", "Gift", "Donation", "Pet Supplies",
            "Home Repair", "Cleaning Supplies", "Personal Care",
            "Miscellaneous", "Bank Fee", "Insurance"
        ],
        minAmount: 5,
        maxAmount: 200,
    },
};

const incomeDescriptions = [
    "Salary", "Freelance Payment", "Investment Dividend", "Refund",
    "Gift Received", "Side Project", "Bonus", "Commission",
    "Rental Income", "Interest", "Tax Refund", "Cashback"
];

const accounts = [
    "Main Checking", "Savings Account", "Credit Card", "Cash", "Investment Account"
];

const statuses = ["cleared", "pending"];

// Generate transactions
function generateTransactions(numTransactions = 500, startDate = new Date("2024-01-01")) {
    const transactions = [];
    let currentDate = new Date(startDate);
    const endDate = new Date();

    let id = 1;

    while (currentDate <= endDate && transactions.length < numTransactions) {
        // Generate 1-5 transactions per day
        const transactionsPerDay = rand(1, 5);

        for (let i = 0; i < transactionsPerDay && transactions.length < numTransactions; i++) {
            const isIncome = Math.random() < 0.15; // 15% chance of income

            let category, description, amount;

            if (isIncome) {
                category = "Income";
                description = randomItem(incomeDescriptions);
                amount = description === "Salary" ? randFloat(1500, 4000) : randFloat(50, 1000);
            } else {
                const categories = Object.keys(expenseCategories);
                category = randomItem(categories);
                const catConfig = expenseCategories[category];
                description = randomItem(catConfig.descriptions);
                amount = randFloat(catConfig.minAmount, catConfig.maxAmount);
            }

            // Determine status - recent transactions more likely to be pending
            const daysDiff = Math.floor((endDate - currentDate) / (1000 * 60 * 60 * 24));
            const status = daysDiff < 3 && Math.random() < 0.3 ? "pending" : "cleared";

            transactions.push({
                id: id++,
                date: formatDatePT(currentDate),
                description,
                category,
                type: isIncome ? "income" : "expense",
                amount,
                account: randomItem(accounts),
                status,
                notes: Math.random() < 0.2 ? `Note for ${description}` : "",
            });
        }

        // Advance 1 day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return transactions;
}

// Generate and save
const transactions = generateTransactions(500);

fs.writeFileSync(
    "public/transactions.json",
    JSON.stringify(transactions, null, 4)
);

console.log(`Generated ${transactions.length} transactions into public/transactions.json`);

// Calculate summary
const income = transactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
const expenses = transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
console.log(`Total Income: €${income.toFixed(2)}`);
console.log(`Total Expenses: €${expenses.toFixed(2)}`);
console.log(`Balance: €${(income - expenses).toFixed(2)}`);
