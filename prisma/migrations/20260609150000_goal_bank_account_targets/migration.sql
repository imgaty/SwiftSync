-- Add bank-account scoped goal targets.
ALTER TABLE "FinancialGoal" ADD COLUMN "accountId" TEXT;
ALTER TABLE "FinancialGoal" ADD COLUMN "baselineAmount" DECIMAL(20,2) NOT NULL DEFAULT 0;
ALTER TABLE "FinancialGoal" ADD COLUMN "targetMode" TEXT NOT NULL DEFAULT 'total';

CREATE INDEX "FinancialGoal_userId_accountId_idx" ON "FinancialGoal"("userId", "accountId");

ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;