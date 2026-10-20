-- Remove ocorrências duplicadas da mesma regra na mesma data (corrida de
-- requests paralelos). Mantém a paga; empate → a mais antiga.
DELETE FROM "WalletTransaction" a
USING "WalletTransaction" b
WHERE a."recurringRuleId" IS NOT NULL
  AND a."recurringRuleId" = b."recurringRuleId"
  AND a."date" = b."date"
  AND a."id" <> b."id"
  AND (
    (b."paid" AND NOT a."paid")
    OR (b."paid" = a."paid" AND (b."createdAt", b."id") < (a."createdAt", a."id"))
  );

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_recurringRuleId_date_key" ON "WalletTransaction"("recurringRuleId", "date");
