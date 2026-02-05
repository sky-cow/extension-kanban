/* auth.js
 * Minimal Google sign-in helper for the extension environment.
 * Uses chrome.identity.getAuthToken when available. Keeps a small
 * portable API so UI code can call signIn() / signOut() and get current user info.
 */
import { CONFIG } from "./config.js";

/*
 * signIn():
 * - If offline/mock mode is enabled, return a mock user for local development.
 * - If not running in an extension environment, return null so the app shows a sign-in prompt.
 * - Otherwise use chrome.identity.getAuthToken to obtain an access token and fetch basic user info.
 */
export async function signIn() {
  if (CONFIG.ENABLE_OFFLINE_MODE) {
    return {
      id: "local-user-id",
      email: "local@local.test",
      name: "Local Dev",
    };
  }

  if (typeof chrome === "undefined" || !chrome.identity) {
    // Not running as an installed extension — do not auto-return a mock user.
    return null;
  }

  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        return reject(
          new Error(chrome.runtime.lastError?.message || "No token"),
        );
      }
      try {
        console.debug(
          "auth: got chrome.identity token (masked)",
          token ? `${token.slice(0, 8)}...` : null,
        );
      } catch (e) {
        console.debug("auth: token logging failed", e);
      }
      try {
        const resp = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await resp.json();
        try {
          console.debug("auth: fetched userinfo", {
            email: data.email,
            name: data.name,
            sub: data.sub,
          });
        } catch (e) {
          console.debug("auth: userinfo logging failed", e);
        }
        resolve({
          id: data.sub || data.id,
          email: data.email,
          name: data.name,
          raw: data,
          token,
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

export async function signOut() {
  if (typeof chrome === "undefined" || !chrome.identity) return;
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    if (!token) return;
    fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`).catch(
      () => {},
    );
    chrome.identity.removeCachedAuthToken({ token }, () => {});
  });
}

export async function getAuthToken() {
  if (typeof chrome === "undefined" || !chrome.identity) return null;
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) =>
      resolve(token || null),
    );
  });
}
