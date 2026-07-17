import { NextResponse } from 'next/server';
import { readDb, hashPassword, signSession } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const db = readDb();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || user.passwordHash !== hashPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Prepare session payload
    const sessionData = {
      username: user.username,
      role: user.role,
      createdAt: new Date().toISOString()
    };

    const token = signSession(sessionData);

    const response = NextResponse.json({
      success: true,
      user: {
        username: user.username,
        role: user.role
      }
    });

    // Set HTTP-only cookie for session tracking
    response.cookies.set('aethervault_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/'
    });

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // Logout endpoint to clear the session cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set('aethervault_session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });
  return response;
}
