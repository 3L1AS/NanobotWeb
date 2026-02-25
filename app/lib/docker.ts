import { exec } from 'child_process';

const CONTAINER_NAME = process.env.NANOBOT_CONTAINER_NAME || 'nanobot-gateway';

/**
 * Checks if the nanobot container is currently running via the Docker Engine socket.
 */
export async function isContainerRunning(): Promise<boolean> {
    return new Promise((resolve) => {
        exec(`docker inspect -f '{{.State.Status}}' ${CONTAINER_NAME}`, (error, stdout) => {
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
 */
export async function execInContainer(commandArgs: string[]): Promise<string> {
    const escapedArgs = commandArgs.map(arg => {
        // Simple escaping for obvious problematic characters
        return `"${arg.replace(/"/g, '\\"')}"`;
    }).join(' ');

    const fullCommand = `docker exec ${CONTAINER_NAME} ${escapedArgs}`;

    return new Promise((resolve, reject) => {
        exec(fullCommand, (error, stdout, stderr) => {
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
