/*
  Warnings:

  - You are about to drop the column `weddingId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `tasksRemaining` on the `Wedding` table. All the data in the column will be lost.
  - You are about to drop the `TaskTemplate` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryId` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sortOrder` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_weddingId_fkey";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "weddingId",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "dependsOnId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL,
ADD COLUMN     "templateTaskId" TEXT;

-- AlterTable
ALTER TABLE "Wedding" DROP COLUMN "tasksRemaining",
ADD COLUMN     "templateId" TEXT;

-- DropTable
DROP TABLE "TaskTemplate";

-- CreateTable
CREATE TABLE "WeddingTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeddingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "TemplateCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateTask" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultPriority" INTEGER NOT NULL,
    "defaultDueOffsetDays" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT NOT NULL,
    "dependsOnId" TEXT,

    CONSTRAINT "TemplateTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "weddingId" TEXT NOT NULL,

    CONSTRAINT "TaskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeddingTemplate_name_version_key" ON "WeddingTemplate"("name", "version");

-- AddForeignKey
ALTER TABLE "TemplateCategory" ADD CONSTRAINT "TemplateCategory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WeddingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTask" ADD CONSTRAINT "TemplateTask_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TemplateCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTask" ADD CONSTRAINT "TemplateTask_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "TemplateTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WeddingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCategory" ADD CONSTRAINT "TaskCategory_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_templateTaskId_fkey" FOREIGN KEY ("templateTaskId") REFERENCES "TemplateTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
