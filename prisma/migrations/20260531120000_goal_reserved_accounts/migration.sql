-- CreateTable: FinancialGoalAccount
CREATE TABLE "FinancialGoalAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balance" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'active',
    "transferReference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialGoalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialGoalAccount_goalId_key" ON "FinancialGoalAccount"("goalId");
CREATE UNIQUE INDEX "FinancialGoalAccount_transferReference_key" ON "FinancialGoalAccount"("transferReference");
CREATE INDEX "FinancialGoalAccount_userId_idx" ON "FinancialGoalAccount"("userId");

-- AddForeignKey
ALTER TABLE "FinancialGoalAccount" ADD CONSTRAINT "FinancialGoalAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialGoalAccount" ADD CONSTRAINT "FinancialGoalAccount_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "FinancialGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
