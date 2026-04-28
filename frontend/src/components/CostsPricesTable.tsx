'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchUnified,
  parsePurchaseReviewFile,
  parsePurchaseReviewText,
  PurchaseReviewRow,
  UnifiedProduct,
} from '@/lib/api';

type MarginBand = 'green' | 'orange' | 'red' | 'na';

type SortField =
  | 'sku'
  | 'name'
  | 'internalCost'
  | 'priceBodeguita'
  | 'priceDistribuidoraMayorista'
  | 'stock'
  | 'marginBodeguita'
  | 'marginDistribuidora';

function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

function marginPercent(price: number, cost: number): number | null {
  if (cost <= 0) return null;
  return ((price - cost) / cost) * 100;
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/D';
  return `${value.toFixed(2)}%`;
}

function roundSuggestedPrice(value: number): number {
  if (value <= 0) return 0;
  return Math.round(value / 50) * 50;
}

function bodeguitaBand(margin: number | null): MarginBand {
  if (margin === null) return 'na';
  if (margin >= 40) return 'green';
  if (margin >= 30) return 'orange';
  return 'red';
}

function distribuidoraBand(margin: number | null): MarginBand {
  if (margin === null) return 'na';
  if (margin >= 25) return 'green';
  if (margin >= 15) return 'orange';
  return 'red';
}

async function fetchAllUnified(search?: string): Promise<UnifiedProduct[]> {
  const pageSize = 500;
  const first = await fetchUnified({ search, page: 1, limit: pageSize });

  if (first.totalPages <= 1) {
    return first.data;
  }

  const requests: ReturnType<typeof fetchUnified>[] = [];
  for (let currentPage = 2; currentPage <= first.totalPages; currentPage += 1) {
    requests.push(fetchUnified({ search, page: currentPage, limit: pageSize }));
  }

  const rest = await Promise.all(requests);
  return [first.data, ...rest.map((r) => r.data)].flat();
}

