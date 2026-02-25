import { NextResponse } from 'next/server';
import { execInContainer, isContainerRunning } from '../../lib/docker';

export async function POST(req: Request) {
    try {
        const { message, sessionId = 'default' } = await req.json();

        // 1. Check if the container is even alive first
        const online = await isContainerRunning();
        if (!online) {
            return NextResponse.json({ error: 'Gateway container is offline or not found' }, { status: 503 });
        }

        // 2. Execute the CLI chat command natively inside the bot container!
        // We use --no-markdown because we just want the raw text to stream/parse, not rich terminal escape codes
        const output = await execInContainer(['nanobot', 'agent', '-s', sessionId, '-m', message, '--no-markdown']);

        // 3. The CLI adds some intro/outro text, so let's try to gently clean up the response
        // Usually it prints the logo and "nanobot is thinking...", we just want everything after the second newline/logo print
        const lines = output.split('\n');

        // A very basic parser to strip logo text and return just the answer payload
        let cleanedReply = output;
        const lastLogoIndex = lines.findLastIndex(line => line.includes('nanobot'));
        if (lastLogoIndex !== -1 && lastLogoIndex < lines.length - 1) {
            cleanedReply = lines.slice(lastLogoIndex + 1).join('\n').trim();
        }

        return NextResponse.json({ reply: cleanedReply || output });

    } catch (error: any) {
        console.error(`[CHAT API ERROR]: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
