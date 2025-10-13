/*
  Warnings:

  - The values [MASTER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `endDate` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `campaigns` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `campaigns` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetValue` to the `campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ForWho" AS ENUM ('FOR_ME', 'FOR_A_PARENT', 'FOR_A_FRIEND', 'FOR_A_ANIMAL', 'FOR_MY_STUDENT', 'OTHERS');

-- CreateEnum
CREATE TYPE "CampaignCategory" AS ENUM ('ANIMALS', 'ART', 'EDUCATION', 'HEALTH', 'HOUSING', 'TRANSPORTATION', 'FOOD', 'CLOTHES', 'ORGANIZATION', 'SOCIAL_PROJECTS', 'ACCIDENTS', 'EVENTS', 'TRAVEL', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- AlterTable
ALTER TABLE "campaigns" DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "category" "CampaignCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "currentValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "forWho" "ForWho" NOT NULL DEFAULT 'FOR_ME',
ADD COLUMN     "image" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "targetValue" INTEGER NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "contributions" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_slug_key" ON "campaigns"("slug");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
