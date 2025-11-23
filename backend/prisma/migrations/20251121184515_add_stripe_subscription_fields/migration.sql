-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "subscription_ends_at" TIMESTAMP(3),
ADD COLUMN     "subscription_status" TEXT;
