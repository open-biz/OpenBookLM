-- AlterTable
ALTER TABLE "Notebook" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'groq';

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
