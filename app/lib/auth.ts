import crypto from 'crypto';

/**
 * In-memory session store for authentication tokens
 * For production with multiple instances, use Redis or a database
 */
interface Session {
    token: string;
    createdAt: number;
    lastActive: number;
}

// Use globalThis to ensure the same Map instance is shared across all Next.js modules
// This prevents module isolation issues between middleware and API routes
const globalForSession = globalThis as unknown as {
    sessionStore: Map<string, Session> | undefined;
};

const sessionStore = globalForSession.sessionStore ?? new Map<string, Session>();
globalForSession.sessionStore = sessionStore;

// Session expiry: 7 days of inactivity
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Generates a cryptographically secure random token
 */
export function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates a new session and stores the token
 * @returns The generated token
 */
export function createSession(): string {
    const token = generateToken();
    const now = Date.now();

    sessionStore.set(token, {
        token,
        createdAt: now,
        lastActive: now
    });

    console.log(`[Session] Created new session, total sessions: ${sessionStore.size}`);
    return token;
}

/**
 * Validates a session token
 * @param token - The token to validate
 * @returns true if valid and not expired, false otherwise
 */
export function validateSession(token: string): boolean {
    if (!token || typeof token !== 'string') {
        console.log(`[Session] Validation failed - invalid token type`);
        return false;
    }

    const session = sessionStore.get(token);
    if (!session) {
        console.log(`[Session] Validation failed - token not found in store (total sessions: ${sessionStore.size})`);
        return false;
    }

    const now = Date.now();
    const age = now - session.lastActive;

    // Check if session has expired
    if (age > SESSION_MAX_AGE) {
        console.log(`[Session] Validation failed - session expired (age: ${age}ms)`);
        sessionStore.delete(token);
        return false;
    }

    // Update last active time
    session.lastActive = now;
    sessionStore.set(token, session);

    return true;
}

/**
 * Destroys a session
 * @param token - The token to invalidate
 */
export function destroySession(token: string): void {
    sessionStore.delete(token);
}

/**
 * Cleanup expired sessions periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessionStore.entries()) {
        const age = now - session.lastActive;
        if (age > SESSION_MAX_AGE) {
            sessionStore.delete(token);
        }
    }
}, 60 * 60 * 1000); // Clean up every hour

/**
 * Get session count (for monitoring)
 */
export function getSessionCount(): number {
    return sessionStore.size;
}
