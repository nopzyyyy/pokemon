import React from 'react';
import { readDb } from '@/lib/db';
import Catalog from '@/components/Catalog';

// Disable static rendering to ensure database reads reflect immediate admin modifications
export const revalidate = 0;

export default function Home() {
  const db = readDb();
  // Filter out hidden products from catalog listings
  const visibleProducts = db.products.filter(p => !p.hidden);

  return (
    <div className="main-content">
      {/* Catalog Grid with Filters */}
      <Catalog initialProducts={visibleProducts} />
    </div>
  );
}
