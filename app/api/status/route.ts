import { NextResponse } from 'next/server';
import http from 'http';

export async function GET() {
    const gatewayUrl = process.env.GATEWAY_URL || 'http://127.0.0.1:18790';

    return new Promise((resolve) => {
        try {
            const url = new URL(gatewayUrl);
            const req = http.request(
                {
                    hostname: url.hostname,
                    port: url.port,
                    path: '/',
                    method: 'GET',
                    headers: { 'Connection': 'close' },
                    timeout: 2000,
                },
                (res) => {
                    console.log(`[STATUS] Successfully pinged gateway at ${gatewayUrl} (Status: ${res.statusCode})`);
                    // Drain the response to free up the socket
                    res.on('data', () => { });
                    res.on('end', () => {
                        resolve(NextResponse.json({ status: 'online' }));
                    });
                }
            );

            req.on('timeout', () => {
                req.destroy();
                console.error(`[STATUS API ERROR] Timeout pinging gateway ${gatewayUrl}`);
                resolve(NextResponse.json({ status: 'offline', details: 'Timeout' }));
            });

            req.on('error', (err: any) => {
                console.error(`[STATUS API ERROR] Failed to ping gateway ${gatewayUrl} - ${err.code}`);
                resolve(NextResponse.json({ status: 'offline', details: err.message }));
            });

            req.end();
        } catch (err: any) {
            console.error(`[STATUS API ERROR] Caught exception: ${err.message}`);
            resolve(NextResponse.json({ status: 'offline', details: err.message }));
        }
    });
}
