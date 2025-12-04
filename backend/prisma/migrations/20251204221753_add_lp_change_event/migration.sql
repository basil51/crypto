-- CreateTable
CREATE TABLE "lp_change_events" (
    "id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "dex" TEXT NOT NULL,
    "pool_address" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "amount0" DECIMAL(78,0) NOT NULL,
    "amount1" DECIMAL(78,0) NOT NULL,
    "amount_usd" DECIMAL(20,2),
    "wallet_address" TEXT,
    "tx_hash" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "lp_change_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lp_change_events_token_id_timestamp_idx" ON "lp_change_events"("token_id", "timestamp");

-- CreateIndex
CREATE INDEX "lp_change_events_dex_timestamp_idx" ON "lp_change_events"("dex", "timestamp");

-- CreateIndex
CREATE INDEX "lp_change_events_change_type_timestamp_idx" ON "lp_change_events"("change_type", "timestamp");

-- CreateIndex
CREATE INDEX "lp_change_events_tx_hash_idx" ON "lp_change_events"("tx_hash");

-- AddForeignKey
ALTER TABLE "lp_change_events" ADD CONSTRAINT "lp_change_events_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
