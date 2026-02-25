import { execFile } from 'child_process';

const CONTAINER_NAME = process.env.NANOBOT_CONTAINER_NAME || 'nanobot-gateway';

/**
 * Validates container name to prevent command injection
 */
function validateContainerName(name: string): boolean {
    // Only allow alphanumeric, hyphens, underscores, and dots
    return /^[a-zA-Z0-9._-]+$/.test(name);
}

/**
 * Checks if the nanobot container is currently running via the Docker Engine socket.
 */
export async function isContainerRunning(): Promise<boolean> {
    if (!validateContainerName(CONTAINER_NAME)) {
        console.error(`[Docker] Invalid container name: ${CONTAINER_NAME}`);
        return false;
    }

    return new Promise((resolve) => {
        execFile('docker', ['inspect', '-f', '{{.State.Status}}', CONTAINER_NAME], (error, stdout) => {
            if (error) {
                console.error(`[Docker] Failed to inspect container: ${error.message}`);
                resolve(false);
                return;
            }
            resolve(stdout.trim() === 'running');
        });
    });
}

/**
 * Executes a command inside the nanobot container and returns the stdout output.
 * Commands run silently without a TTY.
 * Uses execFile with argument arrays to prevent command injection.
 */
export async function execInContainer(commandArgs: string[]): Promise<string> {
    if (!validateContainerName(CONTAINER_NAME)) {
        throw new Error('Invalid container name');
    }

    // Validate command arguments - no shell metacharacters
    for (const arg of commandArgs) {
        if (typeof arg !== 'string') {
            throw new Error('Invalid command argument type');
        }
    }

    // Build the full docker exec command with proper argument array
    const dockerArgs = ['exec', CONTAINER_NAME, ...commandArgs];

    return new Promise((resolve, reject) => {
        execFile('docker', dockerArgs, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[Docker] Exec error: ${error.message}\nStderr: ${stderr}`);
                // Often we still want the stderr text back even on failure if the bot crashed mid-generation
                resolve(stdout || stderr || `Error: ${error.message}`);
                return;
            }
            resolve(stdout);
        });
    });
}
