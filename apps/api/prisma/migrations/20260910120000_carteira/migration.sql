-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TxOrigin" AS ENUM ('MANUAL', 'RECURRING', 'INSTALLMENT', 'PROJECT');

-- CreateEnum
CREATE TYPE "RecurrenceInterval" AS ENUM ('MONTHLY', 'WEEKLY', 'YEARLY');

-- CreateTable
CREATE TABLE "WalletCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "WalletCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "origin" "TxOrigin" NOT NULL DEFAULT 'MANUAL',
    "projectId" TEXT,
    "costPeriodId" TEXT,
    "recurringRuleId" TEXT,
    "installmentPlanId" TEXT,
    "installmentNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "interval" "RecurrenceInterval" NOT NULL DEFAULT 'MONTHLY',
    "dayOfMonth" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedFor" TIMESTAMP(3),

    CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TxType" NOT NULL DEFAULT 'EXPENSE',
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "installmentsCount" INTEGER NOT NULL,
    "firstDueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletCategory_userId_name_key" ON "WalletCategory"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_costPeriodId_key" ON "WalletTransaction"("costPeriodId");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_date_idx" ON "WalletTransaction"("userId", "date");

-- AddForeignKey
ALTER TABLE "WalletCategory" ADD CONSTRAINT "WalletCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WalletCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_costPeriodId_fkey" FOREIGN KEY ("costPeriodId") REFERENCES "CostPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "InstallmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WalletCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WalletCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

