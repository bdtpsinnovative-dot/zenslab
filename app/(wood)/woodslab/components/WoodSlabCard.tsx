'use client'
import React from 'react';
import { currency, normalizeImg, getEffectiveStatus, getSizeText, escClass, normalizeStatus } from '../utils';

interface WoodSlabCardProps {
  product: any;
  discountInfo: any;
}

export default function WoodSlabCard({ product, discountInfo }: WoodSlabCardProps) {
  const r = product;
  const imgPath = r.image_url || r.specs?.main_image?.path || r.specs?.main_image?.url;
  const img = normalizeImg(imgPath);
  const st = getEffectiveStatus(r);
  const displayName = (r.name && r.name !== "-") ? r.name : "ติดต่อสอบถาม";

  const renderBadge = (status: string) => {
    const s = normalizeStatus(status);
    if (!s || s === "available" || s === "pre_order") return null;

    const STATUS_BADGE: Record<string, any> = {
      on_stock: { text: "พร้อมส่ง (In Stock)", style: "pill" },
      on_request: { text: "มีคนกำลังสนใจ", style: "pill" },
      pending: { text: "BOOKED", jp: "Reserved", style: "circle" },
      sold: { text: "SOLD OUT", jp: "Sold", style: "circle" },
      reserved: { text: "RESERVED", style: "pill" },
      archived: { text: "ARCHIVE", style: "pill" },
      draft: { text: "DRAFT", style: "pill" },
    };
    const meta = STATUS_BADGE[s] || { text: s.toUpperCase(), style: "pill" };
    const cls = escClass(s);

    if (meta.style === "circle") {
      return (
        <div className="status-overlay">
          <div className={`status-circle ${cls}`}>
            {meta.jp && <div className="jp">{meta.jp}</div>}
            <div className="en">{meta.text}</div>
          </div>
        </div>
      );
    }
    return <div className={`badge-status badge-${cls}`}>{meta.text}</div>;
  };

  return (
    <a className="card" href={`/woodslab/product?id=${r.id}`}>
      <div className="img-wrap">
        {img ? <img loading="lazy" src={img} alt={displayName} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>No Image</div>}
        {renderBadge(st)}
      </div>
      <div className="card-info">
        <div className="card-name">{displayName}</div>
        <div className="card-meta">{getSizeText(r.specs, r)}</div>
        {discountInfo ? (
          <div className="card-price" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="price-old">{currency(r.price)}</span>
            <span className="price-new">{currency(discountInfo.newPrice)}</span>
            <span className="badge-discount">
              {discountInfo.discount_type === 'PERCENT' ? `-${parseFloat(discountInfo.value)}%` : `-${discountInfo.value}`}
            </span>
          </div>
        ) : (
          <div className="card-price">{r.price ? currency(r.price) : "ติดต่อสอบถาม"}</div>
        )}
      </div>
    </a>
  );
}