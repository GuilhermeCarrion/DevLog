-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('CUSTO', 'OUTROS', 'DEV', 'DESCONTO');

-- CreateEnum
CREATE TYPE "CostKind" AS ENUM ('FIXED', 'HOURLY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "defaultMargin" DOUBLE PRECISION NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "marginPercent" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "CostItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL DEFAULT 'CUSTO',
    "kind" "CostKind" NOT NULL DEFAULT 'FIXED',
    "amount" DOUBLE PRECISION NOT NULL,
    "hours" DOUBLE PRECISION,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL DEFAULT 'CUSTO',
    "kind" "CostKind" NOT NULL DEFAULT 'FIXED',
    "amount" DOUBLE PRECISION NOT NULL,
    "hours" DOUBLE PRECISION,

    CONSTRAINT "CostTemplate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostTemplate" ADD CONSTRAINT "CostTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

