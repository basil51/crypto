-- CreateEnum
CREATE TYPE "WhaleEventType" AS ENUM ('LARGE_BUY', 'LARGE_SELL', 'EXCHANGE_DEPOSIT', 'EXCHANGE_WITHDRAWAL', 'WHALE_CLUSTER', 'SMART_MONEY_MOVE');

-- CreateTable
CREATE TABLE "sell_offers" (
    "id" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "quantity" DECIMAL(20,8) NOT NULL,
    "total_value" DECIMAL(20,8) NOT NULL,
    "wall_type" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "sell_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whale_events" (
    "id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "wallet_id" TEXT,
    "event_type" "WhaleEventType" NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL,
    "value_usd" DECIMAL(20,2),
    "exchange" TEXT,
    "direction" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "whale_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_flows" (
    "id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "flow_type" TEXT NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL,
    "value_usd" DECIMAL(20,2),
    "wallet_address" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "exchange_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dex_swap_events" (
    "id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "dex" TEXT NOT NULL,
    "pool_address" TEXT,
    "swap_type" TEXT NOT NULL,
    "amount_in" DECIMAL(78,0) NOT NULL,
    "amount_out" DECIMAL(78,0) NOT NULL,
    "price_impact" DECIMAL(10,4),
    "wallet_address" TEXT,
    "tx_hash" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "dex_swap_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_metrics" (
    "id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "price_usd" DECIMAL(20,8),
    "market_cap" DECIMAL(20,2),
    "volume_24h" DECIMAL(20,2),
    "holders_count" INTEGER,
    "liquidity" DECIMAL(20,2),
    "whale_score" DECIMAL(5,2),
    "smart_money_score" DECIMAL(5,2),
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "token_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sell_offers_exchange_symbol_detected_at_idx" ON "sell_offers"("exchange", "symbol", "detected_at");

-- CreateIndex
CREATE INDEX "sell_offers_symbol_detected_at_idx" ON "sell_offers"("symbol", "detected_at");

-- CreateIndex
CREATE INDEX "whale_events_token_id_timestamp_idx" ON "whale_events"("token_id", "timestamp");

-- CreateIndex
CREATE INDEX "whale_events_wallet_id_timestamp_idx" ON "whale_events"("wallet_id", "timestamp");

-- CreateIndex
CREATE INDEX "whale_events_event_type_timestamp_idx" ON "whale_events"("event_type", "timestamp");

-- CreateIndex
CREATE INDEX "exchange_flows_token_id_timestamp_idx" ON "exchange_flows"("token_id", "timestamp");

-- CreateIndex
CREATE INDEX "exchange_flows_exchange_timestamp_idx" ON "exchange_flows"("exchange", "timestamp");

-- CreateIndex
CREATE INDEX "exchange_flows_flow_type_timestamp_idx" ON "exchange_flows"("flow_type", "timestamp");

-- CreateIndex
CREATE INDEX "dex_swap_events_token_id_timestamp_idx" ON "dex_swap_events"("token_id", "timestamp");

-- CreateIndex
CREATE INDEX "dex_swap_events_dex_timestamp_idx" ON "dex_swap_events"("dex", "timestamp");

-- CreateIndex
CREATE INDEX "dex_swap_events_tx_hash_idx" ON "dex_swap_events"("tx_hash");

-- CreateIndex
CREATE INDEX "token_metrics_token_id_recorded_at_idx" ON "token_metrics"("token_id", "recorded_at");

-- CreateIndex
CREATE INDEX "token_metrics_recorded_at_idx" ON "token_metrics"("recorded_at");

-- AddForeignKey
ALTER TABLE "whale_events" ADD CONSTRAINT "whale_events_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whale_events" ADD CONSTRAINT "whale_events_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_flows" ADD CONSTRAINT "exchange_flows_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dex_swap_events" ADD CONSTRAINT "dex_swap_events_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_metrics" ADD CONSTRAINT "token_metrics_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
