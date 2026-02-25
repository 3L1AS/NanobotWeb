import { NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

const getConfigPath = () => path.join(os.homedir(), '.nanobot', 'config.json');

export async function GET() {
  try {
    const configPath = getConfigPath();
    const data = await fs.readFile(configPath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({}, { status: 404 });
    }
    console.error(`[Config] Error reading config: ${error.message}`);
    return NextResponse.json({ error: 'Failed to read configuration' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Basic validation: config should be an object
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid configuration format' }, { status: 400 });
    }

    // Validate config size (1MB limit)
    const configString = JSON.stringify(body, null, 2);
    if (configString.length > 1024 * 1024) {
      return NextResponse.json({ error: 'Configuration too large' }, { status: 413 });
    }

    // Validate that providers and channels are objects if present
    if (body.providers && (typeof body.providers !== 'object' || Array.isArray(body.providers))) {
      return NextResponse.json({ error: 'Invalid providers format' }, { status: 400 });
    }
    if (body.channels && (typeof body.channels !== 'object' || Array.isArray(body.channels))) {
      return NextResponse.json({ error: 'Invalid channels format' }, { status: 400 });
    }

    const configPath = getConfigPath();
    // Ensure .nanobot directory exists
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, configString, 'utf8');

    console.log('[Config] Configuration updated successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
    }
    console.error(`[Config] Error writing config: ${error.message}`);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
