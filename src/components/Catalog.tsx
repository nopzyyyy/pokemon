'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Product } from '@/lib/db';
import { formatMoney } from '@/lib/currency';

interface CatalogProps {
  initialProducts: Product[];
}

function getProductImages(product: Product) {
  const images = [...(product.local_images || []), ...(product.img_urls || [])];
  return Array.from(new Set(images.filter(Boolean)));
}

function ProductCard({ product }: { product: Product }) {
  const { addToCart, currency } = useCart();
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [addState, setAddState] = useState<'idle' | 'loading' | 'added'>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const images = getProductImages(product);
  const primaryImage = images[0] || '/placeholder.webp';
  const secondaryImage = images[1];
  const activePrice = currency === 'USD' ? product.price_usd : product.price_cad;
  const hasDiscount = Boolean(product.discount && product.discount > 0);
  const finalPrice = hasDiscount
    ? activePrice * (1 - product.discount! / 100)
    : activePrice;
  const isSoldOut = /umbreon ex|espeon ex/i.test(product.name);
  const isPreorder = product.name.toLowerCase().includes('pre-order');
  const descriptionId = `product-description-${product.id}`;

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const handleAddToCart = async () => {
    if (isSoldOut || addState === 'loading') return;

    setAddState('loading');
    await new Promise((resolve) => setTimeout(resolve, 380));
    addToCart({
      id: product.id,
      name: product.name,
      priceUsd: product.price_usd,
      priceCad: product.price_cad,
      image: primaryImage,
      vendor: product.vendor,
    });
    setAddState('added');
    resetTimer.current = setTimeout(() => setAddState('idle'), 1800);
  };

  return (
    <article className={`product-card ${secondaryImage ? 'has-secondary-image' : ''}`}>
      <Link href={`/product/${product.id}`} className="product-image-container">
        <img
          src={primaryImage}
          alt={product.name}
          className="product-card-image product-card-image-primary"
        />
        {secondaryImage && (
          <img
            src={secondaryImage}
            alt=""
            aria-hidden="true"
            className="product-card-image product-card-image-secondary"
          />
        )}
        {isPreorder && <span className="product-tag">Pre-order</span>}
        {isSoldOut && <span className="product-tag product-tag-right">Sold out</span>}
        {hasDiscount && !isSoldOut && (
          <span className="product-discount-tag">-{product.discount}%</span>
        )}
      </Link>

      <div className="product-info">
        <Link href={`/product/${product.id}`}>
          <h3 className="product-name">{product.name}</h3>
        </Link>

        <div className="product-price-row">
          <span className="product-price">{formatMoney(finalPrice, currency)}</span>
          {hasDiscount && (
            <span className="product-original-price">{formatMoney(activePrice, currency)}</span>
          )}
        </div>

        <div className="product-description-wrap">
          <p
            id={descriptionId}
            className={`product-description ${isDescriptionOpen ? 'expanded' : ''}`}
          >
            {product.description || 'No description available.'}
          </p>
          <button
            type="button"
            className="description-toggle"
            aria-expanded={isDescriptionOpen}
            aria-controls={descriptionId}
            onClick={() => setIsDescriptionOpen((current) => !current)}
          >
            {isDescriptionOpen ? 'See less' : 'See more'}
          </button>
        </div>

        <button
          type="button"
          className="product-add-button"
          onClick={handleAddToCart}
          disabled={isSoldOut || addState === 'loading'}
        >
          {addState === 'loading' && <span className="button-spinner" aria-hidden="true" />}
          {isSoldOut ? 'Out of stock' : addState === 'loading' ? 'Adding' : addState === 'added' ? 'Added' : 'Add to cart'}
        </button>
        {addState === 'added' && (
          <div className="cart-toast" role="status" aria-live="polite">
            <span className="toast-check" aria-hidden="true" />
            Added to cart
          </div>
        )}
      </div>
    </article>
  );
}

