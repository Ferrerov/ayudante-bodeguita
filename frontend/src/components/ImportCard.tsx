'use client';

import { useState, useRef } from 'react';
import { ImportResult } from '@/lib/api';

interface ImportCardProps {
  title: string;
  description: string;
  onImport: (file: File) => Promise<ImportResult>;
}

export default function ImportCard({ title, description, onImport }: ImportCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await onImport(file);
      setResult(res);
      if (res.errors.length === 0) {
        setFile(null);
        if (inputRef.current) inputRef.current.value = '';
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card import-card">
      <div className="card-title">
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <polyline points="9 15 12 12 15 15" />
        </svg>
        {title}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
        {description}
      </p>

      <label className={`file-upload ${file ? 'has-file' : ''}`}>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
        {file ? (
          <>
            <div style={{ color: 'var(--color-success)', marginBottom: '4px' }}>✓ Archivo seleccionado</div>
            <div className="file-upload-filename">{file.name}</div>
          </>
        ) : (
          <div className="file-upload-text">
            Hacé clic o arrastrá un archivo .xlsx
          </div>
        )}
      </label>

      <div className="import-actions">
        <button
          className="btn btn-primary"
          onClick={handleImport}
          disabled={!file || loading}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Importando...
            </>
          ) : (
            'Importar'
          )}
        </button>
      </div>

      {/* Error de request */}
      {error && (
        <div className="result result-error">
          ✕ {error}
        </div>
      )}

      {/* Resultado del import */}
      {result && (
        <>
          {result.errors.length > 0 ? (
            <div className="result result-error">
              <strong>Import rechazado</strong> — {result.errors.length} error(es) encontrado(s).
              <div className="result-details">
                <ul>
                  {result.errors.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="result result-success">
              <strong>✓ Import exitoso</strong> — {result.rowsImported} de {result.rowsRead} filas importadas.
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="result result-warning" style={{ marginTop: '8px' }}>
              <strong>⚠ {result.warnings.length} advertencia(s)</strong>
              <div className="result-details">
                <ul>
                  {result.warnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
