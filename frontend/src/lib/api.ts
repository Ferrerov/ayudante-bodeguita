const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ImportResult {
  type: string;
  filename: string;
  rowsRead: number;
  rowsImported: number;
  warnings: string[];
  errors: string[];
}

export interface UnifiedProduct {
  id: number;
  sku: string;
  type: string;
  name: string;
  barcode: string | null;
  status: string;
  internalCost: number;
  basePrice: number;
  finalPrice: number;
  stock: number;
  reservedStock: number;
  availableStock: number;
  visibleInSales: boolean;
  category: string | null;
  subcategory: string | null;
  supplier: string | null;
  priceBodeguita: number;
  priceDistribuidoraMayorista: number;
}

export interface UnifiedResponse {
  data: UnifiedProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  categories: string[];
  subcategories: string[];
  types: string[];
  statuses: string[];
}

export interface ReplenishmentItem {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  category: string | null;
  subcategory: string | null;
  updatedAt: string;
}

export interface ReplenishmentResponse {
  data: ReplenishmentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReplenishmentFilters {
  categories: string[];
  subcategories: string[];
}

export interface AddReplenishmentManualInput {
  sku: string;
  quantity: number;
}

export interface PurchaseReviewRow {
  sku: string;
  name: string;
  cost: number;
  quantity: number;
}

export interface PurchaseReviewResult {
  rowsRead: number;
  rowsImported: number;
  rows: PurchaseReviewRow[];
  warnings: string[];
  errors: string[];
}

export interface SkuRangeRule {
  id: number;
  name: string;
  min: number;
  max: number;
}

export interface SkuAvailability {
  ruleId: number;
  ruleName: string;
  min: number;
  max: number;
  usedCount: number;
  availableCount: number;
  availableSkus: number[];
}

export interface SkuMismatch {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  expectedRuleId: number | null;
  expectedRuleName: string | null;
  expectedMin: number | null;
  expectedMax: number | null;
  parsedSku: number | null;
  reason: 'NON_NUMERIC_SKU' | 'OUT_OF_RANGE' | 'UNKNOWN_CATEGORY';
}

export interface SkuCodesOverview {
  rules: SkuRangeRule[];
  availability: SkuAvailability[];
  mismatches: SkuMismatch[];
  totals: {
    mismatches: number;
  };
}

export async function importProducts(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/imports/products`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Error al importar productos');
  }

  return res.json();
}

export async function importPriceList(
  file: File,
  listSlug: string,
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/imports/price-lists/${listSlug}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Error al importar lista de precios');
  }

  return res.json();
}

export async function importReplenishment(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/imports/replenishment`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Error al importar reposicion');
  }

  return res.json();
}

export async function fetchUnified(params: {
  search?: string;
  category?: string;
  subcategory?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}): Promise<UnifiedResponse> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const res = await fetch(`${API_URL}/products/unified?${searchParams.toString()}`);

  if (!res.ok) {
    throw new Error('Error al cargar productos');
  }

  return res.json();
}

export async function fetchFilters(): Promise<FilterOptions> {
  const res = await fetch(`${API_URL}/products/filters`);

  if (!res.ok) {
    throw new Error('Error al cargar filtros');
  }

  return res.json();
}

export async function fetchReplenishment(params: {
  search?: string;
  category?: string;
  subcategory?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}): Promise<ReplenishmentResponse> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const res = await fetch(`${API_URL}/replenishment?${searchParams.toString()}`);

  if (!res.ok) {
    throw new Error('Error al cargar reposicion');
  }

  return res.json();
}

export async function fetchReplenishmentFilters(): Promise<ReplenishmentFilters> {
  const res = await fetch(`${API_URL}/replenishment/filters`);

  if (!res.ok) {
    throw new Error('Error al cargar filtros de reposicion');
  }

  return res.json();
}

export async function markReplenished(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/replenishment/${id}/replenished`, {
    method: 'PATCH',
  });

  if (!res.ok) {
    throw new Error('Error al marcar como repuesto');
  }
}

export async function updateReplenishmentQuantity(
  id: number,
  quantity: number,
): Promise<void> {
  const res = await fetch(`${API_URL}/replenishment/${id}/quantity`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Error al actualizar cantidad');
  }
}

export async function addReplenishmentManual(
  input: AddReplenishmentManualInput,
): Promise<void> {
  const res = await fetch(`${API_URL}/replenishment/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Error al agregar producto a reposicion');
  }
}

export async function parsePurchaseReviewText(text: string): Promise<PurchaseReviewResult> {
  const res = await fetch(`${API_URL}/imports/purchase-review/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Error al procesar texto de compra');
  }

  return res.json();
}

export async function parsePurchaseReviewFile(file: File): Promise<PurchaseReviewResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/imports/purchase-review/file`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Error al procesar archivo de compra');
  }

  return res.json();
}

export async function fetchSkuCodes(ruleId?: number): Promise<SkuCodesOverview> {
  const searchParams = new URLSearchParams();
  if (ruleId !== undefined) {
    searchParams.set('ruleId', String(ruleId));
  }

  const queryString = searchParams.toString();
  const res = await fetch(
    `${API_URL}/products/sku-codes${queryString ? `?${queryString}` : ''}`,
  );

  if (!res.ok) {
    throw new Error('Error al cargar codigos de productos');
  }

  return res.json();
}
