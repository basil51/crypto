-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('WHALE_INFLOW', 'EXCHANGE_OUTFLOW', 'LP_INCREASE', 'CONCENTRATED_BUYS', 'HOLDING_PATTERNS');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "plan" "PlanType" NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contract_address" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "tracked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_positions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "balance" DECIMAL(78,0) NOT NULL,
    "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL,
    "block_number" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "raw" JSONB,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accumulation_signals" (
    "id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "signal_type" "SignalType" NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "wallets_involved" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accumulation_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "signal_id" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage_log" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "cost_estimate" DECIMAL(10,4),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "tokens_chain_active_idx" ON "tokens"("chain", "active");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_address_key" ON "wallets"("address");

-- CreateIndex
CREATE INDEX "wallets_address_idx" ON "wallets"("address");

-- CreateIndex
CREATE INDEX "wallet_positions_wallet_id_token_id_idx" ON "wallet_positions"("wallet_id", "token_id");

-- CreateIndex
CREATE INDEX "wallet_positions_token_id_idx" ON "wallet_positions"("token_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_positions_wallet_id_token_id_key" ON "wallet_positions"("wallet_id", "token_id");

-- CreateIndex
CREATE INDEX "transactions_token_id_timestamp_idx" ON "transactions"("token_id", "timestamp");

-- CreateIndex
CREATE INDEX "transactions_from_address_idx" ON "transactions"("from_address");

-- CreateIndex
CREATE INDEX "transactions_to_address_idx" ON "transactions"("to_address");

-- CreateIndex
CREATE INDEX "transactions_tx_hash_idx" ON "transactions"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_tx_hash_token_id_key" ON "transactions"("tx_hash", "token_id");

-- CreateIndex
CREATE INDEX "accumulation_signals_signal_type_created_at_idx" ON "accumulation_signals"("signal_type", "created_at");

-- CreateIndex
CREATE INDEX "accumulation_signals_token_id_created_at_idx" ON "accumulation_signals"("token_id", "created_at");

-- CreateIndex
CREATE INDEX "accumulation_signals_score_idx" ON "accumulation_signals"("score");

-- CreateIndex
CREATE INDEX "alerts_user_id_status_idx" ON "alerts"("user_id", "status");

-- CreateIndex
CREATE INDEX "alerts_signal_id_idx" ON "alerts"("signal_id");

-- CreateIndex
CREATE INDEX "api_usage_log_provider_timestamp_idx" ON "api_usage_log"("provider", "timestamp");

-- CreateIndex
CREATE INDEX "api_usage_log_timestamp_idx" ON "api_usage_log"("timestamp");

-- AddForeignKey
ALTER TABLE "wallet_positions" ADD CONSTRAINT "wallet_positions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_positions" ADD CONSTRAINT "wallet_positions_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_from_address_fkey" FOREIGN KEY ("from_address") REFERENCES "wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_address_fkey" FOREIGN KEY ("to_address") REFERENCES "wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accumulation_signals" ADD CONSTRAINT "accumulation_signals_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "accumulation_signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
