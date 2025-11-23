-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'BINANCE_PAY', 'USDT_MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'PRO',
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripe_payment_intent_id" TEXT,
    "stripe_session_id" TEXT,
    "binance_pay_order_id" TEXT,
    "binance_pay_prepay_id" TEXT,
    "usdt_address" TEXT,
    "usdt_network" TEXT,
    "usdt_amount" DECIMAL(20,8),
    "usdt_tx_hash" TEXT,
    "usdt_confirmed_at" TIMESTAMP(3),
    "metadata" JSONB,
    "expires_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_user_id_status_idx" ON "payments"("user_id", "status");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "payments_payment_method_status_idx" ON "payments"("payment_method", "status");

-- CreateIndex
CREATE INDEX "payments_stripe_payment_intent_id_idx" ON "payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payments_binance_pay_order_id_idx" ON "payments"("binance_pay_order_id");

-- CreateIndex
CREATE INDEX "payments_usdt_address_idx" ON "payments"("usdt_address");

-- CreateIndex
CREATE INDEX "payments_usdt_tx_hash_idx" ON "payments"("usdt_tx_hash");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
