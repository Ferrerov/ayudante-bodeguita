'use client';

import { useState } from 'react';
import ImportCard from '@/components/ImportCard';
import ProductsTable from '@/components/ProductsTable';
import CostsPricesTable from '@/components/CostsPricesTable';
import ProductSkuCodesSection from '@/components/ProductSkuCodesSection';
import { importProducts, importPriceList } from '@/lib/api';

export default function Home() {
  const [activeSection, setActiveSection] = useState<'imports' | 'catalog' | 'costs-prices' | 'product-codes'>('imports');

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <h1 className="header-title">Ayudante Bodeguita</h1>
            <span className="header-subtitle">Gestion de catalogo</span>
          </div>
        </div>
      </header>

      <main>
        <div className="container">
          <nav className="sections-nav" aria-label="Secciones principales">
            <button
              type="button"
              className={`section-tab ${activeSection === 'imports' ? 'active' : ''}`}
              onClick={() => setActiveSection('imports')}
            >
              Importaciones
            </button>
            <button
              type="button"
              className={`section-tab ${activeSection === 'catalog' ? 'active' : ''}`}
              onClick={() => setActiveSection('catalog')}
            >
              Catalogo
            </button>
            <button
              type="button"
              className={`section-tab ${activeSection === 'costs-prices' ? 'active' : ''}`}
              onClick={() => setActiveSection('costs-prices')}
            >
              Costos y precios
            </button>
            <button
              type="button"
              className={`section-tab ${activeSection === 'product-codes' ? 'active' : ''}`}
              onClick={() => setActiveSection('product-codes')}
            >
              Codigos de productos
            </button>
          </nav>

          {activeSection === 'imports' && (
            <div className="section">
              <div className="section-title">Importar datos</div>

              <div className="import-grid">
                <ImportCard
                  title="Productos"
                  description="Importar catalogo de productos desde Contabilium. Reemplaza el catalogo vigente completo."
                  onImport={(file) => importProducts(file)}
                />

                <ImportCard
                  title="Lista Bodeguita"
                  description="Importar lista de precios Bodeguita. Requiere catalogo de productos cargado."
                  onImport={(file) => importPriceList(file, 'bodeguita')}
                />

                <ImportCard
                  title="Lista Distribuidora Mayorista"
                  description="Importar lista de precios Distribuidora Mayorista. Requiere catalogo de productos cargado."
                  onImport={(file) => importPriceList(file, 'distribuidora-mayorista')}
                />
              </div>
            </div>
          )}

          {activeSection === 'catalog' && <ProductsTable />}
          {activeSection === 'costs-prices' && <CostsPricesTable />}
          {activeSection === 'product-codes' && <ProductSkuCodesSection />}
        </div>
      </main>
    </>
  );
}
