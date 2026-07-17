'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Product, Coupon, Order } from '@/lib/db';
import { convertCadToUsd, formatMoney } from '@/lib/currency';

type AdminTab = 'products' | 'coupons' | 'orders';

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [fetchingData, setFetchingData] = useState(true);

  // Modal forms states
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({
    id: '', // Empty for creation
    name: '',
    price_usd: '',
    price_cad: '',
    description: '',
    category: 'Gaming Cards',
    vendor: 'TCGORA',
    discount: '0',
    hidden: false,
    imageInput: ''
  });

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'percentage',
    value: '',
    minOrderValue: ''
  });

  // Access validation
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadAdminData = async () => {
    setFetchingData(true);
    try {
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      if (prodRes.ok && prodData.success) {
        setProducts(prodData.products);
      }

      const coupRes = await fetch('/api/discounts');
      const coupData = await coupRes.json();
      if (coupRes.ok && coupData.success) {
        setCoupons(coupData.coupons);
      }

      const ordRes = await fetch('/api/orders');
      const ordData = await ordRes.json();
      if (ordRes.ok && ordData.success) {
        setOrders(ordData.orders);
      }
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

  const toggleVisibility = async (id: string, currentlyHidden: boolean) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !currentlyHidden })
      });
      if (res.ok) {
        setProducts(prev => 
          prev.map(p => p.id === id ? { ...p, hidden: !currentlyHidden } : p)
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Inline pricing edits
  const updateProductPriceCad = async (id: string, newPriceStr: string) => {
    const parsed = parseFloat(newPriceStr);
    if (isNaN(parsed) || parsed < 0) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_cad: parsed })
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(prev =>
          prev.map(p => p.id === id ? data.product : p)
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save product (Add or Edit)
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price_cad) return;

    const payload = {
      name: productForm.name,
      price_usd: convertCadToUsd(parseFloat(productForm.price_cad)),
      price_cad: parseFloat(productForm.price_cad),
      description: productForm.description,
      category: productForm.category,
      vendor: productForm.vendor,
      discount: parseInt(productForm.discount) || 0,
      hidden: productForm.hidden,
      local_images: productForm.imageInput ? [productForm.imageInput] : ['/placeholder.webp']
    };

    try {
      let res;
      if (productForm.id) {
        res = await fetch(`/api/products/${productForm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowProductModal(false);
        loadAdminData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to save product.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error saving product.");
    }
  };

  const openEditProduct = (prod: Product) => {
    setProductForm({
      id: prod.id,
      name: prod.name,
      price_usd: prod.price_usd ? prod.price_usd.toString() : (prod.price || 0).toString(),
      price_cad: prod.price_cad ? prod.price_cad.toString() : ((prod.price || 0) * 1.35).toString(),
      description: prod.description || '',
      category: prod.category || 'Gaming Cards',
      vendor: prod.vendor || 'TCGORA',
      discount: (prod.discount || 0).toString(),
      hidden: !!prod.hidden,
      imageInput: prod.local_images && prod.local_images.length > 0 ? prod.local_images[0] : ''
    });
    setShowProductModal(true);
  };

  const openNewProduct = () => {
    setProductForm({
      id: '',
      name: '',
      price_usd: '',
      price_cad: '',
      description: '',
      category: 'Gaming Cards',
      vendor: 'TCGORA',
      discount: '0',
      hidden: false,
      imageInput: ''
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this product?")) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        alert("Failed to delete product.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCoupon = async (code: string, currentlyActive: boolean) => {
    try {
      const res = await fetch('/api/discounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, active: !currentlyActive })
      });
      if (res.ok) {
        setCoupons(prev => 
          prev.map(c => c.code === code ? { ...c, active: !currentlyActive } : c)
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`Are you sure you want to delete promo code ${code}?`)) return;

    try {
      const res = await fetch(`/api/discounts?code=${code}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCoupons(prev => prev.filter(c => c.code !== code));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code || !couponForm.value) return;

    const payload = {
      code: couponForm.code.toUpperCase(),
      type: couponForm.type,
      value: parseFloat(couponForm.value),
      minOrderValue: couponForm.minOrderValue ? parseFloat(couponForm.minOrderValue) : undefined
    };

    try {
      const res = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowCouponModal(false);
        setCouponForm({ code: '', type: 'percentage', value: '', minOrderValue: '' });
        loadAdminData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create coupon");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar navigation controls */}
      <aside className="admin-sidebar">
        <h3 style={{ padding: '0 12px', marginBottom: 16, fontSize: 13, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Dashboard</h3>
        <button 
          className={`admin-sidebar-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
        <button 
          className={`admin-sidebar-btn ${activeTab === 'coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('coupons')}
        >
          Promo coupons
        </button>
        <button 
          className={`admin-sidebar-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <div style={{ marginTop: 'auto', padding: '0 12px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Logged in as: <br /><strong>{user.username}</strong>
          </p>
          <button 
            onClick={logout} 
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '6px 12px', fontSize: 11, marginTop: 12, borderRadius: 4 }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Tab Panels */}
      <main className="admin-content">
        {fetchingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', flexDirection: 'column', gap: 12 }}>
            <div className="loader"></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Syncing vault database...</p>
          </div>
        ) : (
          <>
            {activeTab === 'products' && (
              <div>
                <div className="admin-header-row">
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700 }}>Products Inventory</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Set CAD prices; USD is converted automatically using the current store rate</p>
                  </div>
                  <button className="btn btn-primary" style={{ borderRadius: 4 }} onClick={openNewProduct}>
                    + Add New Product
                  </button>
                </div>

                <div className="glass-panel" style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price USD ($)</th>
                        <th>Price CAD ($)</th>
                        <th>Discount</th>
                        <th>Visibility</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(prod => (
                        <tr key={prod.id}>
                          <td>
                            <div style={{ width: 44, height: 44, background: '#ffffff', border: '1px solid var(--border-light)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img 
                                src={prod.local_images && prod.local_images.length > 0 ? prod.local_images[0] : (prod.img_urls && prod.img_urls.length > 0 ? prod.img_urls[0] : '/placeholder.webp')} 
                                alt={prod.name} 
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                              />
                            </div>
                          </td>
                          <td style={{ fontWeight: 600, fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={prod.name}>
                            {prod.name}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{prod.category}</td>
                          
                          {/* Price USD Input */}
                          <td>
                            <span style={{ fontSize: 12, fontWeight: 650 }}>${prod.price_usd}</span>
                          </td>

                          {/* Price CAD Input */}
                          <td>
                            <input 
                              type="number" 
                              step="0.01"
                              className="form-input" 
                              style={{ width: 85, padding: '6px 8px', fontSize: 12 }}
                              defaultValue={prod.price_cad}
                              onBlur={(e) => updateProductPriceCad(prod.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateProductPriceCad(prod.id, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                            />
                          </td>

                          <td style={{ fontSize: 12 }}>{prod.discount || 0}%</td>
                          <td>
                            <button 
                              className={`btn ${prod.hidden ? 'btn-danger' : 'btn-secondary'}`}
                              style={{ padding: '4px 10px', fontSize: 11, borderRadius: 20 }}
                              onClick={() => toggleVisibility(prod.id, !!prod.hidden)}
                            >
                              {prod.hidden ? 'Hidden' : 'Visible'}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 11, borderRadius: 4 }} onClick={() => openEditProduct(prod)}>
                                Edit
                              </button>
                              <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 11, borderRadius: 4 }} onClick={() => handleDeleteProduct(prod.id)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'coupons' && (
              <div>
                <div className="admin-header-row">
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700 }}>Promo Discount Coupons</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Create and activate discount promo codes for checkouts</p>
                  </div>
                  <button className="btn btn-primary" style={{ borderRadius: 4 }} onClick={() => setShowCouponModal(true)}>
                    + Create Promo Code
                  </button>
                </div>

                <div className="glass-panel" style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Promo Code</th>
                        <th>Discount Type</th>
                        <th>Value</th>
                        <th>Min Order Required</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map(coup => (
                        <tr key={coup.code}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 14, color: 'var(--accent-primary)' }}>
                            {coup.code}
                          </td>
                          <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{coup.type}</td>
                          <td style={{ fontWeight: 600 }}>
                            {coup.type === 'percentage' ? `${coup.value}%` : `$${coup.value.toFixed(2)}`}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {coup.minOrderValue ? `$${coup.minOrderValue.toFixed(2)}` : 'None'}
                          </td>
                          <td>
                            <button 
                              className={`btn ${coup.active ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '4px 10px', fontSize: 11, borderRadius: 20 }}
                              onClick={() => toggleCoupon(coup.code, coup.active)}
                            >
                              {coup.active ? 'Active' : 'Disabled'}
                            </button>
                          </td>
                          <td>
                            <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 11, borderRadius: 4 }} onClick={() => handleDeleteCoupon(coup.code)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <div className="admin-header-row">
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700 }}>Orders Invoice Log</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>View customer orders and crypto payment receipts</p>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', borderRadius: 8 }} className="glass-panel">
                    <p>No orders have been submitted yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {orders.map(order => (
                      <div key={order.id} className="glass-panel" style={{ padding: 20, border: '1px solid var(--border-light)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 12, marginBottom: 12 }}>
                          <div>
                            <h3 style={{ fontSize: 14, color: 'var(--accent-primary)', fontWeight: 'bold' }}>ID: {order.id}</h3>
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(order.createdAt).toLocaleString()}</p>
                          </div>
                          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                            <span style={{ padding: '3px 8px', fontSize: 11, background: '#e6fffa', border: '1px solid #b2f5ea', color: '#008170', fontWeight: 'bold' }}>
                              Confirmed
                            </span>
                            <p style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>
                              Total: {formatMoney(order.total, order.currency)}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
                          <div>
                            <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700 }}>Items Purchased</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {order.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                  <div style={{ width: 32, height: 32, border: '1px solid var(--border-light)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img src={item.image} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatMoney(item.price, order.currency)} x {item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: 20 }}>
                            <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 700 }}>Shipping Info</h4>
                            <p style={{ fontSize: 12, fontWeight: 'bold' }}>{order.shippingAddress.fullName}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{order.shippingAddress.email}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{order.shippingAddress.address}, {order.shippingAddress.city}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{order.shippingAddress.postalCode}, {order.shippingAddress.country}</p>

                            <h4 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: 12, marginBottom: 4, fontWeight: 700 }}>Crypto Details</h4>
                            <p style={{ fontSize: 11 }}>Coin Paid: <strong>{order.paymentDetails?.currency}</strong></p>
                            <p style={{ fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--text-secondary)', marginTop: 2 }}>
                              TxHash: {order.paymentDetails?.txHash}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Product Add/Edit Modal */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {productForm.id ? 'Edit Collectible Product' : 'Add New Collectible Product'}
            </h3>
            <form onSubmit={handleProductSubmit}>
              <div className="form-group">
                <label className="form-label">Product Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Price USD Input */}
                <div className="form-group">
                  <label className="form-label">Price USD ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    value={productForm.price_cad ? convertCadToUsd(parseFloat(productForm.price_cad) || 0) : ''}
                    readOnly
                    aria-describedby="usd-price-help"
                  />
                  <p id="usd-price-help" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Converted automatically from CAD</p>
                </div>
                {/* Price CAD Input */}
                <div className="form-group">
                  <label className="form-label">Price CAD ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    value={productForm.price_cad}
                    onChange={(e) => setProductForm({
                      ...productForm,
                      price_cad: e.target.value,
                      price_usd: e.target.value ? convertCadToUsd(parseFloat(e.target.value) || 0).toString() : '',
                    })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-input"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option value="Gaming Cards">Gaming Cards</option>
                    <option value="Card Games">Card Games</option>
                    <option value="Card Game Accessories">Card Game Accessories</option>
                    <option value="Uncategorized">Uncategorized</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Percentage</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="99" 
                    className="form-input" 
                    value={productForm.discount}
                    onChange={(e) => setProductForm({ ...productForm, discount: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Vendor</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={productForm.vendor}
                  onChange={(e) => setProductForm({ ...productForm, vendor: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mock Image File Path (Relative)</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. /images/product_0_0.webp"
                  value={productForm.imageInput}
                  onChange={(e) => setProductForm({ ...productForm, imageInput: e.target.value })}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Leave blank to default to generic card placeholder</p>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input 
                  type="checkbox" 
                  id="hidden" 
                  checked={productForm.hidden}
                  onChange={(e) => setProductForm({ ...productForm, hidden: e.target.checked })}
                />
                <label htmlFor="hidden" style={{ fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Hide product from catalog listings</label>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, borderRadius: 4 }} onClick={() => setShowProductModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, borderRadius: 4 }}>
                  Save Collectible
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="modal-overlay" onClick={() => setShowCouponModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Create Promo Code</h3>
            <form onSubmit={handleCouponSubmit}>
              <div className="form-group">
                <label className="form-label">Promo Code</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. SAVE15"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Discount Type</label>
                <select 
                  className="form-input"
                  value={couponForm.type}
                  onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
                >
                  <option value="percentage">Percentage Off (%)</option>
                  <option value="flat">Flat Amount Off ($)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Discount Value</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    placeholder="e.g. 15 or 10.00"
                    value={couponForm.value}
                    onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Order Value Required ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    placeholder="e.g. 100.00 (Optional)"
                    value={couponForm.minOrderValue}
                    onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, borderRadius: 4 }} onClick={() => setShowCouponModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, borderRadius: 4 }}>
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
