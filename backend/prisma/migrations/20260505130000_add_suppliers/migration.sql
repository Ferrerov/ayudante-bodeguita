CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "personeria" TEXT,
    "razon_social" TEXT NOT NULL,
    "nombre_fantasia" TEXT,
    "code" TEXT,
    "tipo_documento" TEXT,
    "documento" TEXT,
    "categoria_impositiva" TEXT,
    "telefono" TEXT,
    "celular" TEXT,
    "email" TEXT,
    "web" TEXT,
    "observaciones" TEXT,
    "provincia" TEXT,
    "ciudad" TEXT,
    "domicilio" TEXT,
    "piso_depto" TEXT,
    "codigo_postal" TEXT,
    "emails_envio_fc" TEXT,
    "tags" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "suppliers_razon_social_idx" ON "suppliers"("razon_social");
CREATE INDEX "suppliers_documento_idx" ON "suppliers"("documento");
CREATE INDEX "suppliers_provincia_idx" ON "suppliers"("provincia");