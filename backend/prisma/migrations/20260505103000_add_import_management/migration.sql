CREATE TABLE "import_jobs" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "checksum" TEXT,
    "rows_read" INTEGER NOT NULL DEFAULT 0,
    "rows_imported" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB,
    "errors" JSONB,
    "metadata" JSONB,
    "undo_of_job_id" INTEGER,
    "undone_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_snapshots" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "domain_type" TEXT NOT NULL,
    "scope_key" TEXT,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "replenishment_movements" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "delta" DECIMAL(12,2) NOT NULL,
    "before_qty" DECIMAL(12,2) NOT NULL,
    "after_qty" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "replenishment_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_jobs_type_created_at_idx" ON "import_jobs"("type", "created_at");
CREATE INDEX "import_jobs_status_created_at_idx" ON "import_jobs"("status", "created_at");
CREATE INDEX "import_snapshots_job_id_idx" ON "import_snapshots"("job_id");
CREATE INDEX "import_snapshots_domain_type_scope_key_idx" ON "import_snapshots"("domain_type", "scope_key");
CREATE INDEX "replenishment_movements_job_id_sku_idx" ON "replenishment_movements"("job_id", "sku");

ALTER TABLE "import_snapshots"
ADD CONSTRAINT "import_snapshots_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "import_jobs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "replenishment_movements"
ADD CONSTRAINT "replenishment_movements_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "import_jobs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
