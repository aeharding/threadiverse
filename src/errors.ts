import type { LemmyErrorType } from "lemmy-js-client-v0";

import { PiefedErrorResponse } from "./types";

/**
 * Machine-readable error codes a fediverse server may return (e.g.
 * "incorrect_login", "too_many_requests"), exposed on `ResponseError.code`.
 *
 * The known union gives autocomplete/exhaustiveness for the codes Lemmy
 * emits; software may emit codes outside it (PieFed, future Lemmy versions),
 * so any string is accepted. Match with `isErrorCode`.
 */
export type ResponseErrorCode = LemmyErrorType["error"] | (string & {});

export class FediverseError extends Error {
  constructor(message: string, errorOptions?: ErrorOptions) {
    super(message, errorOptions);
    this.name = "FediverseError";
  }
}

export class InvalidPayloadError extends FediverseError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPayloadError";
  }
}

/**
 * Thrown when a fediverse server returns an error response.
 *
 * Generic — use this when you don't care which software emitted it (e.g.,
 * mapping `error.code` or `error.status` to a toast). Software-specific
 * subclasses (`LemmyResponseError`, `PiefedResponseError`) extend this; check
 * with `instanceof` when business logic depends on the software.
 *
 * The error code (e.g. "incorrect_login", "too_many_requests") is exposed on
 * both `.code` (preferred) and `.message` (for legacy `error.message ===`
 * checks). HTTP status is on `.status` when known. The original underlying
 * error (e.g. lemmy-js-client's `LemmyError`) is attached as `.cause`.
 */
export class ResponseError extends FediverseError {
  code: ResponseErrorCode;
  status?: number;

  constructor(code: string, options?: { cause?: unknown; status?: number }) {
    super(
      code,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = "ResponseError";
    this.code = code;
    this.status = options?.status;
  }
}

/** Thrown when a Lemmy (v0 or v1) server returns an error response. */
export class LemmyResponseError extends ResponseError {
  constructor(code: string, options?: { cause?: unknown; status?: number }) {
    super(code, options);
    this.name = "LemmyResponseError";
  }
}

/** Thrown when a PieFed server returns an error response. */
export class PiefedResponseError extends ResponseError {
  response?: PiefedErrorResponse;

  constructor(
    code: string,
    options?: {
      cause?: unknown;
      response?: PiefedErrorResponse;
      status?: number;
    },
  ) {
    super(code, options);
    this.name = "PiefedResponseError";
    this.response = options?.response;
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

/**
 * Whether `error` is a server error response carrying the given
 * machine-readable code.
 *
 * Also matches on `.message` for non-`ResponseError` errors, preserving
 * legacy `error.message === "code"` semantics.
 */
export function isErrorCode(error: unknown, code: ResponseErrorCode): boolean {
  if (error instanceof ResponseError) return error.code === code;
  if (error instanceof Error) return error.message === code;
  return false;
}
