import { NextResponse } from 'next/server';
import { isContainerRunning } from '../../lib/docker';

export async function GET() {
    try {
        const isOnline = await isContainerRunning();
        return NextResponse.json({
            status: isOnline ? 'online' : 'offline',
            details: isOnline ? 'Container is running' : 'Container is not running'
        });
    } catch (err: any) {
        console.error(`[STATUS API ERROR] Caught exception: ${err.message}`);
        return NextResponse.json({ status: 'offline', details: err.message });
    }
}
