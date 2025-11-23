-- CreateTable
CREATE TABLE "dashboards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "template_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "widget_type" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "config" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "widgets" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whale_clusters" (
    "id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "cluster_type" TEXT NOT NULL,
    "walletAddresses" JSONB NOT NULL,
    "total_value" DECIMAL(20,8) NOT NULL,
    "avg_transaction_size" DECIMAL(20,8) NOT NULL,
    "first_seen" TIMESTAMP(3) NOT NULL,
    "last_seen" TIMESTAMP(3) NOT NULL,
    "transaction_count" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whale_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whale_relationships" (
    "id" TEXT NOT NULL,
    "wallet1_address" TEXT NOT NULL,
    "wallet2_address" TEXT NOT NULL,
    "relationship_type" TEXT NOT NULL,
    "strength" DECIMAL(5,2) NOT NULL,
    "token_id" TEXT,
    "first_interaction" TIMESTAMP(3) NOT NULL,
    "last_interaction" TIMESTAMP(3) NOT NULL,
    "interaction_count" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whale_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dashboards_user_id_idx" ON "dashboards"("user_id");

-- CreateIndex
CREATE INDEX "dashboards_user_id_is_default_idx" ON "dashboards"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboard_id_idx" ON "dashboard_widgets"("dashboard_id");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboard_id_order_idx" ON "dashboard_widgets"("dashboard_id", "order");

-- CreateIndex
CREATE INDEX "dashboard_templates_category_idx" ON "dashboard_templates"("category");

-- CreateIndex
CREATE INDEX "dashboard_templates_is_public_idx" ON "dashboard_templates"("is_public");

-- CreateIndex
CREATE INDEX "whale_clusters_token_id_cluster_type_idx" ON "whale_clusters"("token_id", "cluster_type");

-- CreateIndex
CREATE INDEX "whale_clusters_first_seen_idx" ON "whale_clusters"("first_seen");

-- CreateIndex
CREATE INDEX "whale_clusters_last_seen_idx" ON "whale_clusters"("last_seen");

-- CreateIndex
CREATE INDEX "whale_relationships_wallet1_address_idx" ON "whale_relationships"("wallet1_address");

-- CreateIndex
CREATE INDEX "whale_relationships_wallet2_address_idx" ON "whale_relationships"("wallet2_address");

-- CreateIndex
CREATE INDEX "whale_relationships_token_id_idx" ON "whale_relationships"("token_id");

-- CreateIndex
CREATE UNIQUE INDEX "whale_relationships_wallet1_address_wallet2_address_relatio_key" ON "whale_relationships"("wallet1_address", "wallet2_address", "relationship_type");

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whale_clusters" ADD CONSTRAINT "whale_clusters_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whale_relationships" ADD CONSTRAINT "whale_relationships_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
