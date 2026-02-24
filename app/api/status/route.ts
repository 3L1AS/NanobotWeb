import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Ping the nanobot gateway on its default port 18790
        const res = await fetch('http://localhost:18790/', {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
        });

        // We treat any successful connection (even 404, if API doesn't serve root) as online
        return NextResponse.json({ status: 'online' });
    } catch (err: any) {
        return NextResponse.json({ status: 'offline', details: err.message });
    }
}
