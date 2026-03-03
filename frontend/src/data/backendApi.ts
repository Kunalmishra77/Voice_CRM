/**
 * backendApi.ts
 * ─────────────────────────────────────────────────────────────
 * Thin fetch wrapper around the Express backend (VITE_API_BASE_URL).
 * All database access in api.ts must go through these helpers so that
 * the browser never calls Supabase REST directly (which was blocked by CORS).
 */

const BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3010/api';

function buildUrl(path: string, params?: Record<string, any>): string {
    const url = new URL(`${BASE}${path}`);
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                url.searchParams.set(k, String(v));
            }
        });
    }
    return url.toString();
}

async function handleResponse(res: Response) {
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body?.error || `HTTP ${res.status}`);
    }
    return res.json();
}

/** GET request with optional query params */
export const bGet = async (path: string, params?: Record<string, any>) => {
    const res = await fetch(buildUrl(path, params));
    return handleResponse(res);
};

/** POST request with a JSON body */
export const bPost = async (path: string, body?: any) => {
    const res = await fetch(buildUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
};

/** PATCH request with a JSON body */
export const bPatch = async (path: string, body?: any) => {
    const res = await fetch(buildUrl(path), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
};
