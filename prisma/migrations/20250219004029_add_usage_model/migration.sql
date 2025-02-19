-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('AUDIO_GENERATION', 'DOCUMENT_PROCESSING', 'CONTEXT_TOKENS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "clerkId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "_BookmarkedNotebooks" ADD CONSTRAINT "_BookmarkedNotebooks_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_BookmarkedNotebooks_AB_unique";

-- AlterTable
ALTER TABLE "_NoteToTag" ADD CONSTRAINT "_NoteToTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_NoteToTag_AB_unique";

-- AlterTable
ALTER TABLE "_NotebookToTag" ADD CONSTRAINT "_NotebookToTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_NotebookToTag_AB_unique";

-- AlterTable
ALTER TABLE "_SharedNotebooks" ADD CONSTRAINT "_SharedNotebooks_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_SharedNotebooks_AB_unique";

-- CreateTable
CREATE TABLE "CreditHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UsageType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "notebookId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditHistory_userId_idx" ON "CreditHistory"("userId");

-- CreateIndex
CREATE INDEX "Usage_userId_idx" ON "Usage"("userId");

-- CreateIndex
CREATE INDEX "Usage_type_idx" ON "Usage"("type");

-- AddForeignKey
ALTER TABLE "CreditHistory" ADD CONSTRAINT "CreditHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
