/**
 * Register / Sign up to lemmy.
 */
export type Register = {
  username: string;
  password: string;
  password_verify: string;
  show_nsfw?: boolean;
  /**
   * email is mandatory if email verification is enabled on the server
   */
  email?: string;
  /**
   * The UUID of the captcha item.
   */
  captcha_uuid?: string;
  /**
   * Your captcha answer.
   */
  captcha_answer?: string;
  /**
   * An answer is mandatory if require application is enabled on the server
   */
  answer?: string;
};
