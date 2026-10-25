// config.ts

export const LIMIT = 40;

export const SPEC_KEYS = {
  type: "spec_type",
  material: "material",
  panel: "panel_craft",
};

export const STATUS_TABS = [
  { key: "all", label: "All", values: null },
  { key: "on_stock", label: "In Stock", values: ["On Stock", "on_stock", "in_stock"] },
  { key: "pre_order", label: "Pre-Order", values: ["Pre-Oder", "Pre-order", "pre_order", "preorder"] },
  { key: "pending", label: "Pending", values: ["pending", "reserved", "hold", "on_request"] },
  { key: "sold", label: "Sold Out", values: ["Sold Out", "sold", "archived", "inactive"] },
];

export const RANGE_COLS: Record<string, string> = {
  length: "length_cm",
  width: "width_cm",
  thickness: "thickness_cm",
};

export const PRODUCT_TYPES = [
  "Wood slabs",
  "Small table",
  "Leg",
  "Chair/Stool",
  "Cabinet",
  "Table",
  "Small Furniture",
];

export const HEADERS = [
  { key: "material", label: "Material" },
  { key: "panel", label: "Panel Craft" },
  { key: "length", label: "Length (mm)" },
  { key: "width", label: "Width (mm)" },
  { key: "thickness", label: "Thickness (mm)" },
  { key: "price", label: "Price" },
  { key: "discount", label: "Deals" },
  { key: "status", label: "State" },
];