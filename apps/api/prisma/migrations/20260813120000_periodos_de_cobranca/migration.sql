-- CreateTable
CREATE TABLE "PeriodCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PeriodCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostPeriod" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "categoryId" TEXT,
    "label" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PeriodCategory_userId_name_key" ON "PeriodCategory"("userId", "name");

-- AddForeignKey
ALTER TABLE "PeriodCategory" ADD CONSTRAINT "PeriodCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostPeriod" ADD CONSTRAINT "CostPeriod_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostPeriod" ADD CONSTRAINT "CostPeriod_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PeriodCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

