// generate-budgets.js
// Generates budget data for each category across multiple months
// TO RUN: node generate-budgets.js

const fs = require("fs");

// Helper: random integer in range
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: random float in range with 2 decimals
function randFloat(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Budget categories with typical monthly budgets
const budgetCategories = {
    Food: {
        minBudget: 200,
        maxBudget: 500,
        color: "bg-orange-500",
    },
    Transport: {
        minBudget: 50,
        maxBudget: 200,
        color: "bg-blue-500",
    },
    Bills: {
        minBudget: 300,
        maxBudget: 800,
        color: "bg-red-500",
    },
    Entertainment: {
        minBudget: 50,
        maxBudget: 150,
        color: "bg-purple-500",
    },
    Shopping: {
        minBudget: 100,
        maxBudget: 400,
        color: "bg-pink-500",
    },
    Health: {
        minBudget: 50,
        maxBudget: 200,
        color: "bg-cyan-500",
    },
    Education: {
        minBudget: 30,
        maxBudget: 150,
        color: "bg-indigo-500",
    },
    Savings: {
        minBudget: 200,
        maxBudget: 1000,
        color: "bg-green-500",
    },
    Other: {
        minBudget: 50,
        maxBudget: 200,
        color: "bg-gray-500",
    },
};

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Determine status based on percentage used
function getStatus(percentUsed) {
    if (percentUsed > 100) return "over_budget";
    if (percentUsed > 80) return "warning";
    return "on_track";
}

// Generate budgets
function generateBudgets(numMonths = 12, startYear = 2024) {
    const budgets = [];
    let id = 1;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Generate for the last numMonths
    for (let monthOffset = numMonths - 1; monthOffset >= 0; monthOffset--) {
        let targetMonth = currentMonth - monthOffset;
        let targetYear = currentYear;

        // Handle year rollover
        while (targetMonth < 0) {
            targetMonth += 12;
            targetYear--;
        }

        const isPastMonth = targetYear < currentYear || 
            (targetYear === currentYear && targetMonth < currentMonth);
        const isCurrentMonth = targetYear === currentYear && targetMonth === currentMonth;

        // Generate budget for each category
        for (const [category, config] of Object.entries(budgetCategories)) {
            const budgetAmount = rand(config.minBudget, config.maxBudget);
            
            let spentAmount;
            if (isPastMonth) {
                // Past months: spent varies from 60% to 120% of budget
                const spentPercent = randFloat(0.6, 1.2);
                spentAmount = Math.round(budgetAmount * spentPercent * 100) / 100;
            } else if (isCurrentMonth) {
                // Current month: partial spending based on day of month
                const dayOfMonth = currentDate.getDate();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const progressPercent = dayOfMonth / daysInMonth;
                const variability = randFloat(0.7, 1.3);
                spentAmount = Math.round(budgetAmount * progressPercent * variability * 100) / 100;
            } else {
                // Future months: no spending yet
                spentAmount = 0;
            }

            const remainingAmount = Math.round((budgetAmount - spentAmount) * 100) / 100;
            const percentUsed = Math.round((spentAmount / budgetAmount) * 100 * 100) / 100;

            budgets.push({
                id: id++,
                category,
                budgetAmount,
                spentAmount,
                remainingAmount,
                percentUsed,
                month: months[targetMonth],
                year: targetYear,
                status: getStatus(percentUsed),
                color: config.color,
            });
        }
    }

    return budgets;
}

// Generate and save
const budgets = generateBudgets(12);

fs.writeFileSync(
    "public/budgets.json",
    JSON.stringify(budgets, null, 4)
);

console.log(`Generated ${budgets.length} budget records into public/budgets.json`);

// Summary for current month
const currentMonthBudgets = budgets.filter(b => 
    b.month === months[new Date().getMonth()] && 
    b.year === new Date().getFullYear()
);

const totalBudget = currentMonthBudgets.reduce((acc, b) => acc + b.budgetAmount, 0);
const totalSpent = currentMonthBudgets.reduce((acc, b) => acc + b.spentAmount, 0);
const overBudgetCount = currentMonthBudgets.filter(b => b.status === "over_budget").length;

console.log(`\nCurrent Month Summary:`);
console.log(`Total Budget: €${totalBudget.toFixed(2)}`);
console.log(`Total Spent: €${totalSpent.toFixed(2)}`);
console.log(`Remaining: €${(totalBudget - totalSpent).toFixed(2)}`);
console.log(`Categories Over Budget: ${overBudgetCount}`);
