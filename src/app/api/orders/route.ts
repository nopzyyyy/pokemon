import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, writeDb, verifySession, Order } from '@/lib/db';

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
    const adminMode = await isAdmin();
    if (!adminMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = readDb();
    const sortedOrders = [...db.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ success: true, orders: sortedOrders });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, shippingAddress, paymentMethod, paymentDetails, subtotal, discount, total, currency } = body;

    if (!items || !shippingAddress || !paymentMethod || total === undefined) {
      return NextResponse.json({ error: "Missing required order fields" }, { status: 400 });
    }

    const db = readDb();

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      items,
      shippingAddress,
      paymentMethod,
      paymentDetails,
      subtotal: parseFloat(subtotal),
      discount: parseFloat(discount),
      total: parseFloat(total),
      currency: currency || 'CAD', // Save checkout currency
      status: paymentMethod.toLowerCase() === 'crypto' ? 'completed' : 'pending',
      createdAt: new Date().toISOString()
    };

    db.orders.push(newOrder);
    writeDb(db);

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error) {
    console.error("Submit order error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
