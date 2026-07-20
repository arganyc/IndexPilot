-- CreateTable
CREATE TABLE "GoogleAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "googleUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchConsoleProperty" (
    "id" TEXT NOT NULL,
    "googleAccountId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "permissionLevel" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchConsoleProperty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAccount_organizationId_googleUserId_key" ON "GoogleAccount"("organizationId", "googleUserId");

-- CreateIndex
CREATE INDEX "GoogleAccount_organizationId_idx" ON "GoogleAccount"("organizationId");

-- CreateIndex
CREATE INDEX "GoogleAccount_email_idx" ON "GoogleAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SearchConsoleProperty_googleAccountId_siteUrl_key" ON "SearchConsoleProperty"("googleAccountId", "siteUrl");

-- CreateIndex
CREATE INDEX "SearchConsoleProperty_organizationId_idx" ON "SearchConsoleProperty"("organizationId");

-- CreateIndex
CREATE INDEX "SearchConsoleProperty_organizationId_siteUrl_idx" ON "SearchConsoleProperty"("organizationId", "siteUrl");

-- CreateIndex
CREATE INDEX "SearchConsoleProperty_googleAccountId_idx" ON "SearchConsoleProperty"("googleAccountId");

-- AddForeignKey
ALTER TABLE "SearchConsoleProperty" ADD CONSTRAINT "SearchConsoleProperty_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "GoogleAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
