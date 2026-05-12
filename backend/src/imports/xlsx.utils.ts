import * as XLSX from 'xlsx';

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];
}

/**
 * Lee un archivo .xlsx desde un buffer y devuelve encabezados + filas.
 * Toma la primera hoja del libro.
 */
export function parseXlsx(buffer: Buffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('El archivo no contiene hojas.');
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  if (jsonData.length === 0) {
    throw new Error('La hoja no contiene datos.');
  }

  const headers = Object.keys(jsonData[0]);

  return { headers, rows: jsonData };
}

/**
 * Valida que las columnas requeridas existan en los encabezados.
 * Devuelve las columnas faltantes.
 */
export function findMissingColumns(
  headers: string[],
  required: string[],
): string[] {
  const headerSet = new Set(headers.map((h) => h.trim()));
  return required.filter((col) => !headerSet.has(col));
}

/**
 * Normaliza un string: recorta espacios laterales.
 */
export function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return `${value}`.trim();
  }
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value).trim();
}

/**
 * Parsea un valor numérico, soportando coma y punto decimal.
 * Devuelve null si el valor no es convertible a número válido.
 */
export function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }

  const str = normalizeString(value);
  if (str === '') return 0;

  // Detectar formato: si tiene punto y coma, el último separador es el decimal
  // Ej: "1.234,56" -> 1234.56 | "1,234.56" -> 1234.56 | "1234,56" -> 1234.56
  let normalized = str;

  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');

  if (lastComma > lastDot) {
    // La coma es el separador decimal
    normalized = str.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // El punto es el separador decimal
    normalized = str.replace(/,/g, '');
  } else {
    // No hay ambigüedad
    normalized = str.replace(/,/g, '.');
  }

  const num = Number(normalized);
  return isNaN(num) ? null : num;
}

/**
 * Parsea "Si"/"No" o "Sí"/"No" a booleano.
 */
export function parseBoolean(value: unknown): boolean {
  const str = normalizeString(value).toLowerCase();
  return str === 'si' || str === 'sí' || str === 'true' || str === '1';
}
