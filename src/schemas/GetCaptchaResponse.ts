import { z } from "zod/v4-mini";

/**
 * A captcha response.
 */
export const CaptchaResponse = z.object({
  /**
   * A Base64 encoded png
   */
  png: z.string(),
  /**
   * The UUID for the captcha item.
   */
  uuid: z.string(),
  /**
   * A Base64 encoded wav audio
   */
  wav: z.string(),
});

/**
 * A wrapper for the captcha response.
 */
export const GetCaptchaResponse = z.object({
  /**
   * Will be None if captchas are disabled.
   */
  ok: z.optional(CaptchaResponse),
});
