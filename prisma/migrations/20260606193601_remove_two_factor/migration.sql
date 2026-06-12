DROP TABLE IF EXISTS "TrustedDevice";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "twoFactorEnabled",
  DROP COLUMN IF EXISTS "twoFactorSecret",
  DROP COLUMN IF EXISTS "twoFactorCode",
  DROP COLUMN IF EXISTS "twoFactorCodeExpiry",
  DROP COLUMN IF EXISTS "twoFactorBackupCodes",
  DROP COLUMN IF EXISTS "twoFactorLastTimestep";