function CatalogContent({ initialProducts }: CatalogProps) {
  const { currency } = useCart();
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get('category');
  const urlPreorder = searchParams.get('preorder');
  const urlShowFilters = searchParams.get('showFilters');
  const urlSearch = searchParams.get('search');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(600);

  useEffect(() => {
    setCategory(urlCategory || 'All');
    if (urlCategory && urlCategory !== 'All') {
      setSearch('');
    }
  }, [urlCategory]);

  useEffect(() => {
    if (urlSearch) {
      setSearch(urlSearch);
      setShowFilters(true);
    } else {
      setSearch('');
    }
  }, [urlSearch]);

  useEffect(() => {
    if (urlShowFilters === 'true') setShowFilters(true);
  }, [urlShowFilters]);

  const categories = useMemo(() => {
    const values = new Set(initialProducts.map((product) => product.category).filter(Boolean));
    return ['All', ...Array.from(values)];
  }, [initialProducts]);

  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((product) =>
        product.name.toLowerCase().includes(query)
        || product.description.toLowerCase().includes(query)
      );
    }

    if (category !== 'All') {
      result = result.filter((product) => product.category === category);
    }

    if (urlPreorder === 'true') {
      result = result.filter((product) => product.name.toLowerCase().includes('pre-order'));
    }

    result = result.filter((product) => {
      const price = currency === 'USD' ? product.price_usd : product.price_cad;
      return price * (1 - (product.discount || 0) / 100) <= maxPrice;
    });

    if (sortBy === 'price-asc' || sortBy === 'price-desc') {
      result.sort((a, b) => {
        const aPrice = (currency === 'USD' ? a.price_usd : a.price_cad) * (1 - (a.discount || 0) / 100);
        const bPrice = (currency === 'USD' ? b.price_usd : b.price_cad) * (1 - (b.discount || 0) / 100);
        return sortBy === 'price-asc' ? aPrice - bPrice : bPrice - aPrice;
      });
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [initialProducts, search, category, urlPreorder, sortBy, maxPrice, currency]);

  const resetFilters = () => {
    setSearch('');
    setCategory('All');
    setMaxPrice(currency === 'USD' ? 600 : 800);
  };

  return (
    <div className="container catalog-container">
      <div className="filter-row">
        <button
          type="button"
          className="filter-btn-toggle"
          aria-expanded={showFilters}
          onClick={() => setShowFilters((current) => !current)}
        >
          <span className="filter-icon" aria-hidden="true" />
          {showFilters ? 'Hide filters' : 'Filters'}
        </button>

        <label className="sort-control">
          <span>Sort by</span>
          <select
            className="select-filter"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="name">Alphabetical</option>
          </select>
        </label>
      </div>

      <div className={`catalog-layout ${showFilters ? 'with-sidebar' : ''}`}>
        {showFilters && (
          <aside className="catalog-sidebar">
            <div>
              <h4 className="sidebar-section-title">Search</h4>
              <input
                type="search"
                placeholder="Search products"
                className="form-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div>
              <h4 className="sidebar-section-title">Categories</h4>
              <ul className="sidebar-list">
                {categories.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      className={`sidebar-item ${category === item ? 'active' : ''}`}
                      onClick={() => setCategory(item)}
                    >
                      {item === 'All' ? 'All collectibles' : item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="sidebar-section-title">Maximum price</h4>
              <div className="price-range-labels">
                <span>$0</span>
                <strong>${maxPrice} {currency}</strong>
              </div>
              <input
                type="range"
                min="0"
                max={currency === 'USD' ? 600 : 800}
                step="10"
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
              />
            </div>
          </aside>
        )}

        <div className="catalog-results">
          {filteredProducts.length === 0 ? (
            <div className="catalog-empty">
              <p>No collectibles match those filters.</p>
              <button type="button" className="btn btn-secondary" onClick={resetFilters}>
                Reset filters
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Catalog({ initialProducts }: CatalogProps) {
  return (
    <Suspense fallback={<div className="catalog-loading"><div className="loader" /></div>}>
      <CatalogContent initialProducts={initialProducts} />
    </Suspense>
  );
}
