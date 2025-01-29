/*
  Warnings:

  - The primary key for the `_NoteToTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_NotebookToTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_NoteToTag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_NotebookToTag` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Notebook" ADD COLUMN     "content" TEXT;

-- AlterTable
ALTER TABLE "_NoteToTag" DROP CONSTRAINT "_NoteToTag_AB_pkey";

-- AlterTable
ALTER TABLE "_NotebookToTag" DROP CONSTRAINT "_NotebookToTag_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_NoteToTag_AB_unique" ON "_NoteToTag"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_NotebookToTag_AB_unique" ON "_NotebookToTag"("A", "B");
