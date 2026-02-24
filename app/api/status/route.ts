import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Ping the nanobot gateway
        const gatewayUrl = process.env.GATEWAY_URL || 'http://127.0.0.1:18790';
        const res = await fetch(gatewayUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
        });

        // We treat any successful connection (even 404, if API doesn't serve root) as online
        console.log(`[STATUS] Successfully pinged gateway at ${gatewayUrl} (Status: ${res.status})`);
        return NextResponse.json({ status: 'online' });
    } catch (err: any) {
        console.error(`[STATUS API ERROR] Failed to ping gateway URL: ${process.env.GATEWAY_URL || 'http://127.0.0.1:18790'}`);
        console.error(err);
        return NextResponse.json({ status: 'offline', details: err.message, stack: err.stack });
    }
}
