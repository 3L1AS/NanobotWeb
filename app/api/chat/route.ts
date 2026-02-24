import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { message, sessionId = 'default' } = await req.json();

        // The host gateway is usually running on 18790
        // We proxy it here to avoid CORS issues from the frontend
        const gatewayUrl = process.env.GATEWAY_URL || 'http://127.0.0.1:18790';
        const gatewayRes = await fetch(gatewayUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, id: sessionId })
        });

        if (!gatewayRes.ok) {
            throw new Error(`Gateway returned ${gatewayRes.status}`);
        }

        const data = await gatewayRes.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
