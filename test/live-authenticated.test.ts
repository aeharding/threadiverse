// Real API acceptance. Normal test runs stay offline; opt in with:
//
//   LIVE_AUTH=1 pnpm vitest run test/live-authenticated.test.ts
//
// Authenticated success coverage reads the project-root `.test-creds.json` by
// default. THREADIVERSE_TEST_CREDS selects another file and
// THREADIVERSE_TEST_ACCOUNT selects one account by its key. Credential values
// are never included in test names, assertions, errors, snapshots, or logs.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { ThreadiverseMode } from "../src/BaseClient";
import type { EndpointName } from "../src/capabilities";
import type { GetSiteResponse } from "../src/types";

import { ResponseError } from "../src/errors";
import ThreadiverseClient from "../src/ThreadiverseClient";

const AUTH_ENABLED = process.env.LIVE_AUTH === "1";
const ROUTES_ENABLED = AUTH_ENABLED || process.env.LIVE_PIEFED_ROUTES === "1";
const OPTIONS = { retry: 1, timeout: 90_000 };
const PIEFED_ROUTE_INSTANCE =
  process.env.THREADIVERSE_PIEFED_ROUTE_INSTANCE ?? "https://piefed.social";

const acceptedModes = ["lemmyv0", "lemmyv1", "piefed"] as const;

type AcceptedMode = (typeof acceptedModes)[number];
type AuthenticatedAcceptanceEndpoint = Extract<
  EndpointName,
  | "getNotifications"
  | "getPersonDetails"
  | "getSite"
  | "getUnreadCount"
  | "listPersonContent"
  | "listPersonLiked"
  | "listPersonSaved"
  | "login"
  | "logout"
>;
type FullySupportedAcceptanceEndpoint = Exclude<
  AuthenticatedAcceptanceEndpoint,
  "getNotifications" | "listPersonLiked"
>;

const notificationTypesToCheck = [
  undefined,
  "all",
  "subscribed",
  "mod_action",
] as const;

const getNotificationsRequirements = {
  lemmyv0: {
    fullySupported: true,
    supportedTypes: [undefined, "all", "subscribed", "mod_action"],
  },
  lemmyv1: {
    fullySupported: true,
    supportedTypes: [undefined, "all", "subscribed", "mod_action"],
  },
  piefed: {
    fullySupported: false,
    supportedTypes: [undefined, "all", "subscribed"],
  },
} as const satisfies Record<
  AcceptedMode,
  {
    fullySupported: boolean;
    supportedTypes: readonly (typeof notificationTypesToCheck)[number][];
  }
>;

type NotificationReadVariant = "default/all";

const requiredNotificationReadVariants = {
  lemmyv0: ["default/all"],
  lemmyv1: ["default/all"],
  piefed: ["default/all"],
} as const satisfies Record<AcceptedMode, readonly NotificationReadVariant[]>;

const listPersonLikedRequirements = {
  lemmyv0: {
    fullySupported: true,
    likeTypes: ["liked_only", "disliked_only"],
  },
  lemmyv1: {
    fullySupported: true,
    likeTypes: ["liked_only", "disliked_only"],
  },
  piefed: { fullySupported: false, likeTypes: ["liked_only"] },
} as const satisfies Record<
  AcceptedMode,
  {
    fullySupported: boolean;
    likeTypes: readonly ("disliked_only" | "liked_only")[];
  }
>;

const allLikeTypes = ["liked_only", "disliked_only"] as const;

// This is intentionally independent of `providerCapabilities`. Each entry is
// an acceptance requirement: the test first verifies the provider declares
// the endpoint, then calls the real endpoint. A bad `false` declaration cannot
// make the live probe silently skip itself.
const requiredEndpoints = {
  lemmyv0: [
    "login",
    "getSite",
    "getUnreadCount",
    "getPersonDetails",
    "listPersonContent",
    "listPersonSaved",
    "logout",
  ],
  lemmyv1: [
    "login",
    "getSite",
    "getUnreadCount",
    "getPersonDetails",
    "listPersonContent",
    "listPersonSaved",
    "logout",
  ],
  piefed: [
    "login",
    "getSite",
    "getUnreadCount",
    "getPersonDetails",
    "listPersonContent",
    "listPersonSaved",
    "logout",
  ],
} as const satisfies Record<
  AcceptedMode,
  readonly FullySupportedAcceptanceEndpoint[]
