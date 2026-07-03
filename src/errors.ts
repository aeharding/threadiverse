import type { LemmyErrorType } from "lemmy-js-client-v0";

import { PiefedErrorResponse } from "./types";

/**
 * Machine-readable error codes a fediverse server may return (e.g.
 * "incorrect_login", "too_many_requests"), exposed on `ResponseError.code`.
 *
 * Escape hatch: prefer matching the condition subclasses with `instanceof`
 * (`NotFoundError`, `RateLimitedError`, ...). Codes remain for conditions
 * that don't have a class (the long tail) and for debugging.
 */
export type ResponseErrorCode = LemmyErrorType["error"] | (string & {});

export type ResponseErrorOptions = {
  cause?: unknown;
  /** PieFed's raw error payload, when the server provided one */
  response?: PiefedErrorResponse;
  software?: "lemmy" | "piefed";
  status?: number;
};

type ResponseErrorConstructor = new (
  code: string,
  options?: ResponseErrorOptions,
) => ResponseError;

export class FediverseError extends Error {
  constructor(message: string, errorOptions?: ErrorOptions) {
    super(message, errorOptions);
    this.name = "FediverseError";
  }
}

/**
 * Thrown when a fediverse server returns an error response.
 *
 * The class encodes the *condition*: providers normalize their native error
 * codes onto the condition subclasses below (`NotFoundError`,
 * `RateLimitedError`, `IncorrectLoginError`, ...), so `instanceof` checks
 * work identically across software. Unmapped codes surface as this base
 * class.
 *
 * Details for the long tail and debugging: the raw machine-readable code is
 * on `.code` (and `.message`, for legacy `error.message ===` checks), which
 * software emitted it is on `.software`, HTTP status on `.status`, and the
 * original underlying error (e.g. lemmy-js-client's `LemmyError`) on
 * `.cause`.
 */
export class ResponseError extends FediverseError {
  code: ResponseErrorCode;
  /** PieFed's raw error payload, when the server provided one */
  response?: PiefedErrorResponse;
  software?: "lemmy" | "piefed";
  status?: number;

  constructor(code: string, options?: ResponseErrorOptions) {
    super(
      code,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = "ResponseError";
    this.code = code;
    this.response = options?.response;
    this.software = options?.software;
    this.status = options?.status;
  }
}

// ---------------------------------------------------------------------------
// Condition subclasses. Add a class (and its code mapping in
// CONDITION_BY_CODE) when a consumer needs to branch on a condition — the
// live error-fidelity suite verifies mappings against real instances.
// ---------------------------------------------------------------------------

/** The account has been deleted */
export class AccountDeletedError extends ResponseError {
  constructor(code: string, options?: ResponseErrorOptions) {
    super(code, options);
    this.name = "AccountDeletedError";
  }
}

/** The account is banned from the instance */
export class BannedError extends ResponseError {
  constructor(code: string, options?: ResponseErrorOptions) {
    super(code, options);
    this.name = "BannedError";
  }
}

/** Admins cannot be blocked */
export class CantBlockAdminError extends ResponseError {
  constructor(code: string, options?: ResponseErrorOptions) {
    super(code, options);
    this.name = "CantBlockAdminError";
  }
}

/** The account's email address has not been verified yet */
export class EmailNotVerifiedError extends ResponseError {
  constructor(code: string, options?: ResponseErrorOptions) {
    super(code, options);
    this.name = "EmailNotVerifiedError";
  }
}

/** Wrong or missing TOTP second factor */
export class Incorrect2faError extends ResponseError {
  constructor(code: string, options?: ResponseErrorOptions) {
    super(code, options);
    this.name = "Incorrect2faError";
  }
}

/** Wrong username/email or password */
export class IncorrectLoginError extends ResponseError {
  constructor(code: string, options?: ResponseErrorOptions) {
    super(code, options);
    this.name = "IncorrectLoginError";
  }
}

/** The action is not allowed for bot accounts */
export class InvalidBotActionError extends ResponseError {
  constructor(code: string, options?: ResponseErrorOptions) {
    super(code, options);
    this.name = "InvalidBotActionError";
  }
}

export class InvalidPayloadError extends FediverseError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPayloadError";
  }
}

/** The requested entity (post, comment, community, person...) doesn't exist */
export class NotFoundError extends ResponseError {
  constructor(code: string, options?: ResponseErrorOptions) {
    super(code, options);
    this.name = "NotFoundError";
  }
}

/** The server is rate limiting the client */
export class RateLimitedError extends ResponseError {
  constructor(code: string, options?: ResponseErrorOptions) {
    super(code, options);
    this.name = "RateLimitedError";
  }
}

/** Signup application is awaiting admin approval */
export class RegistrationApplicationPendingError extends ResponseError {
  constructor(code: string, options?: ResponseErrorOptions) {
    super(code, options);
    this.name = "RegistrationApplicationPendingError";
  }
}

export class UnexpectedResponseError extends FediverseError {
  constructor(message: string, errorOptions?: ErrorOptions) {
    super(message, errorOptions);
    this.name = "UnexpectedResponseError";
  }
}

export class UnsupportedError extends FediverseError {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedError";
  }
}

export class UnsupportedSoftwareError extends UnsupportedError {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedSoftwareError";
  }
}

// Lemmy codes (v0 + v1) plus PieFed's native codes as observed by the live
// error-fidelity suite (PieFed puts human-ish prose in its message field;
// the exact strings below were captured from piefed.social 2026-07-02 —
// the scheduled fidelity run detects when they change).
const CONDITION_BY_CODE: Record<string, ResponseErrorConstructor> = {
  cant_block_admin: CantBlockAdminError,
  deleted: AccountDeletedError,
  email_not_verified: EmailNotVerifiedError,
  "error - unknown community. Please wait a sec and try again.": NotFoundError,
  incorrect_login: IncorrectLoginError,
  incorrect_totp_token: Incorrect2faError,
  invalid_bot_action: InvalidBotActionError,
  "No row was found when one was required": NotFoundError,
  not_found: NotFoundError,
  rate_limit_error: RateLimitedError,
  registration_application_is_pending: RegistrationApplicationPendingError,
  site_ban: BannedError,
  too_many_requests: RateLimitedError,
};

/**
 * Build the right `ResponseError` (condition subclass when the code maps to
 * one) for a server error response. Providers throw through this so
 * condition semantics stay identical across software.
 */
export function createResponseError(
  code: string,
  options?: ResponseErrorOptions,
): ResponseError {
  const Condition =
    CONDITION_BY_CODE[code] ??
    // Lemmy ≤0.19 entity-specific not-found codes
    (code.startsWith("couldnt_find_") ? NotFoundError : undefined);

  return Condition
    ? new Condition(code, options)
    : new ResponseError(code, options);
}

/**
 * Whether `error` is a server error response carrying the given
 * machine-readable code.
 *
 * Escape hatch: prefer `instanceof` on the condition subclasses. Also
 * matches on `.message` for non-`ResponseError` errors, preserving legacy
 * `error.message === "code"` semantics.
 */
export function isErrorCode(error: unknown, code: ResponseErrorCode): boolean {
  if (error instanceof ResponseError) return error.code === code;
  if (error instanceof Error) return error.message === code;
  return false;
}
