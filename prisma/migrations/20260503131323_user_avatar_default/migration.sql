-- Store a persisted default avatar image (SVG data URL) for each user.
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
