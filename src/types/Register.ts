/**
 * Register / Sign up to lemmy.
 */
export type Register = {
  /**
   * An answer is mandatory if require application is enabled on the server
   */
  answer?: string;
  /**
   * Your captcha answer.
   */
  captcha_answer?: string;
  /**
   * The UUID of the captcha item.
   */
  captcha_uuid?: string;
  /**
   * email is mandatory if email verification is enabled on the server
   */
  email?: string;
  password: string;
  password_verify: string;
  show_nsfw?: boolean;
  username: string;
};
