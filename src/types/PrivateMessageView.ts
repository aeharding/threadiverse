import type { Person } from "./Person";
import { PrivateMessage } from "./PrivateMessage";

/**
 * A private message view.
 */
export interface PrivateMessageView {
  private_message: PrivateMessage;
  creator: Person;
  recipient: Person;
}
