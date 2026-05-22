// generate-bills.js
// Generates recurring bills and payment data
// TO RUN: node generate-bills.js

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

// Format date as YYYY-MM-DD
function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

// Bill templates by category
const billTemplates = {
    Utilities: [
        { name: "EDP Electricity", minAmount: 40, maxAmount: 150 },
        { name: "Water Bill", minAmount: 15, maxAmount: 45 },
        { name: "Gas Bill", minAmount: 20, maxAmount: 80 },
    ],
    Rent: [
        { name: "Monthly Rent", minAmount: 500, maxAmount: 1500 },
        { name: "Condominium Fee", minAmount: 30, maxAmount: 100 },
    ],
    Insurance: [
        { name: "Health Insurance", minAmount: 50, maxAmount: 200 },
        { name: "Car Insurance", minAmount: 30, maxAmount: 100 },
        { name: "Home Insurance", minAmount: 20, maxAmount: 60 },
        { name: "Life Insurance", minAmount: 40, maxAmount: 150 },
    ],
    Subscriptions: [
        { name: "Netflix", minAmount: 8, maxAmount: 18 },
        { name: "Spotify", minAmount: 7, maxAmount: 15 },
        { name: "HBO Max", minAmount: 6, maxAmount: 14 },
        { name: "Disney+", minAmount: 6, maxAmount: 12 },
        { name: "YouTube Premium", minAmount: 12, maxAmount: 18 },
        { name: "Amazon Prime", minAmount: 4, maxAmount: 8 },
        { name: "Apple Music", minAmount: 10, maxAmount: 15 },
        { name: "PlayStation Plus", minAmount: 8, maxAmount: 14 },
        { name: "Gym Membership", minAmount: 25, maxAmount: 60 },
    ],
    Phone: [
        { name: "NOS Mobile", minAmount: 15, maxAmount: 50 },
        { name: "MEO Mobile", minAmount: 15, maxAmount: 50 },
        { name: "Vodafone Mobile", minAmount: 15, maxAmount: 50 },
    ],
    Internet: [
        { name: "NOS Internet", minAmount: 30, maxAmount: 60 },
        { name: "MEO Fiber", minAmount: 35, maxAmount: 65 },
        { name: "Vodafone Net", minAmount: 30, maxAmount: 55 },
    ],
    Loans: [
        { name: "Car Loan", minAmount: 150, maxAmount: 400 },
        { name: "Personal Loan", minAmount: 100, maxAmount: 300 },
        { name: "Student Loan", minAmount: 50, maxAmount: 200 },
        { name: "Credit Card Payment", minAmount: 50, maxAmount: 500 },
    ],
    Other: [
        { name: "Cloud Storage", minAmount: 2, maxAmount: 10 },
        { name: "Domain Renewal", minAmount: 10, maxAmount: 30 },
        { name: "VPN Service", minAmount: 5, maxAmount: 15 },
        { name: "Charity Donation", minAmount: 10, maxAmount: 50 },
    ],
};

const frequencies = ["weekly", "monthly", "quarterly", "yearly", "one_time"];
const frequencyWeights = [0.05, 0.7, 0.1, 0.1, 0.05]; // Monthly is most common

const accounts = ["Main Checking", "Credit Card", "Savings Account"];

// Select frequency based on weights
function selectFrequency() {
    const random = Math.random();
    let cumulative = 0;
    for (let i = 0; i < frequencies.length; i++) {
        cumulative += frequencyWeights[i];
        if (random < cumulative) {
            return frequencies[i];
        }
    }
    return "monthly";
}

