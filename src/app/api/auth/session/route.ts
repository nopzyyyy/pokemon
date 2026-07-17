import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('aethervault_session');

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const session = verifySession(sessionCookie.value);

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        username: session.username,
        role: session.role
      }
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
