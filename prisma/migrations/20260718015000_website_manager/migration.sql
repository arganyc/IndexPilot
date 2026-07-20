-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WebsiteProtocol" AS ENUM ('HTTP', 'HTTPS');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('WORDPRESS', 'NEXTJS', 'CUSTOM', 'SHOPIFY', 'OTHER');

-- CreateEnum
CREATE TYPE "WebsitePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "normalizedDomain" TEXT NOT NULL,
    "protocol" "WebsiteProtocol" NOT NULL DEFAULT 'HTTPS',
    "platform" "Platform" NOT NULL DEFAULT 'OTHER',
    "priority" "WebsitePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "WebsiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Website_normalizedDomain_key" ON "Website"("normalizedDomain");