>;

interface LiveCredentials {
  instance: string;
  password: string;
  username: string;
}

interface ProbeContext {
  client: ThreadiverseClient;
  personId: number;
}

type ReadEndpoint = Exclude<
  FullySupportedAcceptanceEndpoint,
  "getSite" | "login" | "logout"
>;

const readProbes = {
  async getPersonDetails({ client, personId }: ProbeContext) {
    await client.getPersonDetails({ person_id: personId });
  },
  async getUnreadCount({ client }: ProbeContext) {
    await client.getUnreadCount();
  },
  async listPersonContent({ client, personId }: ProbeContext) {
    await client.listPersonContent({ limit: 1, person_id: personId });
  },
  async listPersonSaved({ client, personId }: ProbeContext) {
    await client.listPersonSaved({ limit: 1, person_id: personId });
  },
} satisfies Record<ReadEndpoint, (context: ProbeContext) => Promise<void>>;

const notificationReadProbes = {
  async "default/all"({ client }: ProbeContext) {
    await client.getNotifications({ limit: 1, unread_only: false });
  },
} satisfies Record<
  NotificationReadVariant,
  (context: ProbeContext) => Promise<void>
>;

interface PiefedRouteProbe {
  body?: Readonly<Record<string, boolean | number | string>>;
  method: "GET" | "POST" | "PUT";
  path: string;
}

// These calls use deliberately invalid or missing authentication and must be
// rejected before they can mutate anything. Their job is route/method drift
// detection, not a claim of successful authenticated behavior.
const piefedRouteProbes: readonly PiefedRouteProbe[] = [
  {
    body: {
      password: "invalid-route-probe",
      username: "threadiverse-route-probe",
    },
    method: "POST",
    path: "/api/alpha/user/login",
  },
  { method: "POST", path: "/api/alpha/user/logout" },
  { method: "GET", path: "/api/alpha/comment/report/list?limit=1" },
  {
    body: { report_id: 0, resolved: true },
    method: "PUT",
    path: "/api/alpha/comment/report/resolve",
  },
  { method: "GET", path: "/api/alpha/post/report/list?limit=1" },
  {
    body: { report_id: 0, resolved: true },
    method: "PUT",
    path: "/api/alpha/post/report/resolve",
  },
  {
    body: {
      private_message_id: 0,
      reason: "threadiverse-route-probe",
    },
    method: "POST",
    path: "/api/alpha/private_message/report",
  },
  {
    body: { notif_id: 0, read_state: true },
    method: "PUT",
    path: "/api/alpha/user/notification_state",
  },
  {
    method: "GET",
    path: "/api/alpha/user/notifications?status=All&limit=1",
  },
  { method: "GET", path: "/api/alpha/user/me" },
  { method: "POST", path: "/api/alpha/user/mark_all_as_read" },
  {
    body: { show_nsfw: false },
    method: "PUT",
    path: "/api/alpha/user/save_user_settings",
  },
  {
    body: {
      community_id: 0,
      permanent: true,
      reason: "threadiverse-route-probe",
      user_id: 0,
    },
    method: "POST",
    path: "/api/alpha/community/moderate/ban",
  },
  {
    body: { community_id: 0, user_id: 0 },
    method: "PUT",
    path: "/api/alpha/community/moderate/unban",
  },
];

const expectedRouteRejections = [400, 401, 403, 422] as const;
const missingRouteStatuses = [404, 405, 501] as const;

async function assertSessionInvalidated(client: ThreadiverseClient) {
  try {
    await client.getUnreadCount();
  } catch (error) {
    if (
      error instanceof ResponseError &&
      (error.code === "incorrect_login" ||
        error.code === "not_logged_in" ||
        error.status === 401 ||
        error.status === 403)
    )
      return;
    throw safeFailure("post-logout authentication check", error);
  }

  throw new Error("logout left the authenticated session usable");
}

async function atStage<T>(stage: string, operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    throw safeFailure(stage, error);
  }
}

