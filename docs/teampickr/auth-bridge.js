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

// export const POCKETBASE_URL = 'https://teampickr-api.coruscatestudio.com';
export const POCKETBASE_URL = 'http://127.0.0.1:8090';

/** Auth collection id in PocketBase (change if yours is not `users`). */
export const AUTH_COLLECTION = 'users';

export function createClient() {
  return new PocketBase(POCKETBASE_URL);
}

export function getTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('token');
}

/**
 * Turns PocketBase / network errors into short, calm copy for end users.
 *
 * @param {unknown} err
 * @returns {string}
 */
export function formatAuthError(err) {
  const asObj = err && typeof err === 'object' ? err : null;
  const topMessage =
    asObj && 'message' in asObj && typeof asObj.message === 'string' ? asObj.message.trim() : '';

  // Browser network failures (no response body)
  if (
    topMessage.includes('Failed to fetch') ||
    topMessage.includes('NetworkError') ||
    topMessage.includes('Network request failed') ||
    topMessage.includes('Load failed') ||
    topMessage.includes('The Internet connection appears to be offline')
  ) {
    return 'We couldn’t reach TeamPickr. Check your internet connection and try again in a moment.';
  }

  const status =
    asObj && 'status' in asObj && typeof asObj.status === 'number' ? asObj.status : undefined;

  if (status === 408 || status === 504) {
    return 'That took too long to finish. Please try again.';
  }

  if (status === 429) {
    return 'Too many attempts right now. Wait a short while and try again.';
  }

  if (status !== undefined && status >= 500) {
    return 'TeamPickr is having a problem on our side. Please try again in a few minutes.';
  }

  const data = asObj && 'response' in asObj ? asObj.response : null;
  const responseData =
    data && typeof data === 'object' && 'data' in data && data.data && typeof data.data === 'object'
      ? data.data
      : null;
  const raw =
    (responseData &&
      'message' in responseData &&
      typeof responseData.message === 'string' &&
      responseData.message) ||
    (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' && data.message) ||
    topMessage ||
    '';

  const lower = raw.toLowerCase();

  // Wrong password on email-change — narrow phrases so reset-token errors aren’t misread as “bad password”
  const wrongCredentials =
    status === 401 ||
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials');
  if (wrongCredentials) {
    return 'That password isn’t the one we have on file. Try again carefully, or reset your password from the app.';
  }

  // Broken, reused, or incomplete magic links (verification, reset, email change)
  const badLink =
    lower.includes('expired') ||
    lower.includes('token') ||
    lower.includes('verification') ||
    lower.includes('already been') ||
    lower.includes('not found') ||
    lower.includes('no rows') ||
    lower.includes('cannot lookup') ||
    lower.includes('lookup auth') ||
    lower.includes('failed to confirm') ||
    lower.includes('invalid token') ||
    status === 404 ||
    (status === 400 &&
      /token|verification|expired|confirm|reset|email\s*change/.test(lower));
  if (badLink) {
    return 'This link has expired or was already used. Open TeamPickr and send yourself a fresh email, then use the new link.';
  }

  // Password rules from the server (e.g. too short), without implying the link is dead
  if (lower.includes('password')) {
    return 'We couldn’t save that password. Use at least 8 characters or pick a different one.';
  }

  // Permission / forbidden (avoid echoing server jargon)
  if (status === 403 || lower.includes('forbidden')) {
    return 'We couldn’t complete that step. If this keeps happening, contact support—we’re happy to help.';
  }

  // Single-field validation PocketBase sometimes returns as plain English
  if (raw.length > 0 && raw.length < 160 && !lower.includes('sql') && !lower.includes('trace')) {
    const looksSafe =
      /^[a-z0-9\s.,'’?!\-–—()]+$/i.test(raw) &&
      !lower.includes('localhost') &&
      !lower.includes('127.0.0.1') &&
      !lower.includes('undefined');
    if (looksSafe) {
      return raw;
    }
  }

  return 'Something went wrong and we couldn’t finish that step. Please try once more, or request a new email from TeamPickr.';
}
