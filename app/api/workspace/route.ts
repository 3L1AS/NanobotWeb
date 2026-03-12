import { NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { validatePath } from '../../lib/security';

const getWorkspaceDir = () => path.join(os.homedir(), '.nanobot');

const getContentType = (ext: string) => {
    const types: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf', '.zip': 'application/zip',
        '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.wav': 'audio/wav',
    };
    return types[ext] || 'application/octet-stream';
};

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get('file') || 'HEARTBEAT.md';
    const isRaw = searchParams.get('raw') === 'true';
    const isDownload = searchParams.get('download') === 'true';

    try {
        // Validate and sanitize the file path to prevent directory traversal
        const workspaceDir = getWorkspaceDir();
        const filePath = validatePath(file, workspaceDir);

        if (isRaw) {
            const buffer = await fs.readFile(filePath);
            const ext = path.extname(filePath).toLowerCase();
            const disposition = isDownload ? 'attachment' : 'inline';
            return new NextResponse(buffer, {
                status: 200,
                headers: {
                    'Content-Type': getContentType(ext),
                    'Content-Disposition': `${disposition}; filename="${path.basename(filePath)}"`,
                },
            });
        }

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
