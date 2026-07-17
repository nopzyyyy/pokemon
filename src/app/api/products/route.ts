import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, writeDb, verifySession, Product } from '@/lib/db';
import { convertCadToUsd } from '@/lib/currency';

async function isAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('aethervault_session')?.value;
    if (!token) return false;
    const session = verifySession(token);
    return session && session.role === 'admin';
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const db = readDb();
    const adminMode = await isAdmin();

    let products = db.products;

    if (!adminMode) {
      products = products.filter(p => !p.hidden);
    }

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminMode = await isAdmin();
    if (!adminMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, price_cad, description, category, vendor, local_images, discount } = body;

    if (!name || price_cad === undefined) {
      return NextResponse.json({ error: "Name and Price CAD are required" }, { status: 400 });
    }

    const db = readDb();
    const newId = `prod_${Date.now()}`;

    const cadPrice = parseFloat(price_cad);
    const usdPrice = convertCadToUsd(cadPrice);
    const newProduct: Product = {
      id: newId,
      name,
      url: '',
      img_urls: [],
      local_images: local_images || ['/placeholder.webp'],
      price_usd: usdPrice,
      price_cad: cadPrice,
      price: usdPrice,
      description: description || 'No description available.',
      category: category || 'Gaming Cards',
      vendor: vendor || 'TCGORA',
      hidden: false,
      discount: parseInt(discount) || 0
    };

    db.products.push(newProduct);
    writeDb(db);

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
