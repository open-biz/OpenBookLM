-- CreateTable
CREATE TABLE "_SharedNotebooks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SharedNotebooks_AB_unique" ON "_SharedNotebooks"("A", "B");

-- CreateIndex
CREATE INDEX "_SharedNotebooks_B_index" ON "_SharedNotebooks"("B");

-- AddForeignKey
ALTER TABLE "_SharedNotebooks" ADD CONSTRAINT "_SharedNotebooks_A_fkey" FOREIGN KEY ("A") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SharedNotebooks" ADD CONSTRAINT "_SharedNotebooks_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
