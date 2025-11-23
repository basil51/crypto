-- CreateTable
CREATE TABLE "beta_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "invited_by_id" TEXT NOT NULL,
    "invited_user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beta_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beta_invitations_code_key" ON "beta_invitations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "beta_invitations_invited_user_id_key" ON "beta_invitations"("invited_user_id");

-- CreateIndex
CREATE INDEX "beta_invitations_email_idx" ON "beta_invitations"("email");

-- CreateIndex
CREATE INDEX "beta_invitations_code_idx" ON "beta_invitations"("code");

-- CreateIndex
CREATE INDEX "beta_invitations_status_idx" ON "beta_invitations"("status");

-- CreateIndex
CREATE INDEX "feedback_user_id_created_at_idx" ON "feedback"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "feedback_status_idx" ON "feedback"("status");

-- CreateIndex
CREATE INDEX "feedback_type_idx" ON "feedback"("type");

-- AddForeignKey
ALTER TABLE "beta_invitations" ADD CONSTRAINT "beta_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beta_invitations" ADD CONSTRAINT "beta_invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
