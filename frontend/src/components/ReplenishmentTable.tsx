'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addReplenishmentManual,
  fetchReplenishment,
  fetchReplenishmentFilters,
  fetchUnified,
  markReplenished,
  ReplenishmentFilters,
  ReplenishmentItem,
  UnifiedProduct,
  updateReplenishmentQuantity,
} from '@/lib/api';

type ReplenishmentColumnKey = 'sku' | 'name' | 'category' | 'subcategory' | 'quantity' | 'action';
type HideableReplenishmentColumnKey = Exclude<ReplenishmentColumnKey, 'action'>;

type ReplenishmentColumn = {
  key: ReplenishmentColumnKey;
  label: string;
  sortable: boolean;
};

export default function ReplenishmentTable() {
  const [items, setItems] = useState<ReplenishmentItem[]>([]);
  const [filters, setFilters] = useState<ReplenishmentFilters | null>(null);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);
  const [savingQuantityId, setSavingQuantityId] = useState<number | null>(null);
  const [editingQuantities, setEditingQuantities] = useState<Record<number, string>>({});
  const [manualSku, setManualSku] = useState('');
  const [manualQuantity, setManualQuantity] = useState('1');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualOptions, setManualOptions] = useState<UnifiedProduct[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<HideableReplenishmentColumnKey[]>([
    'sku',
    'name',
    'category',
    'subcategory',
    'quantity',
  ]);

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

  useEffect(() => {
    setEditingQuantities((current) => {
      const next: Record<number, string> = {};
      items.forEach((item) => {
        next[item.id] = current[item.id] ?? String(item.quantity);
      });
      return next;
    });
  }, [items]);

  useEffect(() => {
    const value = manualSku.trim();
    if (value.length < 2) {
      setManualOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await fetchUnified({
          search: value,
          page: 1,
          limit: 12,
          sortBy: 'name',
          sortOrder: 'asc',
        });
        setManualOptions(result.data);
      } catch {
        setManualOptions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [manualSku]);

  const handleSort = (field: ReplenishmentColumnKey) => {
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

  const handleQuantityChange = (id: number, value: string) => {
    setEditingQuantities((current) => ({ ...current, [id]: value }));
  };

  const handleQuantitySave = async (id: number) => {
    const raw = editingQuantities[id];
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    
    const item = items.find((i) => i.id === id);
    if (item && parsed === item.quantity) return;

    setSavingQuantityId(id);
    try {
      await updateReplenishmentQuantity(id, parsed);
      await loadData();
      loadFilters();
    } finally {
      setSavingQuantityId(null);
    }
  };

  const handleManualAdd = async () => {
    const sku = manualSku.trim();
    const quantity = Number(manualQuantity);
    if (!sku || !Number.isFinite(quantity) || quantity <= 0) return;

    setManualError('');
    setManualLoading(true);
    try {
      await addReplenishmentManual({ sku, quantity });
      setManualSku('');
      setManualQuantity('1');
      await loadData();
      loadFilters();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo agregar el producto.';
      setManualError(message);
    } finally {
      setManualLoading(false);
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

  const columns: ReplenishmentColumn[] = [
    { key: 'sku', label: 'Codigo', sortable: true },
    { key: 'name', label: 'Nombre', sortable: true },
    { key: 'category', label: 'Rubro', sortable: true },
    { key: 'subcategory', label: 'Sub Rubro', sortable: true },
    { key: 'quantity', label: 'CANT.', sortable: true },
    { key: 'action', label: '✓', sortable: false },
  ];

  const hideableColumns = columns.filter(
    (column): column is ReplenishmentColumn & { key: HideableReplenishmentColumnKey } =>
      column.key !== 'action',
  );
  const actionColumn = columns.find((column) => column.key === 'action')!;
  const visibleColumns = [
    ...hideableColumns.filter((column) => visibleColumnKeys.includes(column.key)),
    actionColumn,
  ];

  const toggleColumn = (key: HideableReplenishmentColumnKey) => {
    setVisibleColumnKeys((current) => {
      if (current.includes(key)) {
        return current.length === 1 ? current : current.filter((value) => value !== key);
      }

      return hideableColumns
        .map((column) => column.key)
        .filter((value) => value === key || current.includes(value));
    });
  };

  const renderCell = (item: ReplenishmentItem, columnKey: ReplenishmentColumnKey) => {
    switch (columnKey) {
      case 'sku':
        return <td key={columnKey} className="cell-sku">{item.sku}</td>;
      case 'name':
        return (
          <td key={columnKey} style={{ maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.name}
          </td>
        );
      case 'category':
        return <td key={columnKey}>{item.category || '-'}</td>;
      case 'subcategory':
        return <td key={columnKey}>{item.subcategory || '-'}</td>;
      case 'quantity':
        return (
          <td key={columnKey} className="cell-stock cell-quantity-sticky">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
              <input
                className="replenishment-qty-input"
                type="number"
                min="0"
                step="0.01"
                value={editingQuantities[item.id] ?? String(item.quantity)}
                disabled={savingQuantityId === item.id}
                onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                onBlur={() => handleQuantitySave(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur();
                  }
                }}
              />
              {savingQuantityId === item.id && (
                <div className="status-dot active" style={{ backgroundColor: 'var(--color-warning)', boxShadow: 'none' }} title="Guardando..." />
              )}
            </div>
          </td>
        );
      case 'action':
        return (
          <td key={columnKey} className="cell-action-sticky">
            <button
              type="button"
              className="btn btn-success btn-compact btn-icon-compact"
              disabled={markingId === item.id}
              onClick={() => handleReplenished(item.id)}
              aria-label={`Marcar ${item.sku} como repuesto`}
              title="Marcar como repuesto"
            >
              ✓
            </button>
          </td>
        );
    }
  };

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

      <div className="add-product-card">
        <div className="add-product-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Agregar Producto Manualmente
        </div>
        <div className="add-product-form">
          <div className="form-group flex-1" style={{ position: 'relative' }}>
            <label htmlFor="manual-sku">Buscar por SKU o Nombre</label>
            <input
              id="manual-sku"
              className="search-input"
              type="text"
              placeholder="Ej: 12345 o Yerba Mate..."
              autoComplete="off"
              value={manualSku}
              onChange={(event) => {
                setManualSku(event.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />
            {showDropdown && manualOptions.length > 0 && (
              <ul className="custom-dropdown">
                {manualOptions.map((option) => (
                  <li
                    key={option.id}
                    className="custom-dropdown-item"
                    onClick={() => {
                      setManualSku(option.sku);
                      setShowDropdown(false);
                    }}
                  >
                    <span className="dropdown-sku">{option.sku}</span>
                    <span className="dropdown-name">{option.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="manual-qty">Cantidad</label>
            <input
              id="manual-qty"
              className="search-input"
              style={{ width: '120px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}
              type="number"
              min="0.01"
              step="0.01"
              value={manualQuantity}
              onChange={(event) => setManualQuantity(event.target.value)}
            />
          </div>
          
          <button
            type="button"
            className="btn btn-primary"
            style={{ height: '46px', padding: '0 32px' }}
            disabled={manualLoading}
            onClick={handleManualAdd}
          >
            {manualLoading ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
        
        {manualError && (
          <div className="result result-error" style={{ marginTop: '0', padding: '10px 16px' }}>
            {manualError}
          </div>
        )}
      </div>

      <details className="column-visibility">
        <summary>Columnas visibles</summary>
        <div className="column-visibility-options">
          {hideableColumns.map((column) => (
            <label key={column.key} className="column-visibility-option">
              <input
                type="checkbox"
                checked={visibleColumnKeys.includes(column.key)}
                onChange={() => toggleColumn(column.key)}
              />
              <span>{column.label}</span>
            </label>
          ))}
        </div>
      </details>

      <div className="table-container">
        {loading && items.length === 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={column.key === 'action' ? 'cell-action-sticky' : ''}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={column.key === 'action' ? 'cell-action-sticky' : ''}
                    >
                      <div className="skeleton" style={{ width: column.key === 'action' ? '30px' : '80px' }} />
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
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={[
                      sortBy === column.key ? 'sorted' : '',
                      column.key === 'quantity' ? 'cell-quantity-sticky' : '',
                      column.key === 'action' ? 'cell-action-sticky' : '',
                    ].filter(Boolean).join(' ')}
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
                  {visibleColumns.map((column) => renderCell(item, column.key))}
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
