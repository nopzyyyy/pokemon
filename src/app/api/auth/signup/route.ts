import { NextResponse } from 'next/server';
import { readDb, writeDb, hashPassword, signSession, User } from '@/lib/db';

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
    
    // Check if user already exists
    const userExists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (userExists) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Create customer user
    const newUser: User = {
      username,
      passwordHash: hashPassword(password),
      role: 'customer'
    };

    db.users.push(newUser);
    writeDb(db);

    // Prepare session payload
    const sessionData = {
      username: newUser.username,
      role: newUser.role,
      createdAt: new Date().toISOString()
    };

    const token = signSession(sessionData);

    const response = NextResponse.json({
      success: true,
      user: {
        username: newUser.username,
        role: newUser.role
      }
    });

    // Automatically set cookie to log them in
    response.cookies.set('aethervault_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/'
    });

    return response;
  } catch (error) {
    console.error("Signup API Error:", error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
