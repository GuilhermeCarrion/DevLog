-- CreateTable
CREATE TABLE "SavingsBox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#a3e635',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavingsBox_userId_idx" ON "SavingsBox"("userId");

-- CreateIndex
CREATE INDEX "SavingsEntry_userId_boxId_idx" ON "SavingsEntry"("userId", "boxId");

-- AddForeignKey
ALTER TABLE "SavingsBox" ADD CONSTRAINT "SavingsBox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsEntry" ADD CONSTRAINT "SavingsEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsEntry" ADD CONSTRAINT "SavingsEntry_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "SavingsBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

