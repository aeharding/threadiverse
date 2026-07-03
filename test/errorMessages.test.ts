import { describe, expect, it } from "vitest";

import {
  getBlockUserErrorMessage,
  getErrorMessage,
  getLoginErrorMessage,
  getVoteErrorMessage,
} from "../src/errorMessages";
import { createResponseError } from "../src/errors";

describe("getLoginErrorMessage", () => {
  it("maps login conditions from any provider", () => {
    expect(
      getLoginErrorMessage(
        createResponseError("incorrect_login", { software: "lemmy" }),
        "lemmy.world",
      ),
    ).toBe("Incorrect login credentials for lemmy.world. Please try again.");

    // PieFed's wire code maps to the same condition, same message
    expect(
      getLoginErrorMessage(
        createResponseError("incorrect_login", { software: "piefed" }),
        "piefed.social",
      ),
    ).toContain("piefed.social");
  });

  it("rate limiting outranks the custom map", () => {
    expect(
      getLoginErrorMessage(createResponseError("too_many_requests"), "x"),
    ).toBe("Too many requests. Please wait a moment and try again.");
  });

  it("falls back for unmapped codes and non-errors", () => {
    expect(
      getLoginErrorMessage(createResponseError("some_new_code"), "x"),
    ).toBe("Connection error, please try again.");
    expect(getLoginErrorMessage(undefined, "x")).toBe(
      "Unknown error occurred, please try again.",
    );
  });
});

describe("getVoteErrorMessage", () => {
  it("maps bot-action and uses the vote fallback", () => {
    expect(getVoteErrorMessage(createResponseError("invalid_bot_action"))).toBe(
      "You marked your account as a bot, so you can't vote.",
    );
    expect(getVoteErrorMessage(new Error("whatever"))).toBe(
      "Problem voting, please try again.",
    );
  });
});

describe("getBlockUserErrorMessage", () => {
  it("interpolates the person name for admin blocks", () => {
    expect(
      getBlockUserErrorMessage(createResponseError("cant_block_admin"), "sam"),
    ).toBe("sam is an admin. You can't block admins.");
  });
});

describe("getErrorMessage", () => {
  it("supports custom maps over condition classes", () => {
    expect(
      getErrorMessage(createResponseError("not_found"), () => "custom"),
    ).toBe("custom");
  });
});
