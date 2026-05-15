'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Customer,
  CustomerFilters,
  fetchCustomerFilters,
  fetchCustomers,
} from '@/lib/api';

type CustomerColumnKey =
  | 'razonSocial'
  | 'nombreFantasia'
  | 'personeria'
  | 'categoriaImpositiva'
  | 'tipoDocumento'
  | 'documento'
  | 'provincia'
  | 'ciudad'
  | 'listaPrecio'
  | 'limiteDescubierto'
  | 'descuentoFijo'
  | 'vendedorAsignado'
  | 'telefono'
  | 'email';

type CustomerColumn = {
  key: CustomerColumnKey;
  label: string;
  sortable: boolean;
};

function formatNumber(value: number): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

export default function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filters, setFilters] = useState<CustomerFilters | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);

  const [search, setSearch] = useState('');
  const [personeria, setPersoneria] = useState('');
  const [categoriaImpositiva, setCategoriaImpositiva] = useState('');
  const [provincia, setProvincia] = useState('');
  const [vendedorAsignado, setVendedorAsignado] = useState('');
  const [listaPrecio, setListaPrecio] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<CustomerColumnKey[]>([
    'razonSocial',
    'nombreFantasia',
    'personeria',
    'categoriaImpositiva',
    'tipoDocumento',
    'documento',
    'provincia',
    'ciudad',
    'listaPrecio',
    'limiteDescubierto',
    'descuentoFijo',
    'vendedorAsignado',
    'telefono',
    'email',
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
    fetchCustomerFilters().then(setFilters).catch(() => {
      /* optional */
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCustomers({
        search: debouncedSearch || undefined,
        personeria: personeria || undefined,
        categoriaImpositiva: categoriaImpositiva || undefined,
        provincia: provincia || undefined,
        vendedorAsignado: vendedorAsignado || undefined,
        listaPrecio: listaPrecio || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
        page,
        limit,
      });
      setCustomers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, personeria, categoriaImpositiva, provincia, vendedorAsignado, listaPrecio, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSort = (field: CustomerColumnKey) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: CustomerColumnKey }) => {
    if (sortBy !== field) return <span className="sort-icon">^</span>;
    return <span className="sort-icon">{sortOrder === 'asc' ? '^' : 'v'}</span>;
  };

  const columns: CustomerColumn[] = [
    { key: 'razonSocial', label: 'Razon social', sortable: true },
    { key: 'nombreFantasia', label: 'Nombre fantasia', sortable: true },
    { key: 'personeria', label: 'Personeria', sortable: true },
    { key: 'categoriaImpositiva', label: 'Cat. impositiva', sortable: true },
    { key: 'tipoDocumento', label: 'Tipo doc', sortable: false },
    { key: 'documento', label: 'Documento', sortable: true },
    { key: 'provincia', label: 'Provincia', sortable: true },
    { key: 'ciudad', label: 'Ciudad', sortable: true },
    { key: 'listaPrecio', label: 'Lista precio', sortable: true },
    { key: 'limiteDescubierto', label: 'Limite', sortable: true },
    { key: 'descuentoFijo', label: 'Desc. fijo', sortable: true },
    { key: 'vendedorAsignado', label: 'Vendedor', sortable: true },
    { key: 'telefono', label: 'Telefono', sortable: false },
    { key: 'email', label: 'Email', sortable: false },
  ];

  const visibleColumns = columns.filter((column) => visibleColumnKeys.includes(column.key));

  const toggleColumn = (key: CustomerColumnKey) => {
    setVisibleColumnKeys((current) => {
      if (current.includes(key)) {
        return current.length === 1 ? current : current.filter((value) => value !== key);
      }

      return columns.map((column) => column.key).filter((value) => value === key || current.includes(value));
    });
  };

  const renderCell = (customer: Customer, key: CustomerColumnKey) => {
    switch (key) {
      case 'razonSocial':
        return <td key={key}>{customer.razonSocial}</td>;
      case 'nombreFantasia':
        return <td key={key}>{customer.nombreFantasia || '-'}</td>;
      case 'personeria':
        return <td key={key}>{customer.personeria || '-'}</td>;
      case 'categoriaImpositiva':
        return <td key={key}>{customer.categoriaImpositiva || '-'}</td>;
      case 'tipoDocumento':
        return <td key={key}>{customer.tipoDocumento || '-'}</td>;
      case 'documento':
        return <td key={key} className="cell-sku">{customer.documento || '-'}</td>;
      case 'provincia':
        return <td key={key}>{customer.provincia || '-'}</td>;
      case 'ciudad':
        return <td key={key}>{customer.ciudad || '-'}</td>;
      case 'listaPrecio':
        return <td key={key}>{customer.listaPrecio || '-'}</td>;
      case 'limiteDescubierto':
        return <td key={key} className="cell-stock">{formatNumber(customer.limiteDescubierto)}</td>;
      case 'descuentoFijo':
        return <td key={key} className="cell-stock">{formatNumber(customer.descuentoFijo)}</td>;
      case 'vendedorAsignado':
        return <td key={key}>{customer.vendedorAsignado || '-'}</td>;
      case 'telefono':
        return <td key={key}>{customer.telefono || customer.celular || '-'}</td>;
      case 'email':
        return <td key={key}>{customer.email || '-'}</td>;
    }
  };

  return (
    <div className="section">
      <div className="section-title">Clientes</div>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{total.toLocaleString('es-AR')}</div>
          <div className="stat-label">Clientes totales</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Buscar por razon social, fantasia, documento, ciudad o vendedor..."
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

            <select className="filter-select" value={vendedorAsignado} onChange={(e) => { setVendedorAsignado(e.target.value); setPage(1); }}>
              <option value="">Todos los vendedores</option>
              {filters.vendedoresAsignados.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select className="filter-select" value={listaPrecio} onChange={(e) => { setListaPrecio(e.target.value); setPage(1); }}>
              <option value="">Todas las listas</option>
              <option value={filters.withoutListaPrecioFilterValue}>Sin lista asignada</option>
              {filters.listasPrecio.map((item) => (
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
        {loading && customers.length === 0 ? (
          <table className="data-table"><thead><tr>{visibleColumns.map((col) => <th key={col.key}>{col.label}</th>)}</tr></thead></table>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">No hay clientes cargados</div>
            <div className="empty-state-hint">Importa un archivo de clientes para comenzar.</div>
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
              {customers.map((customer) => (
                <tr key={customer.id}>
                  {visibleColumns.map((column) => renderCell(customer, column.key))}
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
