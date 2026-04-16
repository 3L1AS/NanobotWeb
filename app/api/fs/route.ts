import { NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { validatePath } from '../../lib/security';
import { execAsRootInDashboard } from '../../lib/docker';

const getWorkspaceDir = () => path.join(os.homedir(), '.nanobot');

export type FsItem = {
    name: string;
    type: 'file' | 'directory';
    path: string;
    size?: number;
    created?: string;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const reqPath = searchParams.get('path') || '';

    try {
        // Validate and sanitize the directory path to prevent directory traversal
        const workspaceDir = getWorkspaceDir();
        const dirPath = validatePath(reqPath, workspaceDir);

        const items = await fs.readdir(dirPath, { withFileTypes: true });

        const result: FsItem[] = await Promise.all(items.map(async item => {
            const fullItemPath = path.join(dirPath, item.name);
            const isDir = item.isDirectory();
            let size: number | undefined;
            let created: string | undefined;
            try {
                const stat = await fs.stat(fullItemPath);
                size = isDir ? undefined : stat.size;
                // birthtime falls back to mtime on filesystems that don't track it
                const createdDate = stat.birthtime.getFullYear() > 1970 ? stat.birthtime : stat.mtime;
                created = createdDate.toISOString();
            } catch { /* skip stats if inaccessible */ }
            return {
                name: item.name,
                type: isDir ? 'directory' : 'file',
                path: path.relative(workspaceDir, fullItemPath).replace(/\\/g, '/'),
                size,
                created,
            };
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
    try {
        const payload = await req.json();
        const { action, path: targetPath, newPath, type } = payload;
        
        const workspaceDir = getWorkspaceDir();

        if (!action || !targetPath) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const fullPath = validatePath(targetPath, workspaceDir);

        if (action === 'create_dir') {
            try {
                await fs.mkdir(fullPath, { recursive: true });
            } catch (err: any) {
                if (err.code === 'EACCES' || err.code === 'EPERM') {
                    console.log(`[FS] Permission fallback: creating dir as root ${fullPath}`);
                    await execAsRootInDashboard(['mkdir', '-p', fullPath]);
                    await execAsRootInDashboard(['chown', '1001:1001', fullPath]);
                } else {
                    throw err;
                }
            }
            return NextResponse.json({ success: true });
        }
        
        if (action === 'delete') {
            const stats = await fs.stat(fullPath);
            try {
                if (stats.isDirectory()) {
                    await fs.rm(fullPath, { recursive: true, force: true });
                } else {
                    await fs.unlink(fullPath);
                }
            } catch (err: any) {
                if (err.code === 'EACCES' || err.code === 'EPERM') {
                    // Root-owned file/dir: fall back to root-level delete via docker exec on self
                    console.log(`[FS] Permission fallback: deleting ${fullPath} as root`);
                    await execAsRootInDashboard(['rm', '-rf', fullPath]);
                } else {
                    throw err;
                }
            }
            return NextResponse.json({ success: true });
        }
        
        if (action === 'rename' || action === 'copy') {
            if (!newPath) return NextResponse.json({ error: 'Missing newPath' }, { status: 400 });
            const fullNewPath = validatePath(newPath, workspaceDir);
            
            if (action === 'rename') {
                await fs.rename(fullPath, fullNewPath);
            } else if (action === 'copy') {
                await fs.cp(fullPath, fullNewPath, { recursive: true });
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error(`[FS POST] Error: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
