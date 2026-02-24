import { NextResponse } from 'next/server';
import http from 'http';

export async function POST(req: Request) {
    try {
        const { message, sessionId = 'default' } = await req.json();
        const gatewayUrl = process.env.GATEWAY_URL || 'http://127.0.0.1:18790';
        const url = new URL(gatewayUrl);

        const payload = JSON.stringify({ message, id: sessionId });

        return new Promise((resolve) => {
            const request = http.request(
                {
                    hostname: url.hostname,
                    port: url.port,
                    path: '/',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload),
                        'Connection': 'close'
                    },
                    timeout: 30000, // 30s timeout for chat generation
                },
                (res) => {
                    let data = '';
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        if (res.statusCode && res.statusCode >= 400) {
                            resolve(NextResponse.json({ error: `Gateway returned ${res.statusCode}`, raw: data }, { status: res.statusCode }));
                        } else {
                            try {
                                const json = JSON.parse(data);
                                resolve(NextResponse.json(json));
                            } catch (e) {
                                resolve(NextResponse.json({ reply: data }));
                            }
                        }
                    });
                }
            );

            request.on('timeout', () => {
                request.destroy();
                resolve(NextResponse.json({ error: 'Gateway timeout' }, { status: 504 }));
            });

            request.on('error', (err: any) => {
                resolve(NextResponse.json({ error: err.message }, { status: 500 }));
            });

            request.write(payload);
            request.end();
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
