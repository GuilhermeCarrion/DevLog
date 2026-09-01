-- AlterTable
ALTER TABLE "WorkSession" ADD COLUMN     "accumulatedSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "plannedDoneAt" TIMESTAMP(3),
ADD COLUMN     "runningSince" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: preserva a duração das sessões já concluídas (net = bruto antigo)
UPDATE "WorkSession"
SET "accumulatedSeconds" = FLOOR(EXTRACT(EPOCH FROM ("endedAt" - "startedAt")))::int
WHERE "startedAt" IS NOT NULL AND "endedAt" IS NOT NULL;

-- Backfill: sessão ativa em andamento continua rodando (segmento desde startedAt)
UPDATE "WorkSession"
SET "runningSince" = "startedAt"
WHERE "startedAt" IS NOT NULL AND "endedAt" IS NULL;
