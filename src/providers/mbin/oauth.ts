import { Middleware } from "openapi-fetch";
import * as oauthClient from "openid-client";

const OAUTH_REFRESH_LOCK = "MBIN_OAUTH_REFRESH_LOCK";
const MBIN_OAUTH_DATA = "MBIN_OAUTH_DATA";

export const MBIN_SCOPES = [
  "read",
  "write",
  "delete",
  "subscribe",
  "block",
  "vote",
  "report",
  "user",
  "moderate",
  "bookmark_list",
] as const;

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export function buildMbinAuthMiddleware({
  getOauthConfig,
  handle,
  initialRefreshToken,
  onUpdatedRefreshToken,
}: {
  getOauthConfig: () => Promise<oauthClient.Configuration>;
  handle: string | undefined;
  initialRefreshToken: string | undefined;
  onUpdatedRefreshToken: (refreshToken: string) => void;
}): Middleware {
  return {
    async onRequest({ request }) {
      // If not authenticated, do nothing
      if (!handle || !initialRefreshToken) return;

      // Get most recent tokens from local storage
      let tokens = getTokens(handle);

      // If the refresh token has changed, update the refresh token
      if (tokens && tokens?.refreshToken !== initialRefreshToken) {
        onUpdatedRefreshToken(initialRefreshToken);
      }

      // If the token is (soon) invalid, refresh the token
      if (!tokens || isTokenExpiringSoon(tokens.accessToken)) {
        tokens = await navigator.locks.request(OAUTH_REFRESH_LOCK, async () => {
          const potentialUpdatedTokens = getTokens(handle);

          // If updated during a lock, use the updated token
          if (
            potentialUpdatedTokens &&
            tokens?.accessToken !== potentialUpdatedTokens.accessToken
          ) {
            onUpdatedRefreshToken(potentialUpdatedTokens.refreshToken);
            return potentialUpdatedTokens;
          }

          // Otherwise, refresh the token
          const config = await getOauthConfig();

          let updatedTokens;
          try {
            const _updatedTokens = await oauthClient.refreshTokenGrant(
              config,
              tokens?.refreshToken ?? initialRefreshToken,
            );

            updatedTokens = {
              accessToken: _updatedTokens.access_token,
              refreshToken: _updatedTokens.refresh_token!,
            };
          } finally {
            setTokens(handle, undefined);
          }

          setTokens(handle, updatedTokens);

          // Notify the app that the tokens have been updated
          onUpdatedRefreshToken(updatedTokens.refreshToken);

          return updatedTokens;
        });
      }

      request.headers.set("Authorization", `Bearer ${tokens!.accessToken}`);
      return request;
    },
  };
}

export function jwtDecode(accessToken: string): { exp: number; sub: string } {
  const [, payload] = accessToken.split(".");
  return JSON.parse(atob(payload!));
}

function getMbinOauthData(): Record<string, Tokens> {
  const stored = localStorage.getItem(MBIN_OAUTH_DATA);
  return stored ? JSON.parse(stored) : {};
}

function getTokens(handle: string) {
  const data = getMbinOauthData();
  return data[handle];
}

function isTokenExpiringSoon(accessToken: string) {
  const decoded = jwtDecode(accessToken);
  // within 5 minutes
  return decoded.exp - Date.now() / 1000 < 300;
}

function setMbinOauthData(data: Record<string, Tokens>) {
  localStorage.setItem(MBIN_OAUTH_DATA, JSON.stringify(data));
}

/**
 * Maps refresh token to access token
 */
function setTokens(handle: string, tokens: Tokens | undefined) {
  const data = getMbinOauthData();

  if (tokens) {
    data[handle] = tokens;
  } else {
    delete data[handle];
  }

  setMbinOauthData(data);
}
