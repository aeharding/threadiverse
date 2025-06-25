import { z } from "zod/v4-mini";

import { Person } from "./Person";
import { PrivateMessage } from "./PrivateMessage";

/**
 * A private message view.
 */
export const PrivateMessageView = z.object({
  creator: Person,
  private_message: PrivateMessage,
  recipient: Person,
});
