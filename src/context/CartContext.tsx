'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { convertCadToUsd } from '@/lib/currency';

export interface CartItem {
  id: string;
  name: string;
  priceUsd: number;
  priceCad: number;
  quantity: number;
  image: string;
  vendor: string;
}

export interface Coupon {
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  minOrderValue?: number;
}

interface CartContextType {
  cart: CartItem[];
  currency: 'USD' | 'CAD';
  setCurrency: (currency: 'USD' | 'CAD') => void;
  addToCart: (product: { id: string; name: string; priceUsd: number; priceCad: number; image: string; vendor: string }, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  appliedCoupon: Coupon | null;
  applyCouponCode: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  getCartSubtotal: () => number;
  getDiscountAmount: () => number;
  getCartTotal: () => number;
  toast: { show: boolean; message: string };
  showToast: (message: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currency, setCurrencyState] = useState<'USD' | 'CAD'>('CAD'); // CAD as default matching currency picker
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setToast({ show: true, message });
    toastTimer.current = setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2200);
  };

  // Load cart and currency from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('aethervault_cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart) as CartItem[];
        setCart(parsedCart.map((item) => ({
          ...item,
          priceUsd: convertCadToUsd(item.priceCad),
        })));
      } catch (e) {
        console.error("Failed to parse cart data", e);
      }
    }

    const savedCurrency = localStorage.getItem('aethervault_currency');
    if (savedCurrency === 'USD' || savedCurrency === 'CAD') {
      setCurrencyState(savedCurrency);
    }
  }, []);

  // Save cart to localStorage when changed
  useEffect(() => {
    localStorage.setItem('aethervault_cart', JSON.stringify(cart));
  }, [cart]);

  const setCurrency = (curr: 'USD' | 'CAD') => {
    setCurrencyState(curr);
    localStorage.setItem('aethervault_currency', curr);
    // Remove applied coupon since min order constraints or discount types might differ
    setAppliedCoupon(null);
  };

  const addToCart = (product: { id: string; name: string; priceUsd: number; priceCad: number; image: string; vendor: string }, qty = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + qty,
                priceUsd: product.priceUsd,
                priceCad: product.priceCad,
                image: product.image,
              }
            : item
        );
      }
      return [...prevCart, {
        id: product.id,
        name: product.name,
        priceUsd: product.priceUsd,
        priceCad: product.priceCad,
        quantity: qty,
        image: product.image,
        vendor: product.vendor
      }];
    });
    showToast('Added to cart');
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const applyCouponCode = async (code: string) => {
    try {
      const response = await fetch(`/api/discounts?code=${code}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, message: data.error || "Failed to apply coupon" };
      }

      const coupon = data.coupon;
      const subtotal = getCartSubtotal();

      if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
        return {
          success: false,
          message: `Minimum order value of $${coupon.minOrderValue} ${currency} is required to use this coupon.`
        };
      }

      setAppliedCoupon(coupon);
      return { success: true, message: "Coupon applied successfully!" };
    } catch (e) {
      return { success: false, message: "Network error occurred." };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Get price based on chosen currency
  const getItemPrice = (item: CartItem) => {
    return currency === 'USD' ? item.priceUsd : item.priceCad;
  };

  const getCartSubtotal = () => {
    return cart.reduce((total, item) => total + getItemPrice(item) * item.quantity, 0);
  };

  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;
    const subtotal = getCartSubtotal();

    if (appliedCoupon.type === 'percentage') {
      return (subtotal * appliedCoupon.value) / 100;
    } else {
      return Math.min(appliedCoupon.value, subtotal); // Coupon cannot exceed subtotal
    }
  };

  const getCartTotal = () => {
    const subtotal = getCartSubtotal();
    const discount = getDiscountAmount();
    return Math.max(0, subtotal - discount);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        currency,
        setCurrency,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        appliedCoupon,
        applyCouponCode,
        removeCoupon,
        getCartSubtotal,
        getDiscountAmount,
        getCartTotal,
        toast,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
