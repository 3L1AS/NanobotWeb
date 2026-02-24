import { NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

const getWorkspaceDir = () => path.join(os.homedir(), '.nanobot', 'workspace');

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get('file') || 'HEARTBEAT.md';

    try {
        const filePath = path.join(getWorkspaceDir(), file);
        const data = await fs.readFile(filePath, 'utf8');
        return NextResponse.json({ content: data });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return NextResponse.json({ content: '' });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { file, content } = await req.json();
        if (!file || typeof content !== 'string') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }
        const filePath = path.join(getWorkspaceDir(), file);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf8');
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
