-- Performance indexes. Uses CREATE INDEX IF NOT EXISTS (idempotent; won't fail on re-runs).
-- Use CREATE INDEX CONCURRENTLY manually in production to avoid locking writes on large tables.

-- Transaction: hot path is (userId, date DESC) and (userId, accountId).
CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx"        ON "Transaction"        ("userId", "date" DESC);
CREATE INDEX IF NOT EXISTS "Transaction_userId_accountId_idx"   ON "Transaction"        ("userId", "accountId");
CREATE INDEX IF NOT EXISTS "Transaction_accountId_idx"          ON "Transaction"        ("accountId");
CREATE INDEX IF NOT EXISTS "Transaction_tags_idx"               ON "Transaction" USING GIN ("tags");

-- BankAccount: scoped queries by userId, connectionId lookups.
CREATE INDEX IF NOT EXISTS "BankAccount_userId_idx"             ON "BankAccount"        ("userId");
CREATE INDEX IF NOT EXISTS "BankAccount_connectionId_idx"       ON "BankAccount"        ("connectionId");

-- Bill / Budget / FinancialGoal: list queries scoped by userId.
CREATE INDEX IF NOT EXISTS "Bill_userId_idx"                    ON "Bill"               ("userId");
CREATE INDEX IF NOT EXISTS "Bill_accountId_idx"                 ON "Bill"               ("accountId");
CREATE INDEX IF NOT EXISTS "Budget_userId_idx"                  ON "Budget"             ("userId");
CREATE INDEX IF NOT EXISTS "FinancialGoal_userId_idx"           ON "FinancialGoal"      ("userId");

-- Notification: filter by userId + read state.
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx"       ON "Notification"       ("userId", "read");

-- PACERule: priority-ordered within user.
CREATE INDEX IF NOT EXISTS "PACERule_userId_priority_idx"       ON "PACERule"           ("userId", "priority" DESC);

-- SaltEdgeConnection: ownership checks.
CREATE INDEX IF NOT EXISTS "SaltEdgeConnection_userId_idx"      ON "SaltEdgeConnection" ("userId");
CREATE INDEX IF NOT EXISTS "SaltEdgeConnection_customerId_idx"  ON "SaltEdgeConnection" ("customerId");
