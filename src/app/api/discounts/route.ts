import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, writeDb, verifySession, Coupon } from '@/lib/db';

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    const db = readDb();

    // If code query param is provided, validate it (accessible by customers)
    if (code) {
      const coupon = db.coupons.find(
        c => c.code.toUpperCase() === code.toUpperCase() && c.active
      );

      if (!coupon) {
        return NextResponse.json({ error: "Invalid or inactive promo code" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minOrderValue: coupon.minOrderValue
        }
      });
    }

    // Otherwise, return all coupons (admin only)
    const adminMode = await isAdmin();
    if (!adminMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: true, coupons: db.coupons });
  } catch (error) {
    console.error("Discounts API error:", error);
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
    const { code, type, value, minOrderValue } = body;

    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: "Code, Type, and Value are required" }, { status: 400 });
    }

    const db = readDb();

    // Check if code already exists
    if (db.coupons.some(c => c.code.toUpperCase() === code.toUpperCase())) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });
    }

    const newCoupon: Coupon = {
      code: code.toUpperCase(),
      type: type === 'flat' ? 'flat' : 'percentage',
      value: parseFloat(value),
      minOrderValue: minOrderValue ? parseFloat(minOrderValue) : undefined,
      active: true
    };

    db.coupons.push(newCoupon);
    writeDb(db);

    return NextResponse.json({ success: true, coupon: newCoupon });
  } catch (error) {
    console.error("Create coupon error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Toggle coupon status (Admin only)
export async function PATCH(request: Request) {
  try {
    const adminMode = await isAdmin();
    if (!adminMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, active } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const db = readDb();
    const couponIndex = db.coupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase());

    if (couponIndex === -1) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    db.coupons[couponIndex].active = !!active;
    writeDb(db);

    return NextResponse.json({ success: true, coupon: db.coupons[couponIndex] });
  } catch (error) {
    console.error("Toggle coupon error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Delete coupon (Admin only)
export async function DELETE(request: Request) {
  try {
    const adminMode = await isAdmin();
    if (!adminMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const db = readDb();
    const couponIndex = db.coupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase());

    if (couponIndex === -1) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    db.coupons.splice(couponIndex, 1);
    writeDb(db);

    return NextResponse.json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    console.error("Delete coupon error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
