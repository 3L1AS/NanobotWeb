import { NextResponse } from 'next/server';
import { execInContainer, isContainerRunning } from '../../lib/docker';

export async function POST(req: Request) {
    try {
        const { message, sessionId = 'default' } = await req.json();

        // Validate inputs
        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
        }

        if (typeof sessionId !== 'string') {
            return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 });
        }

        // Validate message length (10KB limit)
        if (message.length > 10 * 1024) {
            return NextResponse.json({ error: 'Message too long' }, { status: 413 });
        }

        // Validate sessionId format (alphanumeric, hyphens, underscores only)
        if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
            return NextResponse.json({ error: 'Invalid session ID characters' }, { status: 400 });
        }

        // Check if the container is running
        const online = await isContainerRunning();
        if (!online) {
            console.warn('[Chat] Gateway container is offline');
            return NextResponse.json({ error: 'Gateway container is offline or not found' }, { status: 503 });
        }

        // Execute the CLI chat command inside the bot container
        // Using argument arrays prevents command injection
        const output = await execInContainer(['nanobot', 'agent', '-s', sessionId, '-m', message, '--no-markdown']);

        // Clean up the response - strip CLI logo/intro text
        const lines = output.split('\n');
        let cleanedReply = output;
        const lastLogoIndex = lines.findLastIndex(line => line.includes('nanobot'));
        if (lastLogoIndex !== -1 && lastLogoIndex < lines.length - 1) {
            cleanedReply = lines.slice(lastLogoIndex + 1).join('\n').trim();
        }

        return NextResponse.json({ reply: cleanedReply || output });

    } catch (error: any) {
        console.error(`[Chat] Error: ${error.message}`);
        return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
    }
}