// Calculate next due date based on frequency
function calculateDueDate(frequency) {
    const today = new Date();
    const dueDate = new Date(today);

    switch (frequency) {
        case "weekly":
            dueDate.setDate(today.getDate() + rand(1, 7));
            break;
        case "monthly":
            dueDate.setDate(rand(1, 28)); // Random day this or next month
            if (dueDate <= today) {
                dueDate.setMonth(dueDate.getMonth() + 1);
            }
            break;
        case "quarterly":
            dueDate.setDate(rand(1, 28));
            dueDate.setMonth(today.getMonth() + rand(1, 3));
            break;
        case "yearly":
            dueDate.setDate(rand(1, 28));
            dueDate.setMonth(rand(0, 11));
            if (dueDate <= today) {
                dueDate.setFullYear(dueDate.getFullYear() + 1);
            }
            break;
        case "one_time":
            dueDate.setDate(today.getDate() + rand(5, 30));
            break;
    }

    return formatDate(dueDate);
}

// Determine status based on due date
function getStatus(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    // 30% chance of being already paid if not overdue
    if (diffDays > 0 && Math.random() < 0.3) {
        return "paid";
    }

    if (diffDays < 0) return "overdue";
    if (diffDays <= 3) return "pending";
    if (diffDays <= 14) return "upcoming";
    return "upcoming";
}

// Generate last paid date
function generateLastPaid(status, dueDate, frequency) {
    if (status === "paid") {
        const due = new Date(dueDate);
        due.setDate(due.getDate() - rand(1, 5));
        return formatDate(due);
    }

    // Calculate previous period
    const due = new Date(dueDate);
    switch (frequency) {
        case "weekly":
            due.setDate(due.getDate() - 7);
            break;
        case "monthly":
            due.setMonth(due.getMonth() - 1);
            break;
        case "quarterly":
            due.setMonth(due.getMonth() - 3);
            break;
        case "yearly":
            due.setFullYear(due.getFullYear() - 1);
            break;
        default:
            return undefined;
    }

    return formatDate(due);
}

// Generate bills
function generateBills() {
    const bills = [];
    let id = 1;

    // Generate bills from templates
    for (const [category, templates] of Object.entries(billTemplates)) {
        // Select 1-3 bills from each category
        const numBills = category === "Subscriptions" ? rand(3, 6) : rand(1, 2);
        const selectedTemplates = [];

        for (let i = 0; i < numBills && i < templates.length; i++) {
            let template;
            do {
                template = randomItem(templates);
            } while (selectedTemplates.includes(template.name));
            selectedTemplates.push(template.name);

            const frequency = category === "Subscriptions" ? "monthly" : selectFrequency();
            const dueDate = calculateDueDate(frequency);
            const status = getStatus(dueDate);

            bills.push({
                id: id++,
                name: template.name,
                category,
                amount: randFloat(template.minAmount, template.maxAmount),
                dueDate,
                frequency,
                status,
                autopay: Math.random() < 0.4, // 40% have autopay
                account: randomItem(accounts),
                lastPaid: generateLastPaid(status, dueDate, frequency),
                notes: Math.random() < 0.15 ? `Note for ${template.name}` : "",
            });
        }
    }

    // Sort by due date
    bills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Re-assign IDs after sorting
    bills.forEach((bill, index) => {
        bill.id = index + 1;
    });

    return bills;
}

// Generate and save
const bills = generateBills();

fs.writeFileSync(
    "public/bills.json",
    JSON.stringify(bills, null, 4)
);

console.log(`Generated ${bills.length} bills into public/bills.json`);

// Summary
const totalMonthly = bills
    .filter(b => b.frequency === "monthly")
    .reduce((acc, b) => acc + b.amount, 0);
const overdueCount = bills.filter(b => b.status === "overdue").length;
const pendingCount = bills.filter(b => b.status === "pending").length;
const upcomingCount = bills.filter(b => b.status === "upcoming").length;

console.log(`\nBills Summary:`);
console.log(`Monthly Bills Total: €${totalMonthly.toFixed(2)}`);
console.log(`Overdue: ${overdueCount}`);
console.log(`Pending: ${pendingCount}`);
console.log(`Upcoming: ${upcomingCount}`);
console.log(`With Autopay: ${bills.filter(b => b.autopay).length}`);
