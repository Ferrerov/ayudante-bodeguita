CREATE TABLE "replenishment_items" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "replenished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replenishment_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "replenishment_items_sku_key" ON "replenishment_items"("sku");
CREATE INDEX "replenishment_items_status_idx" ON "replenishment_items"("status");
CREATE INDEX "replenishment_items_name_idx" ON "replenishment_items"("name");

ALTER TABLE "replenishment_items"
ADD CONSTRAINT "replenishment_items_sku_fkey"
FOREIGN KEY ("sku") REFERENCES "products"("sku")
ON DELETE CASCADE ON UPDATE CASCADE;