export default function CostsPricesTable() {
  const [allProducts, setAllProducts] = useState<UnifiedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [bodeguitaFilter, setBodeguitaFilter] = useState<'all' | 'green' | 'orange' | 'red'>('all');
  const [distribuidoraFilter, setDistribuidoraFilter] = useState<'all' | 'green' | 'orange' | 'red'>('all');
  const [purchaseText, setPurchaseText] = useState('');
  const [purchaseRows, setPurchaseRows] = useState<PurchaseReviewRow[]>([]);
  const [purchaseWarnings, setPurchaseWarnings] = useState<string[]>([]);
  const [purchaseErrors, setPurchaseErrors] = useState<string[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [bodeguitaFilter, distribuidoraFilter, sortBy, sortOrder]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllUnified(debouncedSearch || undefined);
      setAllProducts(data);
    } catch {
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortBy !== field) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = allProducts.filter((product) => {
      const bodeguitaMargin = marginPercent(product.priceBodeguita, product.internalCost);
      const distribuidoraMargin = marginPercent(product.priceDistribuidoraMayorista, product.internalCost);

      const bodeguitaMatches = bodeguitaFilter === 'all' || bodeguitaBand(bodeguitaMargin) === bodeguitaFilter;
      const distribuidoraMatches =
        distribuidoraFilter === 'all' || distribuidoraBand(distribuidoraMargin) === distribuidoraFilter;

      return bodeguitaMatches && distribuidoraMatches;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const val = (product: UnifiedProduct, field: SortField): string | number => {
        if (field === 'marginBodeguita') return marginPercent(product.priceBodeguita, product.internalCost) ?? Number.NEGATIVE_INFINITY;
        if (field === 'marginDistribuidora') return marginPercent(product.priceDistribuidoraMayorista, product.internalCost) ?? Number.NEGATIVE_INFINITY;
        if (field === 'name' || field === 'sku') return product[field];
        return product[field];
      };

      const aValue = val(a, sortBy);
      const bValue = val(b, sortBy);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue, 'es-AR')
          : bValue.localeCompare(aValue, 'es-AR');
      }

      const safeA = Number(aValue);
      const safeB = Number(bValue);
      return sortOrder === 'asc' ? safeA - safeB : safeB - safeA;
    });

    return sorted;
  }, [allProducts, bodeguitaFilter, distribuidoraFilter, sortBy, sortOrder]);

  const total = filteredAndSortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const currentPage = Math.min(page, totalPages);

  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredAndSortedProducts.slice(start, start + limit);
  }, [filteredAndSortedProducts, currentPage, limit]);

  const purchasePreview = useMemo(() => {
    const skuMap = new Map(allProducts.map((product) => [product.sku.trim().toLowerCase(), product]));
    const nameMap = new Map(allProducts.map((product) => [product.name.trim().toLowerCase(), product]));

    return purchaseRows.map((row) => {
      const normalizedSku = row.sku.trim().toLowerCase();
      const normalizedName = row.name.trim().toLowerCase();
      const product = skuMap.get(normalizedSku) || nameMap.get(normalizedName);

      const currentBodeguita = product?.priceBodeguita ?? 0;
      const currentDistribuidora = product?.priceDistribuidoraMayorista ?? 0;

      return {
        ...row,
        product,
        marginBodeguita: marginPercent(currentBodeguita, row.cost),
        marginDistribuidora: marginPercent(currentDistribuidora, row.cost),
        suggestedBodeguita: roundSuggestedPrice(row.cost * 1.45),
        suggestedDistribuidora: roundSuggestedPrice(row.cost * 1.25),
      };
    });
  }, [allProducts, purchaseRows]);

  const handleParseText = async () => {
    if (!purchaseText.trim()) return;
    setPurchaseLoading(true);
    try {
      const result = await parsePurchaseReviewText(purchaseText);
      setPurchaseRows(result.rows);
      setPurchaseWarnings(result.warnings);
      setPurchaseErrors(result.errors);
    } catch (error) {
      setPurchaseRows([]);
      setPurchaseWarnings([]);
      setPurchaseErrors([error instanceof Error ? error.message : 'Error al procesar texto']);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleParseFile = async (file: File) => {
    setPurchaseLoading(true);
    try {
      const result = await parsePurchaseReviewFile(file);
      setPurchaseRows(result.rows);
      setPurchaseWarnings(result.warnings);
      setPurchaseErrors(result.errors);
    } catch (error) {
      setPurchaseRows([]);
      setPurchaseWarnings([]);
      setPurchaseErrors([error instanceof Error ? error.message : 'Error al procesar archivo']);
    } finally {
      setPurchaseLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="section-title">Costos y precios</div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title">Revision de compra</div>
        <p className="file-upload-text" style={{ marginBottom: '10px' }}>
          Pega la tabla copiada desde tu ERP o importa un archivo `.xlsx`, `.xls` o `.csv`.
        </p>

        <textarea
          className="search-input"
          style={{ minHeight: '120px', resize: 'vertical' }}
          placeholder="Pegar tabla aqui (encabezados + filas)"
          value={purchaseText}
          onChange={(e) => setPurchaseText(e.target.value)}
        />

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="button" onClick={handleParseText} disabled={purchaseLoading}>
            {purchaseLoading ? 'Procesando...' : 'Procesar pegado'}
          </button>
          <label className="btn btn-secondary" style={{ margin: 0 }}>
            Importar archivo
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleParseFile(file);
                }
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>

        {(purchaseWarnings.length > 0 || purchaseErrors.length > 0) && (
          <div className={purchaseErrors.length > 0 ? 'result result-error' : 'result result-warning'}>
            {purchaseErrors.length > 0 && <div>{purchaseErrors.join(' | ')}</div>}
            {purchaseWarnings.length > 0 && <div>{purchaseWarnings.join(' | ')}</div>}
          </div>
        )}

        {purchasePreview.length > 0 && (
          <div className="table-container" style={{ marginTop: '16px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU compra</th>
                  <th>Nombre compra</th>
                  <th>Costo compra</th>
                  <th>P. Local actual</th>
                  <th>Margen local</th>
                  <th>P. Local sugerido</th>
                  <th>P. Distrib. actual</th>
                  <th>Margen distrib.</th>
                  <th>P. Distrib. sugerido</th>
                </tr>
              </thead>
              <tbody>
                {purchasePreview.map((row, index) => (
                  <tr key={`${row.sku}-${index}`}>
                    <td className="cell-sku">{row.sku || '-'}</td>
                    <td>{row.name || row.product?.name || '-'}</td>
                    <td className="cell-price">{formatPrice(row.cost)}</td>
                    <td className={`cell-price ${(row.product?.priceBodeguita ?? 0) === 0 ? 'zero' : ''}`}>{formatPrice(row.product?.priceBodeguita ?? 0)}</td>
                    <td><span className={`margin-chip ${bodeguitaBand(row.marginBodeguita)}`}>{formatPercent(row.marginBodeguita)}</span></td>
                    <td className="cell-price">{formatPrice(row.suggestedBodeguita)}</td>
                    <td className={`cell-price ${(row.product?.priceDistribuidoraMayorista ?? 0) === 0 ? 'zero' : ''}`}>{formatPrice(row.product?.priceDistribuidoraMayorista ?? 0)}</td>
                    <td><span className={`margin-chip ${distribuidoraBand(row.marginDistribuidora)}`}>{formatPercent(row.marginDistribuidora)}</span></td>
                    <td className="cell-price">{formatPrice(row.suggestedDistribuidora)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{total.toLocaleString('es-AR')}</div>
          <div className="stat-label">Productos evaluados</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Buscar por SKU o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="filter-select"
          value={bodeguitaFilter}
          onChange={(e) => setBodeguitaFilter(e.target.value as 'all' | 'green' | 'orange' | 'red')}
        >
          <option value="all">Margen Bodeguita: todos</option>
          <option value="green">Verde (&gt;= 40%)</option>
          <option value="orange">Anaranjado (30% a 39.99%)</option>
          <option value="red">Rojo (&lt; 30%)</option>
        </select>

        <select
          className="filter-select"
          value={distribuidoraFilter}
          onChange={(e) => setDistribuidoraFilter(e.target.value as 'all' | 'green' | 'orange' | 'red')}
        >
          <option value="all">Margen Distribuidora: todos</option>
          <option value="green">Verde (&gt;= 25%)</option>
          <option value="orange">Anaranjado (15% a 24.99%)</option>
          <option value="red">Rojo (&lt; 15%)</option>
        </select>
      </div>

      <div className="table-container">
        {loading ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Costo</th>
                <th>P. Bodeguita</th>
                <th>Margen Bodeguita</th>
                <th>P. Distribuidora</th>
                <th>Margen Distribuidora</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j}>
                      <div className="skeleton" style={{ width: `${60 + Math.random() * 60}px` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : pagedProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">No hay productos para mostrar con esos filtros</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className={sortBy === 'sku' ? 'sorted' : ''} onClick={() => handleSort('sku')}>
                  SKU <span className="sort-icon">{sortIcon('sku')}</span>
                </th>
                <th className={sortBy === 'name' ? 'sorted' : ''} onClick={() => handleSort('name')}>
                  Nombre <span className="sort-icon">{sortIcon('name')}</span>
                </th>
                <th className={sortBy === 'internalCost' ? 'sorted' : ''} onClick={() => handleSort('internalCost')}>
                  Costo <span className="sort-icon">{sortIcon('internalCost')}</span>
                </th>
                <th className={sortBy === 'priceBodeguita' ? 'sorted' : ''} onClick={() => handleSort('priceBodeguita')}>
                  P. Bodeguita <span className="sort-icon">{sortIcon('priceBodeguita')}</span>
                </th>
                <th className={sortBy === 'marginBodeguita' ? 'sorted' : ''} onClick={() => handleSort('marginBodeguita')}>
                  Margen Bodeguita <span className="sort-icon">{sortIcon('marginBodeguita')}</span>
                </th>
                <th className={sortBy === 'priceDistribuidoraMayorista' ? 'sorted' : ''} onClick={() => handleSort('priceDistribuidoraMayorista')}>
                  P. Distribuidora <span className="sort-icon">{sortIcon('priceDistribuidoraMayorista')}</span>
                </th>
                <th className={sortBy === 'marginDistribuidora' ? 'sorted' : ''} onClick={() => handleSort('marginDistribuidora')}>
                  Margen Distribuidora <span className="sort-icon">{sortIcon('marginDistribuidora')}</span>
                </th>
                <th className={sortBy === 'stock' ? 'sorted' : ''} onClick={() => handleSort('stock')}>
                  Stock <span className="sort-icon">{sortIcon('stock')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map((product) => {
                const bodeguitaMargin = marginPercent(product.priceBodeguita, product.internalCost);
                const distribuidoraMargin = marginPercent(product.priceDistribuidoraMayorista, product.internalCost);
                const bodeguitaClass = bodeguitaBand(bodeguitaMargin);
                const distribuidoraClass = distribuidoraBand(distribuidoraMargin);

                return (
                  <tr key={product.id}>
                    <td className="cell-sku">{product.sku}</td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</td>
                    <td className="cell-price">{formatPrice(product.internalCost)}</td>
                    <td className={`cell-price ${product.priceBodeguita === 0 ? 'zero' : ''}`}>{formatPrice(product.priceBodeguita)}</td>
                    <td>
                      <span className={`margin-chip ${bodeguitaClass}`}>
                        {formatPercent(bodeguitaMargin)}
                      </span>
                    </td>
                    <td className={`cell-price ${product.priceDistribuidoraMayorista === 0 ? 'zero' : ''}`}>{formatPrice(product.priceDistribuidoraMayorista)}</td>
                    <td>
                      <span className={`margin-chip ${distribuidoraClass}`}>
                        {formatPercent(distribuidoraMargin)}
                      </span>
                    </td>
                    <td className="cell-stock">{formatNumber(product.stock)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Mostrando {((currentPage - 1) * limit) + 1} a {Math.min(currentPage * limit, total)} de {total.toLocaleString('es-AR')}
          </div>
          <div className="pagination-buttons">
            <button className="pagination-btn" disabled={currentPage <= 1} onClick={() => setPage(1)}>
              {'<<'}
            </button>
            <button className="pagination-btn" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
              {'<'} Anterior
            </button>
            <span style={{ padding: '6px 12px', color: 'var(--color-text-secondary)' }}>
              Pagina {currentPage} de {totalPages}
            </span>
            <button className="pagination-btn" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente {'>'}
            </button>
            <button className="pagination-btn" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>
              {'>>'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
