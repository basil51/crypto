-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('SIGNAL', 'WHALE_BUY', 'WHALE_SELL', 'EXCHANGE_DEPOSIT', 'EXCHANGE_WITHDRAWAL', 'SELL_WALL_CREATED', 'SELL_WALL_REMOVED', 'TOKEN_BREAKOUT');

-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "alert_type" "AlertType" NOT NULL DEFAULT 'SIGNAL',
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "token_id" TEXT,
ALTER COLUMN "signal_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "alerts_user_id_alert_type_idx" ON "alerts"("user_id", "alert_type");

-- CreateIndex
CREATE INDEX "alerts_token_id_alert_type_idx" ON "alerts"("token_id", "alert_type");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
