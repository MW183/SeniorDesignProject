/*
  Warnings:

  - You are about to drop the column `createdById` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Wedding` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Wedding` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Client" DROP CONSTRAINT "Client_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Task" DROP CONSTRAINT "Task_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Task" DROP CONSTRAINT "Task_weddingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Vendor" DROP CONSTRAINT "Vendor_addressId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Wedding" DROP CONSTRAINT "Wedding_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Wedding" DROP CONSTRAINT "Wedding_locationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Wedding" DROP CONSTRAINT "Wedding_spouse1Id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Wedding" DROP CONSTRAINT "Wedding_spouse2Id_fkey";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "createdById",
DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "createdById",
DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdById",
DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "deletedAt",
ALTER COLUMN "addressId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Wedding" DROP COLUMN "createdById",
DROP COLUMN "deletedAt",
ALTER COLUMN "locationId" DROP NOT NULL,
ALTER COLUMN "spouse1Id" DROP NOT NULL,
ALTER COLUMN "spouse2Id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_spouse1Id_fkey" FOREIGN KEY ("spouse1Id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_spouse2Id_fkey" FOREIGN KEY ("spouse2Id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
