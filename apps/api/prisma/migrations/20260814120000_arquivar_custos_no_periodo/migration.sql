-- AlterTable
ALTER TABLE "CostItem" ADD COLUMN     "periodId" TEXT;

-- AddForeignKey
ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CostPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

