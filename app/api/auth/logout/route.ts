import { NextResponse } from 'next/server';
import { destroySession } from '../../../lib/auth';

export async function POST(req: Request) {
    // Get the token from the cookie
    const token = req.cookies.get('nanobot-auth-token')?.value;

    if (token) {
        // Destroy the server-side session
        destroySession(token);
        console.log('[Auth] Session destroyed');
    }

    const response = NextResponse.json({ success: true });

    // Clear the cookie by setting maxAge to 0
    response.cookies.set({
        name: 'nanobot-auth-token',
        value: '',
        httpOnly: true,
        path: '/',
        maxAge: 0,
    });

    return response;
}
