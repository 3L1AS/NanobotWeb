import { NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { validatePath } from '../../lib/security';

const getWorkspaceDir = () => path.join(os.homedir(), '.nanobot', 'workspace');

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get('file') || 'HEARTBEAT.md';

    try {
        // Validate and sanitize the file path to prevent directory traversal
        const workspaceDir = getWorkspaceDir();
        const filePath = validatePath(file, workspaceDir);

        const data = await fs.readFile(filePath, 'utf8');
        return NextResponse.json({ content: data });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return NextResponse.json({ content: '' }, { status: 404 });
        }
        if (error.message === 'Path traversal attempt detected' || error.message === 'Invalid path parameter') {
            console.error(`[Security] Path traversal attempt: ${file}`);
            return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
        }
        console.error(`[Workspace] Error reading file: ${error.message}`);
        return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { file, content } = await req.json();

        if (!file || typeof content !== 'string') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Validate content size (10MB limit)
        if (content.length > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'File content too large' }, { status: 413 });
        }

        // Validate and sanitize the file path to prevent directory traversal
        const workspaceDir = getWorkspaceDir();
        const filePath = validatePath(file, workspaceDir);

        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf8');
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Path traversal attempt detected' || error.message === 'Invalid path parameter') {
            console.error(`[Security] Path traversal attempt in POST`);
            return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
        }
        console.error(`[Workspace] Error writing file: ${error.message}`);
        return NextResponse.json({ error: 'Failed to write file' }, { status: 500 });
    }
}
