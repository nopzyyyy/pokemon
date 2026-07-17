'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { formatMoney } from '@/lib/currency';

const WALLETS = {
  BTC: 'bc1qxy2kg3ut5xg7262895628957297592875928',
  ETH: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  USDC: '0x9571C7656EC7ab88b098defB751B7401B5f6d8976F',
  SOL: 'HN7cAB1R3M2A6K28c3857c8585c8395729572957'
};

export default function Checkout() {
  const { cart, currency, getCartSubtotal, getDiscountAmount, getCartTotal, appliedCoupon, applyCouponCode, removeCoupon, clearCart } = useCart();
  const router = useRouter();

  const [step, setStep] = useState<'shipping' | 'payment-method' | 'processing' | 'success'>('shipping');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  
  const [shipping, setShipping] = useState({
    fullName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Canada'
  });

  const [selectedCoin, setSelectedCoin] = useState<'BTC' | 'ETH' | 'USDC' | 'SOL'>('USDC');
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(900);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (step !== 'processing') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setStep('payment-method');
          return 900;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step !== 'processing') return;

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          submitOrder();
          return 100;
        }
        return prev + 10; // Confirmation simulation in ~5 seconds
      });
    }, 500);

    return () => clearInterval(progressTimer);
  }, [step]);

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setShipping({
      ...shipping,
      [e.target.name]: e.target.value
    });
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment-method');
  };

  const handleApplyPromo = async () => {
    setPromoError('');
    setPromoSuccess('');
    if (!promoCode.trim()) return;

    const res = await applyCouponCode(promoCode);
    if (res.success) {
      setPromoSuccess(res.message);
      setPromoCode('');
    } else {
      setPromoError(res.message);
    }
  };

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(WALLETS[selectedCoin]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitOrder = async () => {
    const mockTxHash = '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const orderData = {
      items: cart.map(item => ({
        productId: item.id,
        name: item.name,
        price: currency === 'USD' ? item.priceUsd : item.priceCad,
        quantity: item.quantity,
        image: item.image
      })),
      shippingAddress: shipping,
      paymentMethod: 'Crypto',
      paymentDetails: {
        txHash: mockTxHash,
        walletAddress: WALLETS[selectedCoin],
        currency: selectedCoin
      },
      subtotal: getCartSubtotal(),
      discount: getDiscountAmount(),
      total: getCartTotal(),
      currency: currency // Send active currency (USD or CAD)
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCreatedOrder(data.order);
        clearCart();
        setStep('success');
      } else {
        alert("Failed to submit order. Re-routing back.");
        setStep('payment-method');
      }
    } catch (e) {
      console.error(e);
      alert("Error submitting order.");
      setStep('payment-method');
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const checkoutStepIndex = step === 'shipping' ? 1 : step === 'payment-method' ? 2 : 3;

  if (cart.length === 0 && step !== 'success') {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2 style={{ marginBottom: 16 }}>Your Shopping Cart is Empty</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Add some collectibles before attempting checkout.</p>
        <Link href="/" className="btn btn-primary" style={{ borderRadius: 4 }}>Go to Catalog</Link>
      </div>
    );
  }

  return (
    <div className="container checkout-page" style={{ padding: '40px 24px' }}>
      {/* Progress */}
      <div className="checkout-progress" aria-label="Checkout progress">
        <div
          className={`checkout-step ${checkoutStepIndex === 1 ? 'active' : ''} ${checkoutStepIndex > 1 ? 'completed' : ''}`}
          aria-current={checkoutStepIndex === 1 ? 'step' : undefined}
        >
          <div className="checkout-step-num">{checkoutStepIndex > 1 ? <span className="check-mark" aria-hidden="true" /> : '1'}</div>
          <span className="checkout-step-label">Shipping</span>
        </div>
        <div className={`checkout-progress-line ${checkoutStepIndex > 1 ? 'filled' : ''}`} aria-hidden="true" />
        <div
          className={`checkout-step ${checkoutStepIndex === 2 ? 'active' : ''} ${checkoutStepIndex > 2 ? 'completed' : ''}`}
          aria-current={checkoutStepIndex === 2 ? 'step' : undefined}
        >
          <div className="checkout-step-num">{checkoutStepIndex > 2 ? <span className="check-mark" aria-hidden="true" /> : '2'}</div>
          <span className="checkout-step-label">Payment</span>
        </div>
        <div className={`checkout-progress-line ${checkoutStepIndex > 2 ? 'filled' : ''}`} aria-hidden="true" />
        <div
          className={`checkout-step ${checkoutStepIndex === 3 ? 'active' : ''} ${step === 'success' ? 'completed' : ''}`}
          aria-current={checkoutStepIndex === 3 ? 'step' : undefined}
        >
          <div className="checkout-step-num">{step === 'success' ? <span className="check-mark" aria-hidden="true" /> : '3'}</div>
          <span className="checkout-step-label">Confirmation</span>
        </div>
      </div>

      <div className="checkout-grid">
        {/* Actions */}
        <div>
          {step === 'shipping' && (
            <div className="form-card" style={{ maxWidth: '100%', padding: '32px' }}>
              <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 700 }}>Shipping & Delivery</h2>
              <form onSubmit={handleShippingSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    name="fullName"
                    value={shipping.fullName}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    className="form-input" 
                    type="email" 
                    name="email"
                    value={shipping.email}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    name="address"
                    value={shipping.address}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
                <div className="checkout-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input 
                      className="form-input" 
                      type="text" 
                      name="city"
                      value={shipping.city}
                      onChange={handleShippingChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Postal / Zip Code</label>
                    <input 
                      className="form-input" 
                      type="text" 
                      name="postalCode"
                      value={shipping.postalCode}
                      onChange={handleShippingChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <select 
                    className="form-input" 
                    name="country"
                    value={shipping.country}
                    onChange={handleShippingChange}
                  >
                    <option value="Canada">Canada</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14, borderRadius: 4 }}>
                  Proceed to Payment Options
                </button>
              </form>
            </div>
          )}

          {step === 'payment-method' && (
            <div className="form-card" style={{ maxWidth: '100%', padding: '32px' }}>
              <h2 style={{ marginBottom: 4, fontSize: 20, fontWeight: 700 }}>Choose Payment Coin</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>Select the cryptocurrency you want to pay with</p>

              <div className="crypto-selector">
                {(['USDC', 'SOL', 'ETH', 'BTC'] as const).map(coin => (
                  <div 
                    key={coin} 
                    className={`crypto-option ${selectedCoin === coin ? 'active' : ''}`}
                    onClick={() => setSelectedCoin(coin)}
                  >
                    <div className="crypto-logo">
                      {coin === 'BTC' && 'B'}
                      {coin === 'ETH' && 'E'}
                      {coin === 'USDC' && 'U'}
                      {coin === 'SOL' && 'S'}
                    </div>
                    <span className="crypto-symbol">{coin}</span>
                    <span className="crypto-name">
                      {coin === 'BTC' && 'Bitcoin'}
                      {coin === 'ETH' && 'Ethereum'}
                      {coin === 'USDC' && 'USD Coin'}
                      {coin === 'SOL' && 'Solana'}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ padding: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 4, marginBottom: 24, fontSize: 13 }}>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: 6, fontWeight: 700 }}>Simulation terminal</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Copy the wallet address and pay. The block confirmations will auto-verify your transfer in 5 seconds.</p>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn btn-secondary" style={{ flex: 0.4, borderRadius: 4 }} onClick={() => setStep('shipping')}>
                  Go Back
                </button>
                <button className="btn btn-primary" style={{ flex: 1, padding: 14, borderRadius: 4 }} onClick={() => setStep('processing')}>
                  Pay Invoice via {selectedCoin}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="form-card" style={{ maxWidth: '100%', padding: '32px', textAlign: 'center', borderColor: 'var(--accent-primary)' }}>
              <h2 style={{ marginBottom: 4, fontWeight: 700 }}>Awaiting Confirmation</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>Send exact invoice amount to the wallet below</p>

              <div className="timer">{formatTime(timeLeft)}</div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '24px 0' }}>
                <svg className="qr-code-placeholder" viewBox="0 0 100 100" style={{ border: '1px solid var(--border-light)', width: 160, height: 160, padding: 10 }}>
                  <rect x="0" y="0" width="25" height="25" fill="#000" />
                  <rect x="5" y="5" width="15" height="15" fill="#fff" />
                  <rect x="9" y="9" width="7" height="7" fill="#000" />
                  
                  <rect x="75" y="0" width="25" height="25" fill="#000" />
                  <rect x="80" y="5" width="15" height="15" fill="#fff" />
                  <rect x="84" y="9" width="7" height="7" fill="#000" />

                  <rect x="0" y="75" width="25" height="25" fill="#000" />
                  <rect x="5" y="80" width="15" height="15" fill="#fff" />
                  <rect x="9" y="84" width="7" height="7" fill="#000" />

                  <rect x="35" y="10" width="10" height="5" fill="#000" />
                  <rect x="50" y="20" width="15" height="20" fill="#000" />
                  <rect x="30" y="45" width="20" height="10" fill="#000" />
                  <rect x="60" y="55" width="10" height="25" fill="#000" />
                  <rect x="40" y="70" width="25" height="5" fill="#000" />
                  <rect x="85" y="85" width="15" height="15" fill="#000" />
                </svg>

                <p style={{ fontSize: 13, fontWeight: 700, margin: '16px 0 6px 0', color: 'var(--text-secondary)' }}>
                  Wallet Address ({selectedCoin}):
                </p>
                <div className="wallet-address-container" style={{ borderRadius: 4 }}>
                  <span className="wallet-address" style={{ fontSize: 12 }}>{WALLETS[selectedCoin]}</span>
                  <button className="copy-btn" onClick={handleCopyWallet}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div style={{ width: '100%', maxWidth: '440px', marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'between', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    <span>Transaction Confirming:</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>{progress}%</span>
                  </div>
                  <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.3s' }}></div>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Connecting to nodes... Do not close the window.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && createdOrder && (
            <div className="form-card" style={{ maxWidth: '100%', padding: '32px', textAlign: 'center', borderColor: '#10b981' }}>
              <div className="success-check"><span className="check-mark" aria-hidden="true" /></div>
              <h2 style={{ marginBottom: 8, fontWeight: 700 }}>Order Placed!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                Payment of <strong>{formatMoney(createdOrder.total, createdOrder.currency)}</strong> via {createdOrder.paymentDetails?.currency} confirmed.
              </p>

              <div style={{ textAlign: 'left', padding: 20, marginBottom: 24, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 4 }}>
                <p style={{ fontSize: 13, marginBottom: 8 }}><strong>Order ID:</strong> {createdOrder.id}</p>
                <p style={{ fontSize: 13, marginBottom: 8 }}><strong>Date:</strong> {new Date(createdOrder.createdAt).toLocaleString()}</p>
                <p style={{ fontSize: 13, marginBottom: 8 }}><strong>Recipient:</strong> {createdOrder.shippingAddress?.fullName}</p>
                <p style={{ fontSize: 13, marginBottom: 8 }}><strong>Email:</strong> {createdOrder.shippingAddress?.email}</p>
                <p style={{ fontSize: 13, marginBottom: 8 }}><strong>Address:</strong> {createdOrder.shippingAddress?.address}, {createdOrder.shippingAddress?.city}</p>
                <p style={{ fontSize: 13, borderTop: '1px solid var(--border-light)', paddingTop: 8, marginTop: 8 }}>
                  <strong>Tx Hash:</strong> <span style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', color: 'var(--text-secondary)' }}>{createdOrder.paymentDetails?.txHash}</span>
                </p>
              </div>

              <Link href="/" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: 4 }}>
                Continue Shopping
              </Link>
            </div>
          )}
        </div>

        {/* Order Summary */}
        {step !== 'success' && (
          <div className="form-card" style={{ maxWidth: '100%', padding: '24px', height: 'fit-content' }}>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Order Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid var(--border-light)', paddingBottom: 20, marginBottom: 20 }}>
              {cart.map(item => {
                const activePrice = currency === 'USD' ? item.priceUsd : item.priceCad;
                return (
                  <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, border: '1px solid var(--border-light)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={item.image} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</h4>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatMoney(activePrice, currency)} x {item.quantity}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {formatMoney(activePrice * item.quantity, currency)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Promo Code */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  placeholder="Promo Code" 
                  className="form-input" 
                  style={{ flex: 1 }}
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  disabled={!!appliedCoupon}
                />
                {appliedCoupon ? (
                  <button className="btn btn-danger" style={{ padding: '0 12px', borderRadius: 4 }} onClick={removeCoupon}>Remove</button>
                ) : (
                  <button className="btn btn-secondary" style={{ padding: '0 16px', borderRadius: 4 }} onClick={handleApplyPromo}>Apply</button>
                )}
              </div>
              {promoError && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{promoError}</p>}
              {promoSuccess && <p style={{ fontSize: 12, color: '#10b981', marginTop: 6 }}>{promoSuccess}</p>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span style={{ marginLeft: 'auto' }}>{formatMoney(getCartSubtotal(), currency)}</span>
              </div>
              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'between', fontSize: 13, color: '#10b981' }}>
                  <span>Discount ({appliedCoupon.code})</span>
                  <span style={{ marginLeft: 'auto' }}>-{formatMoney(getDiscountAmount(), currency)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
                <span style={{ marginLeft: 'auto', color: '#10b981', fontWeight: 600 }}>FREE</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'between', fontSize: 16, fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ marginLeft: 'auto', color: 'var(--accent-primary)' }}>{formatMoney(getCartTotal(), currency)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
