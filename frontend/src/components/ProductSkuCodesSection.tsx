'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSkuCodes, SkuCodesOverview } from '@/lib/api';

function formatReason(reason: 'NON_NUMERIC_SKU' | 'OUT_OF_RANGE' | 'UNKNOWN_CATEGORY'): string {
  if (reason === 'NON_NUMERIC_SKU') return 'SKU no numerico';
  if (reason === 'OUT_OF_RANGE') return 'Fuera del rango esperado';
  return 'Rubro sin regla de rango';
}

export default function ProductSkuCodesSection() {
  const [ruleId, setRuleId] = useState<number | undefined>(undefined);
  const [data, setData] = useState<SkuCodesOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSkuCodes(ruleId);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [ruleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedAvailability = useMemo(
    () => data?.availability[0] ?? null,
    [data],
  );

  return (
    <div className="section">
      <div className="section-title">Codigos de productos</div>

      <div className="toolbar">
        <select
          className="filter-select"
          value={ruleId ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            setRuleId(value ? Number.parseInt(value, 10) : undefined);
          }}
        >
          <option value="">Todos los rubros</option>
          {data?.rules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.id} - {rule.name}
            </option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <div className="empty-state">
          <div className="empty-state-text">Cargando codigos...</div>
        </div>
      ) : (
        <>
          <div className="section-title">SKUs libres por rubro</div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rubro</th>
                  <th>Rango</th>
                  <th>Usados</th>
                  <th>Libres</th>
                  <th>Codigos disponibles</th>
                </tr>
              </thead>
              <tbody>
                {data?.availability.map((item) => (
                  <tr key={item.ruleId}>
                    <td>{item.ruleId} - {item.ruleName}</td>
                    <td>{item.min} a {item.max}</td>
                    <td>{item.usedCount}</td>
                    <td>{item.availableCount}</td>
                    <td style={{ whiteSpace: 'normal', maxWidth: '640px' }}>
                      {item.availableSkus.length === 0 ? 'Sin codigos libres' : item.availableSkus.join(', ')}
                    </td>
                  </tr>
                ))}
                {!data?.availability.length && (
                  <tr>
                    <td colSpan={5}>No hay datos para el rubro seleccionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="section-title" style={{ marginTop: '24px' }}>
            Productos con SKU fuera de rango
          </div>
          <div className="stats-bar">
            <div className="stat-card">
              <div className="stat-value">{data?.totals.mismatches ?? 0}</div>
              <div className="stat-label">Productos para revisar</div>
            </div>
            {selectedAvailability && (
              <div className="stat-card">
                <div className="stat-value">{selectedAvailability.availableCount}</div>
                <div className="stat-label">SKUs libres en rubro filtrado</div>
              </div>
            )}
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU actual</th>
                  <th>Producto</th>
                  <th>Rubro actual</th>
                  <th>Rango esperado</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {data?.mismatches.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-sku">{item.sku}</td>
                    <td>{item.name}</td>
                    <td>{item.category || '-'}</td>
                    <td>
                      {item.expectedMin && item.expectedMax
                        ? `${item.expectedRuleId} - ${item.expectedRuleName} (${item.expectedMin} a ${item.expectedMax})`
                        : '-'}
                    </td>
                    <td>{formatReason(item.reason)}</td>
                  </tr>
                ))}
                {!data?.mismatches.length && (
                  <tr>
                    <td colSpan={5}>No hay productos fuera de rango para el filtro seleccionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
