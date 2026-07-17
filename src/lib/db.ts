import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { convertCadToUsd } from '@/lib/currency';

const DB_PATH = path.join(process.cwd(), 'db.json');
const SEED_PRODUCTS_PATH = path.join(process.cwd(), 'products.json');

export const AUTH_SECRET = "aethervault-tcg-super-secret-key-2026";

export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, 'aethervault-salt-key', 1000, 64, 'sha512').toString('hex');
}

export function signSession(sessionData: any): string {
  const payload = Buffer.from(JSON.stringify(sessionData)).toString('base64');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function verifySession(cookieValue: string): any | null {
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export interface Product {
  id: string;
  name: string;
  url: string;
  img_urls: string[];
  local_images: string[];
  price_usd: number;
  price_cad: number;
  price: number; // legacy fallback
  description: string;
  category: string;
  vendor: string;
  hidden?: boolean;
  discount?: number; // discount percentage
}

export interface Coupon {
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  minOrderValue?: number;
  active: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number; // price in the currency ordered
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  shippingAddress: {
    fullName: string;
    email: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: string;
  paymentDetails?: {
    txHash?: string;
    walletAddress?: string;
    currency?: string;
  };
  subtotal: number;
  discount: number;
  total: number;
  currency: 'USD' | 'CAD';
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface User {
  username: string;
  passwordHash: string;
  role: 'admin' | 'customer';
}

export interface DatabaseSchema {
  products: Product[];
  coupons: Coupon[];
  orders: Order[];
  users: User[];
}

export function readDb(): DatabaseSchema {
  if (!fs.existsSync(DB_PATH)) {
    return initDb();
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Migration: check if existing products lack price_usd / price_cad
    let modified = false;
    parsed.products = parsed.products.map((p: any) => {
      if (p.price_usd === undefined || p.price_cad === undefined) {
        p.price_cad = p.price_cad ?? p.price ?? 0.0;
        p.price_usd = convertCadToUsd(p.price_cad);
        p.price = p.price_usd;
        modified = true;
      }
      return p;
    });

    if (modified) {
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
    }

    return parsed;
  } catch (err) {
    console.error("Failed to read database, re-initializing:", err);
    return initDb();
  }
}

export function writeDb(data: DatabaseSchema): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function initDb(): DatabaseSchema {
  let seededProducts: any[] = [];
  if (fs.existsSync(SEED_PRODUCTS_PATH)) {
    try {
      const rawProducts = fs.readFileSync(SEED_PRODUCTS_PATH, 'utf-8');
      seededProducts = JSON.parse(rawProducts);
      
      seededProducts = seededProducts.map((p: any, index: number) => {
        const cadPrice = p.price_cad ?? p.price ?? 0.0;
        const usdPrice = convertCadToUsd(cadPrice);
        return {
          id: p.id || `prod_${index + 1}`,
          name: p.name || 'Unnamed Product',
          url: p.url || '',
          img_urls: p.img_urls || [],
          local_images: p.local_images || [],
          price_usd: usdPrice,
          price_cad: cadPrice,
          price: usdPrice,
          description: p.description || 'No description available.',
          category: p.category || 'Gaming Cards',
          vendor: p.vendor || 'TCGORA',
          hidden: false,
          discount: 0
        };
      });
    } catch (e) {
      console.error("Failed to load products seed data:", e);
    }
  }

  const defaultDb: DatabaseSchema = {
    products: seededProducts,
    coupons: [
      { code: 'WELCOME10', type: 'percentage', value: 10, active: true },
      { code: 'MEGA25', type: 'percentage', value: 25, active: true },
      { code: 'POKE50', type: 'flat', value: 50, minOrderValue: 200, active: true }
    ],
    orders: [],
    users: [
      {
        username: 'admin',
        passwordHash: hashPassword('admin123'),
        role: 'admin'
      }
    ]
  };

  writeDb(defaultDb);
  return defaultDb;
}
