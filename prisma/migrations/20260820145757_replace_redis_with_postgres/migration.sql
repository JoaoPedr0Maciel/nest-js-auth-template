-- AlterTable
ALTER TABLE "users" ADD COLUMN     "refreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "refreshTokenId" TEXT,
ADD COLUMN     "twoFactorPendingSecret" TEXT,
ADD COLUMN     "twoFactorPendingSecretExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "two_factor_login_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_login_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "two_factor_login_challenges_userId_idx" ON "two_factor_login_challenges"("userId");

-- AddForeignKey
ALTER TABLE "two_factor_login_challenges" ADD CONSTRAINT "two_factor_login_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
