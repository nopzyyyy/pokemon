'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatMoney } from '@/lib/currency';

export default function Navigation() {
  const { cart, currency, setCurrency, updateQuantity, removeFromCart, getCartSubtotal, toast } = useCart();
  const { user, logout } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');
  const router = useRouter();
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    if (!isCartOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCartOpen(false);
    };

    document.body.classList.add('cart-is-open');
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('cart-is-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };

    document.body.classList.add('mobile-menu-is-open');
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('mobile-menu-is-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleContactClick = (event: React.MouseEvent) => {
    event.preventDefault();
    document.querySelector('footer')?.scrollIntoView({ behavior: 'smooth' });
  };

  const announcementItems = Array(8).fill('Free shipping over $150 USD');

  return (
    <>
      <div className="announcement-bar">
        <div className="marquee-content">
          {[...announcementItems, ...announcementItems].map((text, index) => (
            <div className="marquee-item" key={index}>
              <span>{text}</span>
              <span className="marquee-bullet" aria-hidden="true">•</span>
            </div>
          ))}
        </div>
      </div>

      <div className="header-shell">
        <header className="header">
          <div className="header-container">
            <button
              type="button"
              className="hamburger-menu-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile menu"
            >
              <HamburgerIcon />
            </button>

            <Link href="/" className="logo" aria-label="Pokémon Center home" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Pokémon</span><span style={{ color: 'var(--accent-primary)' }}> Center</span>
              <img src="/images/canada-flag.svg" alt="Canada Flag" style={{ width: 22, height: 15, borderRadius: 2, objectFit: 'cover', border: '1px solid #eaeaea' }} />
            </Link>

            <nav className="nav-links" aria-label="Main navigation">
              <Link href="/?category=Gaming%20Cards" className="nav-link">Booster Boxes</Link>
              <Link href="/?preorder=true" className="nav-link">Pre-Orders</Link>
              <Link href="/?search=Booster%20Pack" className="nav-link">Booster Packs</Link>
              <Link href="/?search=Elite%20Trainer%20Box" className="nav-link">Elite Trainer Box</Link>
              <Link href="/?search=Bundle" className="nav-link">Bundles</Link>
              <Link href="/?search=Tin" className="nav-link">Mini Tins</Link>
              <a href="#contact" onClick={handleContactClick} className="nav-link">Contact us</a>
            </nav>

            <div className="header-actions">
              <label className="currency-control">
                <span className="sr-only">Currency</span>
                <select
                  className="currency-select"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as 'USD' | 'CAD')}
                >
                  <option value="CAD">CAD $</option>
                  <option value="USD">USD $</option>
                </select>
              </label>

              {user ? (
                <div className="account-controls">
                  <Link
                    href={user.role === 'admin' ? '/admin' : '/'}
                    className="btn-icon"
                    aria-label={`${user.username} account`}
                  >
                    <AccountIcon />
                  </Link>
                  <button type="button" className="logout-button" onClick={handleLogout}>Log out</button>
                </div>
              ) : (
                <Link href="/login" className="btn-icon" aria-label="Account login">
                  <AccountIcon />
                </Link>
              )}

              <button
                type="button"
                className="btn-icon badge-container"
                onClick={() => setIsCartOpen(true)}
                aria-label={`Open cart with ${cartItemCount} items`}
                aria-expanded={isCartOpen}
              >
                <BagIcon />
                {cartItemCount > 0 && <span className="badge">{cartItemCount}</span>}
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Cart Drawer Backdrop */}
      <div
        className={`cart-drawer-backdrop ${isCartOpen ? 'open' : ''}`}
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      {/* Cart Drawer */}
      <aside
        className={`cart-drawer ${isCartOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!isCartOpen}
      >
        <div className="cart-header">
          <div>
            <h2>Cart</h2>
            <p>{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</p>
          </div>
          <button type="button" className="cart-close" onClick={() => setIsCartOpen(false)} aria-label="Close cart">
            <CloseIcon />
          </button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon"><BagIcon /></div>
              <h3>Your cart is empty</h3>
              <p>Find something rare for your collection.</p>
              <button type="button" className="cart-primary-button" onClick={() => setIsCartOpen(false)}>
                Start shopping
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const activePrice = currency === 'USD' ? item.priceUsd : item.priceCad;
              return (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-img">
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className="cart-item-details">
                    <h3 className="cart-item-name">{item.name}</h3>
                    <p className="cart-item-price">{formatMoney(activePrice, currency)}</p>
                    <div className="cart-item-actions">
                      <div className="cart-item-qty" aria-label={`Quantity for ${item.name}`}>
                        <button
                          type="button"
                          className="cart-qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >-</button>
                        <span className="cart-qty-val">{item.quantity}</span>
                        <button
                          type="button"
                          className="cart-qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >+</button>
                      </div>
                      <button
                        type="button"
                        className="cart-remove"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-utilities" aria-label="Cart details">
              <span>Add note</span>
              <span>Shipping</span>
              <span>Discount</span>
            </div>
            <div className="cart-summary-total">
              <span>Subtotal</span>
              <strong>{formatMoney(getCartSubtotal(), currency)}</strong>
            </div>
            <p className="cart-tax-note">Taxes included. Shipping is calculated at checkout.</p>
            <div className="cart-footer-actions">
              <button type="button" className="cart-secondary-button" onClick={() => setIsCartOpen(false)}>
                Continue shopping
              </button>
              <Link href="/checkout" className="cart-primary-button" onClick={() => setIsCartOpen(false)}>
                Check out <CheckoutArrow />
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Menu Backdrop */}
      <div
        className={`mobile-menu-backdrop ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Menu Drawer */}
      <aside
        className={`mobile-menu-drawer ${isMobileMenuOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="mobile-menu-header">
          <Link
            href="/"
            className="logo"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>Pokémon</span><span style={{ color: 'var(--accent-primary)' }}> Center</span>
            <img src="/images/canada-flag.svg" alt="Canada Flag" style={{ width: 22, height: 15, borderRadius: 2, objectFit: 'cover', border: '1px solid #eaeaea' }} />
          </Link>
          <button
            type="button"
            className="mobile-menu-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mobile-menu-search">
          <form onSubmit={(e) => {
            e.preventDefault();
            setIsMobileMenuOpen(false);
            router.push(`/?search=${encodeURIComponent(mobileSearch)}`);
          }}>
            <input
              type="search"
              placeholder="Search cards, sets, etc."
              className="form-input"
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
            />
          </form>
        </div>

        <nav className="mobile-menu-links">
          <Link href="/" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Shop All</Link>
          <Link href="/?category=Gaming%20Cards" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Booster Boxes</Link>
          <Link href="/?preorder=true" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Pre-Orders</Link>
          <Link href="/?search=Booster%20Pack" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Booster Packs</Link>
          <Link href="/?search=Elite%20Trainer%20Box" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Elite Trainer Box</Link>
          <Link href="/?search=Bundle" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Bundles</Link>
          <Link href="/?search=Tin" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Mini Tins</Link>
          <a
            href="#contact"
            className="mobile-menu-link"
            onClick={(e) => {
              setIsMobileMenuOpen(false);
              handleContactClick(e);
            }}
          >
            Contact us
          </a>
        </nav>

        <div className="mobile-menu-footer">
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Signed in as: <strong>{user.username}</strong>
              </div>
              <Link
                href={user.role === 'admin' ? '/admin' : '/'}
                className="btn btn-secondary"
                style={{ width: '100%', borderRadius: 4, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {user.role === 'admin' ? '⚙️ Admin Dashboard' : '👤 My Account'}
              </Link>
              <button
                type="button"
                className="btn btn-danger"
                style={{ width: '100%', borderRadius: 4, minHeight: 40 }}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn btn-primary"
              style={{ width: '100%', borderRadius: 4, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {/* Global Cart Toast */}
      {toast?.show && (
        <div className="cart-toast" role="status" aria-live="polite">
          <span className="toast-check" aria-hidden="true" />
          {toast.message}
        </div>
      )}
    </>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" style={{ width: 22, height: 22 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A18 18 0 0 1 12 21.75c-2.68 0-5.22-.58-7.5-1.65Z" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 8.25V6a3.75 3.75 0 0 1 7.5 0v2.25m-10.24 0h12.98l1.26 12.25H4.25L5.51 8.25Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path strokeLinecap="round" d="m7 7 10 10M17 7 7 17" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v8m6-8v8M5 6h14m-2 0-.7 14H7.7L7 6m3-3h4l1 3H9l1-3Z" />
    </svg>
  );
}

function CheckoutArrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 14 14 6m-6 0h6v6" />
    </svg>
  );
}
