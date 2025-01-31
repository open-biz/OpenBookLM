-- AlterTable
ALTER TABLE "Notebook" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_BookmarkedNotebooks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_BookmarkedNotebooks_AB_unique" ON "_BookmarkedNotebooks"("A", "B");

-- CreateIndex
CREATE INDEX "_BookmarkedNotebooks_B_index" ON "_BookmarkedNotebooks"("B");

-- AddForeignKey
ALTER TABLE "_BookmarkedNotebooks" ADD CONSTRAINT "_BookmarkedNotebooks_A_fkey" FOREIGN KEY ("A") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookmarkedNotebooks" ADD CONSTRAINT "_BookmarkedNotebooks_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
