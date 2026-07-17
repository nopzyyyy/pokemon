'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Product } from '@/lib/db';
import { formatMoney } from '@/lib/currency';

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToCart, currency } = useCart();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
          setProduct(data.product);
          
          const allRes = await fetch('/api/products');
          const allData = await allRes.json();
          if (allRes.ok && allData.success) {
            const currentCat = data.product.category;
            const filtered = (allData.products as Product[])
              .filter(p => p.category === currentCat && p.id !== data.product.id)
              .slice(0, 4);
            setRelated(filtered);
          }
        } else {
          setProduct(null);
        }
      } catch (err) {
        console.error("Failed to load product details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    setActiveImageIdx(0);
    setQuantity(1);
    setIsDescriptionOpen(false);
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
        <div className="loader"></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading collectible details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2 style={{ marginBottom: 16 }}>Product Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>The collectible you are looking for does not exist or has been removed.</p>
        <Link href="/" className="btn btn-primary">Back to Shop</Link>
      </div>
    );
  }

  // Active prices based on store currency
  const activePrice = currency === 'USD' ? product.price_usd : product.price_cad;
  const hasDiscount = product.discount && product.discount > 0;
  const finalPrice = hasDiscount 
    ? activePrice * (1 - product.discount! / 100) 
    : activePrice;

  const allImages = product.local_images && product.local_images.length > 0
    ? product.local_images
    : (product.img_urls && product.img_urls.length > 0 ? product.img_urls : ['/placeholder.webp']);

  const activeImage = allImages[activeImageIdx] || '/placeholder.webp';

  return (
    <div className="container" style={{ padding: '40px 24px' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to Shop
      </Link>

      <div className="detail-grid">
        {/* Gallery */}
        <div className="detail-gallery">
          <div className="detail-main-img">
            <img src={activeImage} alt={product.name} />
          </div>

          {allImages.length > 1 && (
            <div className="detail-thumbs">
              {allImages.map((img, idx) => (
                <div 
                  key={idx} 
                  className={`detail-thumb ${idx === activeImageIdx ? 'active' : ''}`}
                  onClick={() => setActiveImageIdx(idx)}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Details info */}
        <div className="detail-meta">
          <div className="detail-category">{product.category || 'Gaming Cards'}</div>
          <h1 className="detail-title">{product.name}</h1>
          
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {hasDiscount && (
              <span style={{ padding: '4px 8px', background: 'var(--accent-primary)', color: '#ffffff', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                SAVE {product.discount}%
              </span>
            )}
          </div>

          <div className="detail-price-row">
            <span className="detail-price">{formatMoney(finalPrice, currency)}</span>
            {hasDiscount && (
              <span className="detail-original-price">{formatMoney(activePrice, currency)}</span>
            )}
          </div>

          <h3 className="detail-desc-title">Description</h3>
          <div
            id="product-detail-description"
            className={`detail-desc ${isDescriptionOpen ? 'expanded' : ''}`}
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {product.description}
          </div>
          <button
            type="button"
            className="detail-description-toggle"
            aria-expanded={isDescriptionOpen}
            aria-controls="product-detail-description"
            onClick={() => setIsDescriptionOpen((current) => !current)}
          >
            {isDescriptionOpen ? 'See less' : 'See full description'}
          </button>

          <div className="detail-actions" style={{ marginTop: 24 }}>
            <div className="detail-qty-select">
              <button className="detail-qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
              <span className="detail-qty-val">{quantity}</span>
              <button className="detail-qty-btn" onClick={() => setQuantity(q => q + 1)}>+</button>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: 12, borderRadius: 4 }}
              onClick={() => addToCart({
                id: product.id,
                name: product.name,
                priceUsd: product.price_usd,
                priceCad: product.price_cad,
                image: allImages[0] || '/placeholder.webp',
                vendor: product.vendor
              }, quantity)}
            >
              Add to Shopping Cart
            </button>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div style={{ marginTop: 80, borderTop: '1px solid var(--border-light)', paddingTop: 40 }}>
          <h2 style={{ marginBottom: 24, fontSize: 20 }} className="text-gradient">Related Collectibles</h2>
          <div className="products-grid">
            {related.map(prod => {
              const relHasDiscount = prod.discount && prod.discount > 0;
              const relActivePrice = currency === 'USD' ? prod.price_usd : prod.price_cad;
              const relFinalPrice = relHasDiscount 
                ? relActivePrice * (1 - prod.discount! / 100) 
                : relActivePrice;
              const relImage = prod.local_images && prod.local_images.length > 0 
                ? prod.local_images[0] 
                : (prod.img_urls && prod.img_urls.length > 0 ? prod.img_urls[0] : '/placeholder.webp');

              return (
                <div key={prod.id} className="product-card">
                  <Link href={`/product/${prod.id}`} className="product-image-container" style={{ border: '1px solid var(--border-light)' }}>
                    <img src={relImage} alt={prod.name} className="product-card-image" />
                    {relHasDiscount && <span className="product-discount-tag" style={{ fontSize: 9 }}>-{prod.discount}%</span>}
                  </Link>
                  <div className="product-info">
                    <Link href={`/product/${prod.id}`}>
                      <h4 className="product-name" style={{ height: 38, fontSize: 13 }}>{prod.name}</h4>
                    </Link>
                    <div className="product-price-row">
                      <span className="product-price" style={{ fontSize: 14 }}>{formatMoney(relFinalPrice, currency)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
