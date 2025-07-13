import { Middleware } from "openapi-fetch";
import * as oauthClient from "openid-client";

import { BaseClientOptions } from "../..";

const OAUTH_REFRESH_LOCK = "MBIN_OAUTH_REFRESH_LOCK";

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

export function buildMbinAuthMiddleware({
  getOauthConfig,
  getTokens,
  setTokens,
}: NonNullable<BaseClientOptions["oauth"]> & {
  getOauthConfig: () => Promise<oauthClient.Configuration>;
}): Middleware {
  return {
    async onRequest({ request }) {
      // Get most recent tokens from local storage
      let tokens = getTokens();

      console.log("middleware tokens", tokens);

      // If not authenticated, do nothing
      if (!tokens) return;

      // If the token is (soon) invalid, refresh the token
      if (!tokens.accessToken || isTokenExpiringSoon(tokens.accessToken)) {
        tokens = await navigator.locks.request(OAUTH_REFRESH_LOCK, async () => {
          const potentialUpdatedTokens = getTokens();

          // Expired/logged out after lock aquired
          if (!potentialUpdatedTokens) return;

          // Updated after lock aquired
          if (
            tokens?.accessToken &&
            potentialUpdatedTokens.accessToken &&
            tokens.accessToken !== potentialUpdatedTokens.accessToken
          ) {
            return potentialUpdatedTokens;
          }

          // Otherwise, refresh the token
          const config = await getOauthConfig();

          const refreshResponse = await oauthClient.refreshTokenGrant(
            config,
            potentialUpdatedTokens.refreshToken,
          );

          const updatedTokens = {
            accessToken: refreshResponse.access_token,
            refreshToken: refreshResponse.refresh_token!,
          };

          setTokens(updatedTokens);

          return updatedTokens;
        });
      }

      if (!tokens) return;

      request.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
      return request;
    },
  };
}

export function jwtDecode(accessToken: string): { exp: number; sub: string } {
  const [, payload] = accessToken.split(".");
  return JSON.parse(atob(payload!));
}

function isTokenExpiringSoon(accessToken: string) {
  const decoded = jwtDecode(accessToken);
  // within 5 minutes
  return decoded.exp - Date.now() / 1000 < 300;
}
