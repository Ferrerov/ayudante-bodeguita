'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchUnified,
  fetchFilters,
  UnifiedProduct,
  FilterOptions,
} from '@/lib/api';

function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  });
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

export default function ProductsTable() {
  const [products, setProducts] = useState<UnifiedProduct[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);

  // Query state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load filters
  useEffect(() => {
    fetchFilters()
      .then(setFilters)
      .catch(() => {
        /* filters are optional */
      });
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUnified({
        search: debouncedSearch || undefined,
        category: category || undefined,
        subcategory: subcategory || undefined,
        supplier: supplier || undefined,
        type: type || undefined,
        status: status || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
        page,
        limit,
      });
      setProducts(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, subcategory, supplier, type, status, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleFilterChange = (setter: (v: string) => void) => (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setter(e.target.value);
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const columns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'name', label: 'Nombre', sortable: true },
    { key: 'type', label: 'Tipo', sortable: true },
    { key: 'status', label: 'Estado', sortable: true },
    { key: 'category', label: 'Rubro', sortable: true },
    { key: 'subcategory', label: 'Sub Rubro', sortable: true },
    { key: 'internalCost', label: 'Costo', sortable: true },
    { key: 'finalPrice', label: 'P. Final', sortable: true },
    { key: 'priceBodeguita', label: 'P. Bodeguita', sortable: false },
    { key: 'priceDistribuidoraMayorista', label: 'P. Distribuidora', sortable: false },
    { key: 'stock', label: 'Stock', sortable: true },
    { key: 'availableStock', label: 'Disponible', sortable: false },
  ];

  return (
    <div className="section">
      <div className="section-title">
        📦 Catálogo Unificado
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{total.toLocaleString('es-AR')}</div>
          <div className="stat-label">Productos totales</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Buscar por SKU, nombre, código barras, rubro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filters && (
          <>
            <select
              className="filter-select"
              value={type}
              onChange={handleFilterChange(setType)}
            >
              <option value="">Todos los tipos</option>
              {filters.types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={status}
              onChange={handleFilterChange(setStatus)}
            >
              <option value="">Todos los estados</option>
              {filters.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={category}
              onChange={handleFilterChange(setCategory)}
            >
              <option value="">Todos los rubros</option>
              {filters.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={subcategory}
              onChange={handleFilterChange(setSubcategory)}
            >
              <option value="">Todos los sub rubros</option>
              {filters.subcategories.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={supplier}
              onChange={handleFilterChange(setSupplier)}
            >
              <option value="">Todos los proveedores</option>
              <option value={filters.withoutSupplierFilterValue}>Sin proveedor asignado</option>
              {filters.suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        {loading && products.length === 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div className="skeleton" style={{ width: `${60 + Math.random() * 60}px` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">No hay productos cargados</div>
            <div className="empty-state-hint">
              Importá un archivo de productos para comenzar.
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={sortBy === col.key ? 'sorted' : ''}
                    onClick={() => col.sortable && handleSort(col.key)}
                    style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                  >
                    {col.label}
                    {col.sortable && <SortIcon field={col.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="cell-sku">{product.sku}</td>
                  <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {product.name}
                  </td>
                  <td>{product.type}</td>
                  <td>
                    <span className="cell-status">
                      <span
                        className={`status-dot ${product.status.toLowerCase() === 'activo' ? 'active' : 'inactive'}`}
                      />
                      {product.status}
                    </span>
                  </td>
                  <td>{product.category || '—'}</td>
                  <td>{product.subcategory || '—'}</td>
                  <td className="cell-price">{formatPrice(product.internalCost)}</td>
                  <td className="cell-price">{formatPrice(product.finalPrice)}</td>
                  <td className={`cell-price ${product.priceBodeguita === 0 ? 'zero' : ''}`}>
                    {formatPrice(product.priceBodeguita)}
                  </td>
                  <td className={`cell-price ${product.priceDistribuidoraMayorista === 0 ? 'zero' : ''}`}>
                    {formatPrice(product.priceDistribuidoraMayorista)}
                  </td>
                  <td className="cell-stock">{formatNumber(product.stock)}</td>
                  <td className="cell-stock">{formatNumber(product.availableStock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total.toLocaleString('es-AR')}
          </div>
          <div className="pagination-buttons">
            <button
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              ⟨⟨
            </button>
            <button
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ⟨ Anterior
            </button>
            <span style={{ padding: '6px 12px', color: 'var(--color-text-secondary)' }}>
              Página {page} de {totalPages}
            </span>
            <button
              className="pagination-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente ⟩
            </button>
            <button
              className="pagination-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              ⟩⟩
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
