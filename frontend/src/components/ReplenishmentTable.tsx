'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchReplenishment,
  fetchReplenishmentFilters,
  markReplenished,
  ReplenishmentFilters,
  ReplenishmentItem,
} from '@/lib/api';

function formatNumber(value: number): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

export default function ReplenishmentTable() {
  const [items, setItems] = useState<ReplenishmentItem[]>([]);
  const [filters, setFilters] = useState<ReplenishmentFilters | null>(null);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadFilters = useCallback(() => {
    fetchReplenishmentFilters()
      .then(setFilters)
      .catch(() => setFilters(null));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchReplenishment({
        search: debouncedSearch || undefined,
        category: category || undefined,
        subcategory: subcategory || undefined,
        sortBy,
        sortOrder,
        page,
        limit,
      });
      setItems(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, subcategory, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleReplenished = async (id: number) => {
    setMarkingId(id);
    try {
      await markReplenished(id);
      await loadData();
      loadFilters();
    } finally {
      setMarkingId(null);
    }
  };

  const handleFilterChange = (setter: (value: string) => void) => (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setter(event.target.value);
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const columns = [
    { key: 'sku', label: 'Codigo', sortable: true },
    { key: 'name', label: 'Nombre', sortable: true },
    { key: 'category', label: 'Rubro', sortable: true },
    { key: 'subcategory', label: 'Sub Rubro', sortable: true },
    { key: 'quantity', label: 'Cantidad Total a Reponer', sortable: true },
    { key: 'action', label: 'Accion', sortable: false },
  ];

  return (
    <div className="section">
      <div className="section-title">Reposicion</div>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{total.toLocaleString('es-AR')}</div>
          <div className="stat-label">Productos pendientes</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Filtrar por nombre o codigo..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {filters && (
          <>
            <select
              className="filter-select"
              value={category}
              onChange={handleFilterChange(setCategory)}
            >
              <option value="">Todos los rubros</option>
              {filters.categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={subcategory}
              onChange={handleFilterChange(setSubcategory)}
            >
              <option value="">Todos los sub rubros</option>
              {filters.subcategories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="table-container">
        {loading && items.length === 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      <div className="skeleton" style={{ width: '80px' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">No hay productos pendientes de reposicion</div>
            <div className="empty-state-hint">
              Importa un historial de ventas para generar la lista de tareas.
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={sortBy === column.key ? 'sorted' : ''}
                    onClick={() => column.sortable && handleSort(column.key)}
                    style={{ cursor: column.sortable ? 'pointer' : 'default' }}
                  >
                    {column.label}
                    {column.sortable && <SortIcon field={column.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="cell-sku">{item.sku}</td>
                  <td style={{ maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </td>
                  <td>{item.category || '-'}</td>
                  <td>{item.subcategory || '-'}</td>
                  <td className="cell-stock">{formatNumber(item.quantity)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-success btn-compact"
                      disabled={markingId === item.id}
                      onClick={() => handleReplenished(item.id)}
                    >
                      {markingId === item.id ? 'Marcando...' : 'REPUESTO'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total.toLocaleString('es-AR')}
          </div>
          <div className="pagination-buttons">
            <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(1)}>
              Inicio
            </button>
            <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Anterior
            </button>
            <span style={{ padding: '6px 12px', color: 'var(--color-text-secondary)' }}>
              Pagina {page} de {totalPages}
            </span>
            <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
              Siguiente
            </button>
            <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              Fin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
