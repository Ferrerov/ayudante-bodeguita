CREATE TABLE "replenishment_imported_rows" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "replenishment_imported_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "replenishment_imported_rows_fingerprint_key" ON "replenishment_imported_rows"("fingerprint");
CREATE INDEX "replenishment_imported_rows_sku_idx" ON "replenishment_imported_rows"("sku");
CREATE INDEX "replenishment_imported_rows_job_id_idx" ON "replenishment_imported_rows"("job_id");

ALTER TABLE "replenishment_imported_rows"
ADD CONSTRAINT "replenishment_imported_rows_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "import_jobs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
