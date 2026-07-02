import { describe, expect, it } from "vitest";

import {
  isErrorCode,
  LemmyResponseError,
  ResponseError,
  UnsupportedError,
} from "../src/errors";

describe("isErrorCode", () => {
  it("matches ResponseError by code", () => {
    const error = new ResponseError("incorrect_login", { status: 401 });

    expect(isErrorCode(error, "incorrect_login")).toBe(true);
    expect(isErrorCode(error, "too_many_requests")).toBe(false);
  });

  it("matches subclasses by code", () => {
    expect(
      isErrorCode(
        new LemmyResponseError("rate_limit_error"),
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
