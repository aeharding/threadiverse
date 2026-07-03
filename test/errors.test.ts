import { describe, expect, it } from "vitest";

import {
  createResponseError,
  Incorrect2faError,
  IncorrectLoginError,
  isErrorCode,
  Missing2faError,
  NotFoundError,
  RateLimitedError,
  ResponseError,
  UnsupportedError,
} from "../src/errors";

describe("createResponseError", () => {
  it("maps known codes to condition subclasses", () => {
    const error = createResponseError("incorrect_login", {
      software: "lemmy",
      status: 401,
    });

    expect(error).toBeInstanceOf(IncorrectLoginError);
    expect(error).toBeInstanceOf(ResponseError);
    expect(error.code).toBe("incorrect_login");
    expect(error.message).toBe("incorrect_login");
    expect(error.software).toBe("lemmy");
    expect(error.status).toBe(401);
  });

  it("distinguishes missing vs incorrect 2fa", () => {
    expect(createResponseError("missing_totp_token")).toBeInstanceOf(
      Missing2faError,
    );
    expect(createResponseError("incorrect_totp_token")).toBeInstanceOf(
      Incorrect2faError,
    );
  });

  it("maps equivalent codes across versions to one condition", () => {
    expect(createResponseError("rate_limit_error")).toBeInstanceOf(
      RateLimitedError,
    );
    expect(createResponseError("too_many_requests")).toBeInstanceOf(
      RateLimitedError,
    );
  });

  it("maps lemmy ≤0.19 entity-specific not-found codes", () => {
    expect(createResponseError("couldnt_find_person")).toBeInstanceOf(
      NotFoundError,
    );
    expect(createResponseError("not_found")).toBeInstanceOf(NotFoundError);
    // PieFed's resolve_object miss
    expect(createResponseError("No object found.")).toBeInstanceOf(
      NotFoundError,
    );
  });

  it("falls back to the base class for unmapped codes", () => {
    const error = createResponseError("some_new_code", {
      software: "piefed",
    });

    expect(error.constructor).toBe(ResponseError);
    expect(error.code).toBe("some_new_code");
    expect(error.software).toBe("piefed");
  });
});

describe("isErrorCode", () => {
  it("matches ResponseError by code", () => {
    const error = new ResponseError("incorrect_login", { status: 401 });

    expect(isErrorCode(error, "incorrect_login")).toBe(true);
    expect(isErrorCode(error, "too_many_requests")).toBe(false);
  });

  it("matches condition subclasses by code", () => {
    expect(
      isErrorCode(
        createResponseError("rate_limit_error", { software: "lemmy" }),
        "rate_limit_error",
      ),
    ).toBe(true);
  });

  it("falls back to message matching for plain errors", () => {
    // Legacy semantics: some code paths throw plain Errors whose message is
    // the code
    expect(isErrorCode(new Error("not_found"), "not_found")).toBe(true);
    expect(isErrorCode(new UnsupportedError("not_found"), "not_found")).toBe(
      true,
    );
  });

  it("rejects non-errors", () => {
    expect(isErrorCode("incorrect_login", "incorrect_login")).toBe(false);
    expect(isErrorCode(undefined, "incorrect_login")).toBe(false);
  });
});
