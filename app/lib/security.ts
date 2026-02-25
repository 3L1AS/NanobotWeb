import path from 'path';

/**
 * Validates and sanitizes a file path to prevent directory traversal attacks
 * @param userPath - The user-provided path
 * @param baseDir - The base directory that paths should be restricted to
 * @returns The safe, normalized absolute path
 * @throws Error if the path attempts to escape the base directory
 */
export function validatePath(userPath: string, baseDir: string): string {
    // Allow empty string (root of workspace) but not null/undefined
    if (userPath === null || userPath === undefined || typeof userPath !== 'string') {
        throw new Error('Invalid path parameter');
    }

    // Normalize the base directory (resolve to absolute path)
    const normalizedBase = path.resolve(baseDir);

    // Empty string means root directory
    if (userPath === '' || userPath === '/') {
        return normalizedBase;
    }

    // Normalize the user path and join with base (this handles ../ and other traversals)
    const normalizedPath = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.resolve(normalizedBase, normalizedPath);

    // Ensure the final path starts with the base directory
    if (!fullPath.startsWith(normalizedBase + path.sep) && fullPath !== normalizedBase) {
        throw new Error('Path traversal attempt detected');
    }

    return fullPath;
}

/**
 * Validates file name to prevent special characters that could be used maliciously
 * @param filename - The filename to validate
 * @returns true if valid, false otherwise
 */
export function isValidFilename(filename: string): boolean {
    if (!filename || typeof filename !== 'string') {
        return false;
    }

    // Disallow: null bytes, path separators, and control characters
    const invalidChars = /[\x00-\x1f\x80-\x9f\/\\:*?"<>|]/;
    if (invalidChars.test(filename)) {
        return false;
    }

    // Disallow reserved names on Windows
    const reservedNames = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
    if (reservedNames.test(filename)) {
        return false;
    }

    return true;
}

/**
 * Rate limiting store for authentication attempts
 */
interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple in-memory rate limiter
 * @param identifier - Usually IP address or session identifier
 * @param maxAttempts - Maximum attempts allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limit exceeded, false otherwise
 */
export function isRateLimited(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || now > entry.resetTime) {
        // Start a new window
        rateLimitStore.set(identifier, {
            count: 1,
            resetTime: now + windowMs
        });
        return false;
    }

    entry.count++;
    rateLimitStore.set(identifier, entry);

    return entry.count > maxAttempts;
}

/**
 * Clears rate limit for an identifier (e.g., after successful login)
 */
export function clearRateLimit(identifier: string): void {
    rateLimitStore.delete(identifier);
}

/**
 * Periodically clean up old rate limit entries
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60 * 1000); // Clean up every minute
