// utils.ts

export const escClass = (v: string) => String(v || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");

export const currency = (n: any) =>
  n ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n) : "ติดต่อสอบถาม";

export const normalizeImg = (u: string) => {
  const s = String(u || "").trim();
  if (!s) return "";
  if (s.includes("ixiumu.cn")) {
    return `/api/proxy-image?url=${encodeURIComponent(s)}`;
  }
  if (/^https?:\/\//i.test(s)) return s;
  const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gshppxgvdrmbfcxsxeph.supabase.co";
  const BUCKET = "product-images";
  return `${PROJECT_URL}/storage/v1/object/public/${BUCKET}/${s.replace(/^\/+/, "")}`;
};

export const getSizeText = (specsOrRow: any, rowFallback?: any) => {
  if (!specsOrRow || typeof specsOrRow !== "object") return "";
  const specs = specsOrRow.specs && typeof specsOrRow.specs === "object" ? specsOrRow.specs : specsOrRow;
  const row = rowFallback || (specsOrRow.specs ? specsOrRow : null);
  if (specs.size_raw) return specs.size_raw;

  const l = specs.length_cm ?? specs.length_mm ?? specs.length ?? row?.length_cm;
  const w = specs.width_cm ?? specs.width_mm ?? specs.width ?? row?.width_cm;
  const t = specs.thickness_cm ?? specs.thickness_mm ?? specs.thickness ?? specs.height_cm ?? specs.height ?? row?.thickness_cm;
  const parts = [l, w, t].filter(v => v !== null && v !== undefined && v !== "" && Number(v) > 0);
  const numericDim = specs.dimensions || specs.dimension || (parts.length > 0 ? `${parts.join("-")} MM` : "");

  const direct = specs.size_text || specs.size || specs.Size;
  if (direct && numericDim && direct !== numericDim && !/\d/.test(String(direct))) {
    return `${numericDim} (${direct})`;
  }
  return direct || numericDim || "";
};

export const getStockQty = (row: any) => {
  if (!row?.stock || !Array.isArray(row.stock)) return 0;
  return row.stock.reduce((sum: number, item: any) => sum + (parseFloat(item.qty) || 0), 0);
};

export const normalizeStatus = (raw: string) => {
  const s = String(raw || "").toLowerCase().trim();
  if (s === "active") return "available";
  if (s === "inactive") return "archived";
  if (s === "sold out" || s === "sold_out" || s === "sold") return "sold";
  if (s === "on stock" || s === "on_stock" || s === "in stock" || s === "in_stock") return "on_stock";
  if (s === "pre-order" || s === "pre-oder" || s === "preorder" || s === "pre_order") return "pre_order";
  return s;
};

/**
 * คำนวณสถานะสินค้า: เช็คสต็อกจริงจากตาราง stock ก่อน
 * - ถ้ามี stock qty > 0 -> on_stock (พร้อมส่ง)
 * - ถ้าไม่มีสต็อก (qty <= 0) และไม่ได้ขายแล้ว/ติดจอง -> pre_order (พรีออเดอร์)
 */
export const getEffectiveStatus = (row: any) => {
  if (row?.specs?.pending === true || row?.specs?.pending === "true") return "pending";

  const rawSt = normalizeStatus(row?.status);
  if (rawSt === "sold") return "sold";
  if (rawSt === "draft") return "draft";
  if (rawSt === "archived") return "archived";
  if (rawSt === "on_request") return "on_request";
  if (rawSt === "pending" || rawSt === "reserved" || rawSt === "hold") return "pending";

  const totalStock = getStockQty(row);
  if (totalStock > 0) return "on_stock";

  return "pre_order";
};

export const calculateProductDiscount = (product: any, activeDiscounts: any[]) => {
  if (!product.price || activeDiscounts.length === 0) return null;
  const productPrice = parseFloat(product.price);

  const matchingDiscounts = activeDiscounts.filter(d => {
    const now = new Date();
    if (d.start_date && new Date(d.start_date) > now) return false;
    if (d.end_date && new Date(d.end_date) < now) return false;

    const rules = d.discount_rules || [];
    if (rules.length === 0) return true;

    return rules.some((r: any) => {
      const rulePid = r.product_id;
      const isSpecificProduct = rulePid !== null && rulePid !== undefined && rulePid !== "" && String(rulePid) !== "null";
      if (isSpecificProduct && String(rulePid) !== String(product.id)) return false;

      const minSubtotal = parseFloat(r.min_subtotal || 0);
      if (productPrice < minSubtotal) return false;
      return true;
    });
  });

  if (matchingDiscounts.length === 0) return null;

  let bestDiscount = null;
  let maxSaving = 0;

  matchingDiscounts.forEach(d => {
    let saving = 0;
    const discountValue = parseFloat(d.value);
    if (d.discount_type === 'PERCENT') {
      saving = productPrice * (discountValue / 100);
    } else {
      saving = discountValue;
    }
    if (saving > productPrice) saving = productPrice;

    if (saving > maxSaving) {
      maxSaving = saving;
      bestDiscount = { ...d, saving, newPrice: Math.max(0, productPrice - saving) };
    }
  });
  return bestDiscount;
};

export const niceStep = (raw: number, key: string) => {
  if (!Number.isFinite(raw) || raw <= 0) return key === "thickness" ? 0.5 : 10;
  const base = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / base;
  let step;
  if (n <= 1) step = 1;
  else if (n <= 2) step = 2;
  else if (n <= 5) step = 5;
  else step = 10;
  step *= base;
  if (key === "thickness") {
    step = Math.min(step, 2);
    step = Math.max(step, 0.2);
    step = Math.round(step * 10) / 10;
  } else {
    step = Math.max(5, Math.round(step / 5) * 5);
  }
  return step;
};

export const buildPresetsFromValues = (key: string, values: number[]) => {
  if (!values?.length) return [];
  const v = values.slice().sort((a, b) => a - b);
  const n = v.length;
  const min = v[0];
  const max = v[n - 1];
  const fmtNum = (num: number) => String(Math.round(num * 100) / 100).replace(/\.0+$/, "");

  if (min === max) return [{ label: `${fmtNum(min)}`, min, max }];

  const targetBins = 7;
  let h = (max - min) / targetBins;
  h = niceStep(h, key);

  const start = Math.floor(min / h) * h;
  const end = Math.ceil(max / h) * h;
  const bins = [];
  let i = 0;
  for (let a = start; a < end; a += h) {
    const b = a + h;
    while (i < n && v[i] < a) i++;
    let j = i;
    while (j < n && v[j] <= b) j++;
    if (j > i) {
      bins.push({ label: `${fmtNum(a)}–${fmtNum(b)}`, min: a, max: b });
    }
    i = j;
  }
  return bins.slice(0, 12);
};