import { NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { validatePath } from '../../lib/security';

const getWorkspaceDir = () => path.join(os.homedir(), '.nanobot', 'workspace');

export type FsItem = {
    name: string;
    type: 'file' | 'directory';
    path: string;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const reqPath = searchParams.get('path') || '';

    try {
        // Validate and sanitize the directory path to prevent directory traversal
        const workspaceDir = getWorkspaceDir();
        const dirPath = validatePath(reqPath, workspaceDir);

        const items = await fs.readdir(dirPath, { withFileTypes: true });

        const result: FsItem[] = items.map(item => ({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            // Store relative path from workspace root for consistency
            path: path.relative(workspaceDir, path.join(dirPath, item.name)).replace(/\\/g, '/')
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
            return NextResponse.json({ items: [] }, { status: 404 });
        }
        if (error.message === 'Path traversal attempt detected' || error.message === 'Invalid path parameter') {
            console.error(`[Security] Path traversal attempt in fs: ${reqPath}`);
            return NextResponse.json({ error: 'Invalid directory path' }, { status: 400 });
        }
        console.error(`[FS] Error reading directory: ${error.message}`);
        return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    return NextResponse.json({ error: 'Method not implemented' }, { status: 405 });
}
