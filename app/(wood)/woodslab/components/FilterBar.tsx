'use client'
import React, { useRef, useEffect, useState } from 'react';
import { STATUS_TABS, HEADERS, PRODUCT_TYPES } from '../config';
// ยายเพิ่ม type CategoryKey เข้ามาตรงนี้นะจ๊ะ
import { FilterState, type CategoryKey } from '@/app/actions/product';

interface FilterBarProps {
  currentCategory: CategoryKey; // ยายแก้ตรงนี้
  handleCategoryChange: (cat: CategoryKey) => void; // และตรงนี้จ้ะ
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  handleFilterChange: (key: keyof FilterState, val: string) => void;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  openKey: string;
  setOpenKey: (key: string) => void;
  options: any;
  rangeStats: any;
  rangePresets: any;
  handleRangeApply: (minKey: string, maxKey: string, minVal: string, maxVal: string) => void;
  setPage: (page: number) => void;
}

export default function FilterBar({
  currentCategory,
  handleCategoryChange,
  filters,
  handleFilterChange,
  handleSearch,
  openKey,
  setOpenKey,
  options,
  rangeStats,
  rangePresets,
  handleRangeApply
}: FilterBarProps) {

  const barRef = useRef<HTMLDivElement>(null)
  const [scrolledEnd, setScrolledEnd] = useState(false)

  // 💡 ยายสร้างตัวแปรเก็บหมวดหมู่ทั้งหมดไว้ตรงนี้ จะได้แก้ไขง่ายๆ จ้ะ
  const CATEGORY_TABS: { key: CategoryKey, label: string }[] = [
    { key: 'all', label: 'All Items' },
    { key: 'slabs', label: 'Wood Slabs' },
    { key: 'rough', label: 'Rough Wood' },
    { key: 'leg', label: 'Table Legs' },
    { key: 'chair', label: 'Chairs / Stools' }
  ];

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const check = () => {
      setScrolledEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
    }
    check()
    el.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      el.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  // ---- helpers ----
  const getChip = (key: string) => {
    if (key === "type") return filters.type;
    if (key === "material") return filters.material;
    if (key === "panel") return filters.panel;
    if (key === "status") {
      const tab = STATUS_TABS.find(t => t.key === filters.status && t.key !== "all");
      return tab ? ((tab as any).chip || tab.label) : "";
    }
    if (key === "discount") return filters.discount === "yes" ? "On Sale" : "";
    if (["length", "width", "thickness"].includes(key)) {
      const mk = key === "thickness" ? "thick" : key;
      const mn = filters[`${mk}Min` as keyof FilterState];
      const mx = filters[`${mk}Max` as keyof FilterState];
      if (mn || mx) return `${mn || '0'} – ${mx || '∞'}`;
    }
    return "";
  };

  // ยายเปลี่ยนจาก !== 'slabs' เป็น !== 'all' จ้ะ
  const hasAnyFilter = HEADERS.some(h => getChip(h.key) !== "") || currentCategory !== 'all';

  const clearAll = () => {
    handleFilterChange("type", "");
    handleFilterChange("material", "");
    handleFilterChange("panel", "");
    handleFilterChange("status", "all");
    handleFilterChange("discount", "all");
    handleFilterChange("lengthMin", ""); handleFilterChange("lengthMax", "");
    handleFilterChange("widthMin", ""); handleFilterChange("widthMax", "");
    handleFilterChange("thickMin", ""); handleFilterChange("thickMax", "");
    handleFilterChange("priceMin", ""); handleFilterChange("priceMax", "");
    setOpenKey("");
  };

  return (
    <>
      <style>{`
        /* ── FilterBar ── */
        .fb-root { width: 100%; }

        /* ── Category switcher ── */
        .fb-cat-row {
          display: flex;
          gap: 0;
          margin-bottom: 28px;
          border-bottom: 1px solid var(--line);
          /* ยายเพิ่ม overflow เผื่อหน้าจอมือถือเล็กๆ จะได้ปัดซ้ายขวาได้จ้ะ */
          overflow-x: auto;
          scrollbar-width: none;
        }
        .fb-cat-row::-webkit-scrollbar { display: none; }
        
        .fb-cat-btn {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 10px 22px 10px 0;
          margin-bottom: -1px;
          font-family: var(--font-serif);
          font-size: 1.05rem;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.25s;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .fb-cat-btn:hover { color: var(--text-main); }
        .fb-cat-btn.active {
          color: var(--text-main);
          border-bottom-color: var(--accent);
        }

        /* ── Filter + Search row ── */
        .fb-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          row-gap: 8px;
        }
        .fb-label {
          font-size: 0.68rem;
          font-weight: 500;
          color: var(--text-muted);
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-right: 8px;
          flex-shrink: 0;
        }
        .fb-divider {
          width: 1px;
          height: 16px;
          background: var(--line);
          margin: 0 4px;
          flex-shrink: 0;
        }

        /* ── Filter pill button ── */
        .fb-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 1px solid transparent;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 400;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .fb-pill:hover {
          color: var(--text-main);
          border-color: var(--line);
          background: var(--btn-hover);
        }
        .fb-pill.open {
          color: var(--text-main);
          border-color: var(--line);
          background: var(--btn-hover);
        }
        .fb-pill.has-value {
          color: var(--text-main);
          border-color: var(--accent);
          background: transparent;
          font-weight: 500;
        }
        .fb-pill-chip {
          display: inline-block;
          background: var(--accent);
          color: #fff;
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          padding: 1px 7px;
          border-radius: 999px;
          line-height: 1.5;
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .fb-pill-arrow {
          font-size: 0.55rem;
          opacity: 0.5;
          transition: transform 0.2s;
          margin-left: 2px;
        }
        .fb-pill.open .fb-pill-arrow { transform: rotate(180deg); opacity: 0.8; }

        /* ── Search box ── */
        .fb-search {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--line);
          padding: 5px 0;
          transition: border-color 0.3s;
          min-width: 180px;
        }
        .fb-search:focus-within { border-color: var(--accent); }
        .fb-search svg { flex-shrink: 0; color: var(--text-muted); }
        .fb-search input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.8rem;
          color: var(--text-main);
          font-family: var(--font-sans);
          width: 100%;
          letter-spacing: 0.3px;
        }
        .fb-search input::placeholder { color: var(--text-muted); }

        /* ── Clear all ── */
        .fb-clear {
          background: none;
          border: none;
          font-size: 0.68rem;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--text-muted);
          cursor: pointer;
          padding: 5px 8px;
          transition: color 0.2s;
          text-decoration: underline;
          text-underline-offset: 3px;
          flex-shrink: 0;
        }
        .fb-clear:hover { color: var(--accent); }

        /* ── Expanded tray ── */
        .fb-tray {
          margin-top: 16px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: #faf8f5;
          padding: 28px 32px 26px;
          position: relative;
          animation: fb-slide 0.22s ease;
          box-shadow: 0 4px 24px rgba(0,0,0,0.04);
        }
        [data-theme="dark"] .fb-tray {
          background: #1a1816;
        }
        @keyframes fb-slide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fb-tray-title {
          font-family: var(--font-serif);
          font-size: 0.8rem;
          font-weight: 400;
          color: var(--text-muted);
          margin-bottom: 18px;
          letter-spacing: 3px;
          text-transform: uppercase;
        }
        .fb-tray-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        /* ── Option chips inside tray ── */
        .fb-opt {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--text-muted);
          padding: 8px 20px;
          border-radius: 999px;
          font-size: 0.78rem;
          letter-spacing: 0.5px;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: var(--font-sans);
          position: relative;
          overflow: hidden;
        }
        .fb-opt:hover {
          border-color: var(--accent);
          color: var(--text-main);
          background: transparent;
        }
        .fb-opt.active {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(197,160,89,0.35);
          letter-spacing: 0.6px;
        }
        [data-theme="dark"] .fb-opt.active {
          box-shadow: 0 4px 12px rgba(212,175,55,0.25);
        }

        /* ── Range inputs ── */
        .fb-range-group {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }
        .fb-range-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .fb-range-inputs {
          display: flex;
          align-items: flex-end;
          gap: 16px;
        }
        .fb-range-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .fb-range-lbl {
          font-size: 0.65rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .fb-range-inp {
          width: 100px;
          border: none;
          border-bottom: 1px solid var(--line);
          background: transparent;
          padding: 7px 0;
          text-align: center;
          font-size: 0.95rem;
          color: var(--text-main);
          font-family: var(--font-serif);
          outline: none;
          transition: border-color 0.2s;
        }
        .fb-range-inp:focus { border-color: var(--accent); }
        .fb-range-sep {
          color: var(--text-muted);
          font-size: 1rem;
          font-weight: 300;
          padding-bottom: 8px;
          flex-shrink: 0;
        }
        .fb-range-stat {
          font-size: 0.72rem;
          color: var(--text-muted);
          letter-spacing: 0.8px;
        }
        .fb-range-stat span { color: var(--accent); }

        /* ── Close button ── */
        .fb-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .fb-close:hover {
          background: var(--btn-hover);
          color: var(--text-main);
          transform: rotate(90deg);
        }

        /* ── Price symbol ── */
        .fb-price-wrap {
          position: relative;
        }
        .fb-price-sym {
          position: absolute;
          left: 0;
          bottom: 8px;
          color: var(--text-muted);
          font-family: var(--font-serif);
          font-size: 0.9rem;
        }
        .fb-price-inp {
          padding-left: 16px !important;
        }

        @media (max-width: 640px) {
          .fb-tray { padding: 20px 16px 18px; }
          .fb-label { display: none; }
          .fb-divider { display: none; }

          /* wrapper สำหรับ fade effect */
          .fb-bar-wrap {
            position: relative;
          }
          .fb-bar-wrap::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 48px;
            height: 100%;
            background: linear-gradient(to right, transparent, var(--bg));
            pointer-events: none;
            z-index: 1;
            transition: opacity 0.2s;
          }
          .fb-bar-wrap.scrolled-end::after {
            opacity: 0;
          }

          /* Pills scroll แนวนอน แถวเดียว */
          .fb-bar {
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 4px;
            gap: 6px;
          }
          .fb-bar::-webkit-scrollbar { display: none; }

          /* Search แยกลงแถวใหม่ */
          .fb-search {
            order: 999;
            flex: 0 0 100%;
            min-width: unset;
            margin-left: 0;
            margin-top: 10px;
          }

          .fb-pill { flex-shrink: 0; }
          .fb-clear { flex-shrink: 0; }
        }
      `}</style>

      <div className="fb-root">

        {/* ── Category tabs (ยายแก้วนลูปปุ่มตรงนี้จ้ะ) ── */}
        <div className="fb-cat-row">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`fb-cat-btn${currentCategory === tab.key ? ' active' : ''}`}
              onClick={() => handleCategoryChange(tab.key)}
              suppressHydrationWarning
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <div className={`fb-bar-wrap${scrolledEnd ? ' scrolled-end' : ''}`}>
        <div className="fb-bar" ref={barRef}>
          <span className="fb-label">Filter</span>
          <div className="fb-divider" />

          {HEADERS.map(h => {
            const chip = getChip(h.key);
            const isOpen = openKey === h.key;
            const hasVal = chip !== "";
            return (
              <button
                key={h.key}
                suppressHydrationWarning
                className={`fb-pill${isOpen ? ' open' : ''}${hasVal ? ' has-value' : ''}`}
                onClick={() => setOpenKey(isOpen ? "" : h.key)}
              >
                {h.label}
                {hasVal && <span className="fb-pill-chip">{chip}</span>}
                <span className="fb-pill-arrow">▼</span>
              </button>
            );
          })}

          {hasAnyFilter && (
            <button className="fb-clear" onClick={clearAll}>Clear</button>
          )}

          {/* Search */}
          <div className="fb-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search..."
              onChange={handleSearch}
              suppressHydrationWarning
            />
          </div>
        </div>
        </div>

        {/* ── Expanded tray ── */}
        {openKey && (
          <div className="fb-tray">
            <div className="fb-tray-title">
              {HEADERS.find(x => x.key === openKey)?.label}
            </div>

            {/* Material / Panel */}
            {["material", "panel"].includes(openKey) && (
              <div className="fb-tray-options">
                <button
                  className={`fb-opt${filters[openKey as keyof FilterState] === "" ? ' active' : ''}`}
                  onClick={() => handleFilterChange(openKey as keyof FilterState, "")}
                >
                  All
                </button>
                {options[openKey]?.map((opt: string) => (
                  <button
                    key={opt}
                    className={`fb-opt${filters[openKey as keyof FilterState] === opt ? ' active' : ''}`}
                    onClick={() => handleFilterChange(openKey as keyof FilterState, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Status */}
            {openKey === "status" && (
              <div className="fb-tray-options">
                {STATUS_TABS.map(t => (
                  <button
                    key={t.key}
                    className={`fb-opt${filters.status === t.key ? ' active' : ''}`}
                    onClick={() => handleFilterChange("status", t.key)}
                  >
                    {t.key === 'on_stock' && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#27ae60',
                          marginRight: 6,
                          verticalAlign: 'middle',
                        }}
                      />
                    )}
                    {t.key === 'pre_order' && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#d4af37',
                          marginRight: 6,
                          verticalAlign: 'middle',
                        }}
                      />
                    )}
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Deals */}
            {openKey === "discount" && (
              <div className="fb-tray-options">
                <button className={`fb-opt${filters.discount === "all" ? ' active' : ''}`} onClick={() => handleFilterChange("discount", "all")}>All Items</button>
                <button className={`fb-opt${filters.discount === "yes" ? ' active' : ''}`} onClick={() => handleFilterChange("discount", "yes")}>On Sale</button>
              </div>
            )}

            {/* Range: Length / Width / Thickness */}
            {["length", "width", "thickness"].includes(openKey) && (() => {
              const mk = openKey === "thickness" ? "thick" : openKey;
              const minKey = `${mk}Min` as keyof FilterState;
              const maxKey = `${mk}Max` as keyof FilterState;
              const stats = rangeStats[openKey];
              const presets = rangePresets[openKey];
              return (
                <div className="fb-range-group">
                  {Array.isArray(presets) && presets.length > 0 && (
                    <div className="fb-range-presets">
                      {presets.map((p: any, idx: number) => (
                        <button key={idx} className="fb-opt" onClick={() => handleRangeApply(String(minKey), String(maxKey), p.min, p.max)}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="fb-range-inputs">
                    <div className="fb-range-field">
                      <span className="fb-range-lbl">Min (mm)</span>
                      <input type="number" className="fb-range-inp" placeholder="0" value={filters[minKey]} onChange={e => handleFilterChange(minKey, e.target.value)} />
                    </div>
                    <span className="fb-range-sep">—</span>
                    <div className="fb-range-field">
                      <span className="fb-range-lbl">Max (mm)</span>
                      <input type="number" className="fb-range-inp" placeholder="Any" value={filters[maxKey]} onChange={e => handleFilterChange(maxKey, e.target.value)} />
                    </div>
                  </div>
                  {stats?.min !== undefined && (
                    <div className="fb-range-stat">
                      Available: <span>{stats.min} – {stats.max} mm</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Price */}
            {openKey === "price" && (
              <div className="fb-range-inputs">
                <div className="fb-range-field">
                  <span className="fb-range-lbl">Min Price</span>
                  <div className="fb-price-wrap">
                    <span className="fb-price-sym">฿</span>
                    <input type="number" className="fb-range-inp fb-price-inp" placeholder="0" value={filters.priceMin} onChange={e => handleFilterChange("priceMin", e.target.value)} />
                  </div>
                </div>
                <span className="fb-range-sep">—</span>
                <div className="fb-range-field">
                  <span className="fb-range-lbl">Max Price</span>
                  <div className="fb-price-wrap">
                    <span className="fb-price-sym">฿</span>
                    <input type="number" className="fb-range-inp fb-price-inp" placeholder="Any" value={filters.priceMax} onChange={e => handleFilterChange("priceMax", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Close */}
            <button className="fb-close" onClick={() => setOpenKey("")} aria-label="Close filter">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

      </div>
    </>
  );
}