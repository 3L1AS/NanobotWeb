import { NextResponse } from 'next/server';

export async function POST() {
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