function isAcceptedMode(mode: ThreadiverseMode): mode is AcceptedMode {
  return acceptedModes.includes(mode as AcceptedMode);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadCredentials(): LiveCredentials[] {
  const defaultPath = fileURLToPath(
    new URL("../.test-creds.json", import.meta.url),
  );
  const path = process.env.THREADIVERSE_TEST_CREDS ?? defaultPath;
  let data: unknown;

  try {
    data = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    // JSON parse errors can quote source text. Keep credential-file failures
    // deliberately generic so a malformed file cannot leak a password.
    throw new Error("Unable to load the live credential file");
  }

  return parseCredentials(data, process.env.THREADIVERSE_TEST_ACCOUNT);
}

function normalizeInstance(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "")
    throw new Error("A live credential account has no instance");

  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//u.test(value) ? value : `https://${value}`);
  } catch {
    throw new Error("A live credential account has an invalid instance");
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username !== "" ||
    parsed.password !== ""
  )
    throw new Error("A live credential account has an invalid instance");

  return parsed.origin;
}

function parseCredentials(
  data: unknown,
  selectedAccount?: string,
): LiveCredentials[] {
  if (!isRecord(data) || !isRecord(data.accounts))
    throw new Error("Live credential file has no `accounts` object");

  const entries = Object.entries(data.accounts);
  const selectedEntries = selectedAccount
    ? entries.filter(([key]) => key === selectedAccount)
    : entries;

  if (selectedEntries.length === 0)
    throw new Error("Requested live test account is not available");

  return selectedEntries.map(([accountKey, account], index) => {
    if (typeof account === "string") {
      if (account === "")
        throw new Error(`Live credential account ${index + 1} has no password`);

      return {
        instance: normalizeInstance(data.instance),
        password: account,
        username: accountKey,
      };
    }

    if (
      !isRecord(account) ||
      typeof account.password !== "string" ||
      account.password === ""
    )
      throw new Error(`Live credential account ${index + 1} has no password`);

    const username =
      typeof account.username === "string" && account.username !== ""
        ? account.username
        : accountKey;
    if (username === "")
      throw new Error(`Live credential account ${index + 1} has no username`);

    return {
      instance: normalizeInstance(account.instance ?? data.instance),
      password: account.password,
      username,
    };
  });
}

function personIdFrom(site: GetSiteResponse): number {
  const personId = site.my_user?.local_user_view.person.id;
  if (personId === undefined)
    throw new Error("Authenticated getSite returned no local person");
  return personId;
}

function safeFailure(stage: string, error: unknown): Error {
  if (error instanceof ResponseError)
    return new Error(
      `${stage} failed with ${error.constructor.name} (status ${error.status ?? "unknown"})`,
    );

  const kind = error instanceof Error ? error.constructor.name : typeof error;
  return new Error(`${stage} failed with ${kind}`);
}

async function validateRequiredCapabilities(
  client: ThreadiverseClient,
  mode: AcceptedMode,
): Promise<void> {
  for (const endpoint of requiredEndpoints[mode])
    expect(
      client.capabilities[endpoint],
      `${mode} must declare the live acceptance endpoint ${endpoint}`,
    ).toBe(true);

  const notificationRequirements = getNotificationsRequirements[mode];
  expect(
    client.capabilities.getNotifications,
    `${mode} full getNotifications support must match the acceptance matrix`,
  ).toBe(notificationRequirements.fullySupported);

  const supportedNotificationTypes: readonly (typeof notificationTypesToCheck)[number][] =
    notificationRequirements.supportedTypes;
  for (const type_ of notificationTypesToCheck)
    expect(
      await client.supports("getNotifications", { type_ }),
      `${mode} getNotifications(${type_ ?? "default"}) support must match the acceptance matrix`,
    ).toBe(supportedNotificationTypes.includes(type_));

  const requirements = listPersonLikedRequirements[mode];
  expect(
    client.capabilities.listPersonLiked,
    `${mode} full listPersonLiked support must match the acceptance matrix`,
  ).toBe(requirements.fullySupported);

  const requiredLikeTypes: readonly (typeof allLikeTypes)[number][] =
    requirements.likeTypes;
  for (const likeType of allLikeTypes)
    expect(
      await client.supports("listPersonLiked", { like_type: likeType }),
      `${mode} listPersonLiked(${likeType}) support must match the acceptance matrix`,
    ).toBe(requiredLikeTypes.includes(likeType));
}

