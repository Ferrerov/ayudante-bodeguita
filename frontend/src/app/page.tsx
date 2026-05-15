'use client';

import { useState } from 'react';
import ImportCard from '@/components/ImportCard';
import ProductsTable from '@/components/ProductsTable';
import CostsPricesTable from '@/components/CostsPricesTable';
import ProductSkuCodesSection from '@/components/ProductSkuCodesSection';
import ReplenishmentTable from '@/components/ReplenishmentTable';
import ImportJobsManager from '@/components/ImportJobsManager';
import SuppliersTable from '@/components/SuppliersTable';
import CustomersTable from '@/components/CustomersTable';
import { importCustomers, importProducts, importPriceList, importReplenishment, importSuppliers } from '@/lib/api';

export default function Home() {
  const [activeSection, setActiveSection] = useState<'imports' | 'catalog' | 'suppliers' | 'customers' | 'costs-prices' | 'product-codes' | 'replenishment'>('imports');
  const [importsView, setImportsView] = useState<'new' | 'manage'>('new');

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
              className={`section-tab ${activeSection === 'suppliers' ? 'active' : ''}`}
              onClick={() => setActiveSection('suppliers')}
            >
              Proveedores
            </button>
            <button
              type="button"
              className={`section-tab ${activeSection === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveSection('customers')}
            >
              Clientes
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
            <button
              type="button"
              className={`section-tab ${activeSection === 'replenishment' ? 'active' : ''}`}
              onClick={() => setActiveSection('replenishment')}
            >
              Reposicion
            </button>
          </nav>

          {activeSection === 'imports' && (
            <div className="section">
              <div className="section-title">Importar datos</div>
              <div className="sections-nav" style={{ marginBottom: '20px' }}>
                <button
                  type="button"
                  className={`section-tab ${importsView === 'new' ? 'active' : ''}`}
                  onClick={() => setImportsView('new')}
                >
                  Nueva importacion
                </button>
                <button
                  type="button"
                  className={`section-tab ${importsView === 'manage' ? 'active' : ''}`}
                  onClick={() => setImportsView('manage')}
                >
                  Gestionar importaciones
                </button>
              </div>

              {importsView === 'new' && (
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

                  <ImportCard
                    title="Reposicion"
                    description="Importar historial de ventas. Acumula cantidades vendidas como pendientes para reponer."
                    onImport={(file) => importReplenishment(file)}
                  />
                  <ImportCard
                    title="Proveedores"
                    description="Importar padron de proveedores desde Contabilium. Reemplaza la lista vigente completa."
                    onImport={(file) => importSuppliers(file)}
                  />
                  <ImportCard
                    title="Clientes"
                    description="Importar padron de clientes desde Contabilium. Reemplaza la lista vigente completa."
                    onImport={(file) => importCustomers(file)}
                  />
                </div>
              )}

              {importsView === 'manage' && <ImportJobsManager />}
            </div>
          )}

          {activeSection === 'catalog' && <ProductsTable />}
          {activeSection === 'suppliers' && <SuppliersTable />}
          {activeSection === 'customers' && <CustomersTable />}
          {activeSection === 'costs-prices' && <CostsPricesTable />}
          {activeSection === 'product-codes' && <ProductSkuCodesSection />}
          {activeSection === 'replenishment' && <ReplenishmentTable />}
        </div>
      </main>
    </>
  );
}
