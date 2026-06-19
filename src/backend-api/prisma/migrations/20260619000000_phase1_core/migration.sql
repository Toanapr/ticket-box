-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('audience', 'organizer', 'scanner', 'system_admin', 'service_account');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "ConcertStatus" AS ENUM ('draft', 'published', 'canceled');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concerts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "artist_name" TEXT NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "ConcertStatus" NOT NULL DEFAULT 'draft',
    "seating_map_object_key" TEXT NOT NULL,
    "published_artist_bio" TEXT NOT NULL,

    CONSTRAINT "concerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" UUID NOT NULL,
    "concert_id" UUID NOT NULL,
    "zone_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "per_user_limit" INTEGER NOT NULL,
    "sale_start_at" TIMESTAMPTZ(6) NOT NULL,
    "sale_end_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_counters" (
    "ticket_type_id" UUID NOT NULL,
    "total_capacity" INTEGER NOT NULL,
    "reserved_count" INTEGER NOT NULL DEFAULT 0,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_counters_pkey" PRIMARY KEY ("ticket_type_id")
);

-- CreateTable
CREATE TABLE "user_ticket_quotas" (
    "user_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "reserved_count" INTEGER NOT NULL DEFAULT 0,
    "paid_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_ticket_quotas_pkey" PRIMARY KEY ("user_id","ticket_type_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "concerts_status_start_at_idx" ON "concerts"("status", "start_at");

-- CreateIndex
CREATE INDEX "concerts_organization_id_idx" ON "concerts"("organization_id");

-- CreateIndex
CREATE INDEX "ticket_types_concert_id_idx" ON "ticket_types"("concert_id");

-- CreateIndex
CREATE INDEX "user_ticket_quotas_ticket_type_id_idx" ON "user_ticket_quotas"("ticket_type_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerts" ADD CONSTRAINT "concerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_concert_id_fkey" FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_counters" ADD CONSTRAINT "inventory_counters_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ticket_quotas" ADD CONSTRAINT "user_ticket_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ticket_quotas" ADD CONSTRAINT "user_ticket_quotas_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
