CREATE TABLE "customers" (
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
    "lista_precio" TEXT,
    "limite_descubierto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descuento_fijo" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "vendedor_asignado" TEXT,
    "plazo" TEXT,
    "tags" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customers_razon_social_idx" ON "customers"("razon_social");
CREATE INDEX "customers_documento_idx" ON "customers"("documento");
CREATE INDEX "customers_provincia_idx" ON "customers"("provincia");