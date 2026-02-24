import { NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

const getWorkspaceDir = () => path.join(os.homedir(), '.nanobot', 'workspace');

export type FsItem = {
    name: string;
    type: 'file' | 'directory';
    path: string;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const reqPath = searchParams.get('path') || '';

    // Prevent directory traversal
    const safePath = path.normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const dirPath = path.join(getWorkspaceDir(), safePath);

    try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });

        const result: FsItem[] = items.map(item => ({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            path: path.join(safePath, item.name).replace(/\\/g, '/')
        }));

        // Sort: directories first, then alphabetical
        result.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        return NextResponse.json({ items: result });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return NextResponse.json({ items: [] }); // Empty directory
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    return NextResponse.json({ error: 'Method not implemented' }, { status: 405 });
}
