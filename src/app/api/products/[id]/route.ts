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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = readDb();
    const product = db.products.find(p => p.id === id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const adminMode = await isAdmin();
    if (product.hidden && !adminMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Get product detail error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminMode = await isAdmin();
    if (!adminMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const db = readDb();
    const index = db.products.findIndex(p => p.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Update product fields
    const current = db.products[index];
    const normalizedBody = body.price_cad !== undefined
      ? {
          ...body,
          price_cad: parseFloat(body.price_cad),
          price_usd: convertCadToUsd(parseFloat(body.price_cad)),
          price: convertCadToUsd(parseFloat(body.price_cad)),
        }
      : body;

    db.products[index] = {
      ...current,
      ...normalizedBody,
      // Keep ID immutable
      id: current.id
    };

    writeDb(db);

    return NextResponse.json({ success: true, product: db.products[index] });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminMode = await isAdmin();
    if (!adminMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = readDb();
    const index = db.products.findIndex(p => p.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete product from list
    db.products.splice(index, 1);
    writeDb(db);

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
