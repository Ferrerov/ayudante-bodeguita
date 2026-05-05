'use client';

import { useEffect, useState } from 'react';
import {
  fetchImportJob,
  fetchImportJobs,
  ImportJob,
  ImportJobDetail,
  restoreImportJob,
  undoImportJob,
} from '@/lib/api';

export default function ImportJobsManager() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ImportJobDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<'undo' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchImportJobs({ page: 1, limit: 30 });
      setJobs(res.data);
      if (!selectedId && res.data.length > 0) {
        setSelectedId(res.data[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (jobId: number) => {
    setError(null);
    try {
      const res = await fetchImportJob(jobId);
      setDetail(res);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
    }
  }, [selectedId]);

  const handleUndo = async () => {
    if (!detail) return;
    const confirmed = window.confirm(
      `Vas a deshacer la importacion #${detail.id} (${detail.type}). Esta accion impacta los datos vigentes.`,
    );
    if (!confirmed) return;

    setActionLoading('undo');
    setError(null);
    try {
      await undoImportJob(detail.id);
      await loadJobs();
      await loadDetail(detail.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async () => {
    if (!detail) return;
    const confirmed = window.confirm(
      `Vas a restaurar desde la importacion #${detail.id} (${detail.type}).`,
    );
    if (!confirmed) return;

    setActionLoading('restore');
    setError(null);
    try {
      await restoreImportJob(detail.id);
      await loadJobs();
      await loadDetail(detail.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div className="card-title">Gestionar importaciones</div>

      {error && <div className="result result-error">{error}</div>}

      <div className="import-mgmt-layout">
        <div className="import-mgmt-list">
          <div className="import-mgmt-list-header">
            <strong>Historial</strong>
            <button className="btn btn-secondary btn-compact" onClick={() => void loadJobs()}>
              Recargar
            </button>
          </div>

          {loading && <p style={{ fontSize: '0.9rem' }}>Cargando...</p>}

          {!loading && jobs.length === 0 && (
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Todavia no hay importaciones registradas.
            </p>
          )}

          <div className="import-mgmt-items">
            {jobs.map((job) => (
              <button
                key={job.id}
                type="button"
                className={`import-mgmt-item ${selectedId === job.id ? 'active' : ''}`}
                onClick={() => setSelectedId(job.id)}
              >
                <div className="import-mgmt-item-title">#{job.id} {job.type}</div>
                <div className="import-mgmt-item-meta">{job.filename}</div>
                <div className="import-mgmt-item-meta">
                  {job.status} - {new Date(job.createdAt).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="import-mgmt-detail">
          {!detail && <p style={{ fontSize: '0.9rem' }}>Selecciona una importacion.</p>}

          {detail && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ marginBottom: '6px' }}>Importacion #{detail.id}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    {detail.type} - {detail.filename}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-compact"
                    onClick={handleRestore}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'restore' ? 'Restaurando...' : 'Restaurar'}
                  </button>
                  <button
                    className="btn btn-primary btn-compact"
                    onClick={handleUndo}
                    disabled={actionLoading !== null || !!detail.undoneAt || detail.status !== 'SUCCESS'}
                  >
                    {actionLoading === 'undo' ? 'Deshaciendo...' : 'Deshacer'}
                  </button>
                </div>
              </div>

              <div className="stats-bar" style={{ marginTop: '16px', marginBottom: '16px' }}>
                <div className="stat-card">
                  <div className="stat-value">{detail.rowsRead}</div>
                  <div className="stat-label">Filas leidas</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{detail.rowsImported}</div>
                  <div className="stat-label">Filas importadas</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{detail.warnings.length}</div>
                  <div className="stat-label">Warnings</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{detail.errors.length}</div>
                  <div className="stat-label">Errores</div>
                </div>
              </div>

              {detail.snapshots.length > 0 && (
                <div className="result result-success">
                  Snapshots: {detail.snapshots.map((s) => `${s.domainType}${s.scopeKey ? `(${s.scopeKey})` : ''}`).join(', ')}
                </div>
              )}

              {detail.movements.length > 0 && (
                <div className="result result-warning">
                  Movimientos de reposicion registrados: {detail.movements.length}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
