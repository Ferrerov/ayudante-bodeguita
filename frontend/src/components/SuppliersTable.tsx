'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchSupplierFilters,
  fetchSuppliers,
  Supplier,
  SupplierFilters,
} from '@/lib/api';

type SupplierColumnKey =
  | 'razonSocial'
  | 'nombreFantasia'
  | 'personeria'
  | 'categoriaImpositiva'
  | 'tipoDocumento'
  | 'documento'
  | 'provincia'
  | 'ciudad'
  | 'email'
  | 'telefono';

type SupplierColumn = {
  key: SupplierColumnKey;
  label: string;
  sortable: boolean;
};

export default function SuppliersTable() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filters, setFilters] = useState<SupplierFilters | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);

  const [search, setSearch] = useState('');
  const [personeria, setPersoneria] = useState('');
  const [categoriaImpositiva, setCategoriaImpositiva] = useState('');
  const [provincia, setProvincia] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<SupplierColumnKey[]>([
    'razonSocial',
    'nombreFantasia',
    'personeria',
    'categoriaImpositiva',
    'tipoDocumento',
    'documento',
    'provincia',
    'ciudad',
    'email',
    'telefono',
  ]);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchSupplierFilters().then(setFilters).catch(() => {
      /* optional */
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSuppliers({
        search: debouncedSearch || undefined,
        personeria: personeria || undefined,
        categoriaImpositiva: categoriaImpositiva || undefined,
        provincia: provincia || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
        page,
        limit,
      });
      setSuppliers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, personeria, categoriaImpositiva, provincia, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSort = (field: SupplierColumnKey) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SupplierColumnKey }) => {
    if (sortBy !== field) return <span className="sort-icon">^</span>;
    return <span className="sort-icon">{sortOrder === 'asc' ? '^' : 'v'}</span>;
  };

  const columns: SupplierColumn[] = [
    { key: 'razonSocial', label: 'Razon social', sortable: true },
    { key: 'nombreFantasia', label: 'Nombre fantasia', sortable: true },
    { key: 'personeria', label: 'Personeria', sortable: true },
    { key: 'categoriaImpositiva', label: 'Cat. impositiva', sortable: true },
    { key: 'tipoDocumento', label: 'Tipo doc', sortable: false },
    { key: 'documento', label: 'Documento', sortable: true },
    { key: 'provincia', label: 'Provincia', sortable: true },
    { key: 'ciudad', label: 'Ciudad', sortable: true },
    { key: 'email', label: 'Email', sortable: false },
    { key: 'telefono', label: 'Telefono', sortable: false },
  ];
  const visibleColumns = columns.filter((column) => visibleColumnKeys.includes(column.key));

  const toggleColumn = (key: SupplierColumnKey) => {
    setVisibleColumnKeys((current) => {
      if (current.includes(key)) {
        return current.length === 1 ? current : current.filter((value) => value !== key);
      }

      return columns.map((column) => column.key).filter((value) => value === key || current.includes(value));
    });
  };

  const renderCell = (supplier: Supplier, key: SupplierColumnKey) => {
    switch (key) {
      case 'razonSocial':
        return <td key={key}>{supplier.razonSocial}</td>;
      case 'nombreFantasia':
        return <td key={key}>{supplier.nombreFantasia || '-'}</td>;
      case 'personeria':
        return <td key={key}>{supplier.personeria || '-'}</td>;
      case 'categoriaImpositiva':
        return <td key={key}>{supplier.categoriaImpositiva || '-'}</td>;
      case 'tipoDocumento':
        return <td key={key}>{supplier.tipoDocumento || '-'}</td>;
      case 'documento':
        return <td key={key} className="cell-sku">{supplier.documento || '-'}</td>;
      case 'provincia':
        return <td key={key}>{supplier.provincia || '-'}</td>;
      case 'ciudad':
        return <td key={key}>{supplier.ciudad || '-'}</td>;
      case 'email':
        return <td key={key}>{supplier.email || '-'}</td>;
      case 'telefono':
        return <td key={key}>{supplier.telefono || supplier.celular || '-'}</td>;
    }
  };

  return (
    <div className="section">
      <div className="section-title">Proveedores</div>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{total.toLocaleString('es-AR')}</div>
          <div className="stat-label">Proveedores totales</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Buscar por razon social, fantasia, documento o ciudad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filters && (
          <>
            <select className="filter-select" value={personeria} onChange={(e) => { setPersoneria(e.target.value); setPage(1); }}>
              <option value="">Todas las personerias</option>
              {filters.personerias.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select className="filter-select" value={categoriaImpositiva} onChange={(e) => { setCategoriaImpositiva(e.target.value); setPage(1); }}>
              <option value="">Todas las categorias</option>
              {filters.categoriasImpositivas.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select className="filter-select" value={provincia} onChange={(e) => { setProvincia(e.target.value); setPage(1); }}>
              <option value="">Todas las provincias</option>
              {filters.provincias.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </>
        )}
      </div>

      <details className="column-visibility">
        <summary>Columnas visibles</summary>
        <div className="column-visibility-options">
          {columns.map((column) => (
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
        {loading && suppliers.length === 0 ? (
          <table className="data-table"><thead><tr>{visibleColumns.map((col) => <th key={col.key}>{col.label}</th>)}</tr></thead></table>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">Proveedores</div>
            <div className="empty-state-text">No hay proveedores cargados</div>
            <div className="empty-state-hint">Importa un archivo de proveedores para comenzar.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {visibleColumns.map((col) => (
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
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  {visibleColumns.map((column) => renderCell(supplier, column.key))}
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
            <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(1)}>{'<<'}</button>
            <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{'< Anterior'}</button>
            <span style={{ padding: '6px 12px', color: 'var(--color-text-secondary)' }}>Pagina {page} de {totalPages}</span>
            <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{'Siguiente >'}</button>
            <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>{'>>'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
