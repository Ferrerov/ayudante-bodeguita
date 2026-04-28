-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parent_sku" TEXT,
    "name" TEXT NOT NULL,
    "attribute1" TEXT,
    "attribute1_variant" TEXT,
    "attribute2" TEXT,
    "attribute2_variant" TEXT,
    "barcode" TEXT,
    "oem_code" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "currency" TEXT,
    "internal_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "base_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vat" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "final_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profitability" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "stock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reserved_stock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "available_stock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "minimum_stock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "visible_in_sales" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "subcategory" TEXT,
    "supplier" TEXT,
    "notes" TEXT,
    "purchase_account" TEXT,
    "sales_account" TEXT,
    "inventory_account" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_lists" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" SERIAL NOT NULL,
    "price_list_id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "subcategory" TEXT,
    "description" TEXT,
    "base_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vat" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "final_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_code_key" ON "price_lists"("code");

-- CreateIndex
CREATE INDEX "price_list_items_sku_idx" ON "price_list_items"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_items_price_list_id_sku_key" ON "price_list_items"("price_list_id", "sku");

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