describe("live credential configuration", () => {
  it("supports the legacy shared-instance credential shape", () => {
    const credentials = parseCredentials({
      accounts: { first: "example-password", second: "example-password" },
      instance: "lemmy.example",
    });

    expect(credentials).toHaveLength(2);
    expect(credentials.map(({ instance }) => instance)).toEqual([
      "https://lemmy.example",
      "https://lemmy.example",
    ]);
  });

  it("supports provider-specific account records", () => {
    const credentials = parseCredentials({
      accounts: {
        lemmy: {
          instance: "lemmy.example",
          password: "example-password",
          username: "lemmy-user",
        },
        piefed: {
          instance: "https://piefed.example",
          password: "example-password",
          username: "piefed-user",
        },
      },
    });

    expect(credentials).toHaveLength(2);
    expect(credentials.map(({ instance }) => instance)).toEqual([
      "https://lemmy.example",
      "https://piefed.example",
    ]);
  });

  it("selects an account by record key", () => {
    const credentials = parseCredentials(
      {
        accounts: {
          lemmy: {
            instance: "lemmy.example",
            password: "example-password",
            username: "lemmy-user",
          },
          piefed: {
            instance: "piefed.example",
            password: "example-password",
            username: "piefed-user",
          },
        },
      },
      "piefed",
    );

    expect(credentials).toHaveLength(1);
    expect(credentials[0]?.instance).toBe("https://piefed.example");
  });

  it("does not echo malformed credential values in errors", () => {
    const secret = "must-not-appear";
    let message = "";

    try {
      parseCredentials({
        accounts: {
          account: {
            instance: `http://[${secret}`,
            password: "example-password",
          },
        },
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).not.toBe("");
    expect(message).not.toContain(secret);
  });

  it("redacts lower-level error messages", () => {
    const secret = "must-not-appear";
    const failure = safeFailure("login", new Error(secret));

    expect(failure.message).toBe("login failed with Error");
    expect(failure.message).not.toContain(secret);
  });

  it("keeps endpoint requirements explicit for every accepted mode", () => {
    for (const mode of acceptedModes) {
      expect(requiredEndpoints[mode]).toContain("login");
      expect(requiredEndpoints[mode]).toContain("logout");
      expect(listPersonLikedRequirements[mode].likeTypes).toContain(
        "liked_only",
      );
    }

    expect(listPersonLikedRequirements.piefed).toEqual({
      fullySupported: false,
      likeTypes: ["liked_only"],
    });
    expect(getNotificationsRequirements.piefed).toEqual({
      fullySupported: false,
      supportedTypes: [undefined, "all", "subscribed"],
    });
    expect(requiredNotificationReadVariants.piefed).toEqual(["default/all"]);
  });
});

describe.runIf(ROUTES_ENABLED)(
  "PieFed route existence (not authenticated success)",
  () => {
    for (const { body, method, path } of piefedRouteProbes) {
      it(
        `${method} ${path} exists and rejects the unauthenticated probe`,
        OPTIONS,
        async () => {
          const response = await atStage(`${method} PieFed route probe`, () =>
            fetch(new URL(path, PIEFED_ROUTE_INSTANCE), {
              body: body === undefined ? undefined : JSON.stringify(body),
              headers:
                body === undefined
                  ? { Accept: "application/json" }
                  : {
                      Accept: "application/json",
                      "Content-Type": "application/json",
                    },
              method,
              redirect: "manual",
              signal: AbortSignal.timeout(45_000),
            }),
          );

          expect(
            missingRouteStatuses,
            `${method} ${path} must not be missing or use another method`,
          ).not.toContain(response.status);
          expect(
            expectedRouteRejections,
            `${method} ${path} must reject invalid or missing authentication`,
          ).toContain(response.status);
        },
      );
    }
  },
);

describe.runIf(ROUTES_ENABLED)("PieFed public canonical reads", () => {
  it(
    "validates the provider-specific all-content profile feed",
    OPTIONS,
    async () => {
      const client = new ThreadiverseClient(PIEFED_ROUTE_INSTANCE, {
        discoveryCache: new Map(),
      });
      const connection = await atStage("PieFed public connect", () =>
        client.connect(),
      );
      expect(connection.mode).toBe("piefed");

      const posts = await atStage("PieFed public getPosts", () =>
        client.getPosts({ limit: 10, type_: "local" }),
      );
      const personId = posts.data[0]?.creator.id;
      if (personId === undefined)
        throw new Error("PieFed route probe returned no public post creator");

      const profileContent = await atStage(
        "PieFed public listPersonContent",
        () =>
          client.listPersonContent({
            limit: 1,
            mode: "piefed",
            person_id: personId,
            sort: "New",
            type: "all",
          }),
      );

      expect(profileContent.data.length).toBeGreaterThan(0);
      for (const item of profileContent.data)
        expect(item.creator.id).toBe(personId);
    },
  );
});

const credentials = AUTH_ENABLED ? loadCredentials() : [];

describe.runIf(AUTH_ENABLED)("authenticated success acceptance", () => {
  for (const [index, credential] of credentials.entries()) {
    it(
      `credential ${index + 1} exercises required real endpoints`,
      OPTIONS,
      async () => {
        const anonymousClient = new ThreadiverseClient(credential.instance, {
          discoveryCache: new Map(),
        });
        const anonymousConnection = await atStage("connect", () =>
          anonymousClient.connect(),
        );

        if (!isAcceptedMode(anonymousConnection.mode))
          throw new Error("Live instance resolved to an untested mode");

        await validateRequiredCapabilities(
          anonymousClient,
          anonymousConnection.mode,
        );

        const login = await atStage("login", () =>
          anonymousClient.login({
            password: credential.password,
            username_or_email: credential.username,
          }),
        );

        if (!login.jwt) throw new Error("Live login returned no token");

        const client = new ThreadiverseClient(credential.instance, {
          discoveryCache: new Map(),
          headers: { Authorization: `Bearer ${login.jwt}` },
        });

        let primaryFailure: unknown;
        try {
          const connection = await atStage("authenticated connect", () =>
            client.connect(),
          );
          expect(connection.mode).toBe(anonymousConnection.mode);
          await validateRequiredCapabilities(client, anonymousConnection.mode);

          const site = await atStage("getSite", () => client.getSite());
          const context = { client, personId: personIdFrom(site) };

          // getSite is intentionally called above because the remaining
          // person-scoped read probes need its authenticated person id.
          for (const endpoint of requiredEndpoints[anonymousConnection.mode]) {
            if (
              endpoint === "getSite" ||
              endpoint === "login" ||
              endpoint === "logout"
            )
              continue;

            await atStage(endpoint, () => readProbes[endpoint](context));
          }

          // The default/all notification feed remains a required real read on
          // PieFed even though explicit mod_action filtering is unsupported
          // and makes the endpoint's coarse capability conservatively false.
          for (const variant of requiredNotificationReadVariants[
            anonymousConnection.mode
          ])
            await atStage(`getNotifications(${variant})`, () =>
              notificationReadProbes[variant](context),
            );

          // Variant coverage is also explicit. In particular, PieFed's
          // upvoted feed is a real endpoint while its downvoted feed remains
          // unsupported; the coarse capability is therefore conservatively
          // false and cannot silently suppress this liked-only probe.
          for (const likeType of listPersonLikedRequirements[
            anonymousConnection.mode
          ].likeTypes)
            await atStage(`listPersonLiked(${likeType})`, () =>
              client.listPersonLiked({ like_type: likeType, limit: 1 }),
            );
        } catch (error) {
          primaryFailure = error;
        }

        // Logout is a required real endpoint for all accepted modes. Keep it
        // outside the read block so it is also attempted after a failed probe,
        // without allowing a cleanup failure to hide the original failure.
        try {
          await atStage("logout", () => client.logout());
          if (primaryFailure === undefined)
            await assertSessionInvalidated(client);
        } catch (error) {
          if (primaryFailure === undefined) throw error;
        }

        if (primaryFailure !== undefined) throw primaryFailure;
      },
    );
  }
});
