import { NextResponse } from 'next/server';
import { requireSession } from '../../lib/auth';
import { getContainerLogs } from '../../lib/docker';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const unauthorized = requireSession(request);
    if (unauthorized) return unauthorized;

    try {
        const { searchParams } = new URL(request.url);
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr, 10) : 1000;

        const logs = await getContainerLogs(limit);
        
        return NextResponse.json({ logs });
    } catch (err: any) {
        console.error(`[LOGS API ERROR] Caught exception: ${err.message}`);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
