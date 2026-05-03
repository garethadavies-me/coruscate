/**
 * PocketBase browser client for TeamPickr auth bridge pages.
 *
 * Admin (PocketBase): set mail template {APP_URL} to the site base that contains
 * these HTML files, e.g. https://coruscatestudio.com/teampickr
 * — verify: {APP_URL}/verify-email.html?token={TOKEN}
 * — reset: {APP_URL}/confirm-password-reset.html?token={TOKEN}
 * — email change: {APP_URL}/confirm-email-change.html?token={TOKEN}
 *
 * CORS: PocketBase allows browser calls by default; extra CORS config is usually unnecessary.
 *
 * Native app: deep links may arrive with a token already consumed on the web. Treat
 * invalid/expired token errors in the app with a friendly message and send the user
 * to login or account settings instead of failing silently.
 */

import PocketBase from 'https://esm.sh/pocketbase@0.25.1';

export const POCKETBASE_URL = 'https://teampickr-api.coruscatestudio.com';

/** Auth collection id in PocketBase (change if yours is not `users`). */
export const AUTH_COLLECTION = 'users';

export function createClient() {
  return new PocketBase(POCKETBASE_URL);
}

export function getTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('token');
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function formatAuthError(err) {
  const data = err && typeof err === 'object' && 'response' in err ? err.response : null;
  const payload =
    data && typeof data === 'object' && 'data' in data && data.data && typeof data.data === 'object'
      ? data.data
      : null;
  const raw =
    (payload && 'message' in payload && typeof payload.message === 'string' && payload.message) ||
    (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' && data.message) ||
    (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message) ||
    '';

  const lower = raw.toLowerCase();
  if (
    lower.includes('expired') ||
    lower.includes('invalid') ||
    lower.includes('token') ||
    lower.includes('not found') ||
    lower.includes('failed to')
  ) {
    return 'This link is invalid or has expired. Request a new email from TeamPickr if you still need to complete this step.';
  }

  if (raw) {
    return raw;
  }

  return 'Something went wrong. Please try again or request a new link from the app.';
}
