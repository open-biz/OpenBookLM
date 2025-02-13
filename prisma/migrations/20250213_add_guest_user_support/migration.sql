-- Make email and clerkId nullable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "clerkId" DROP NOT NULL;

-- Add sessionId and isGuest columns
ALTER TABLE "User" ADD COLUMN "sessionId" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;
