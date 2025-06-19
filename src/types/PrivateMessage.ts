/**
 * A private message.
 */
export interface PrivateMessage {
  id: number;
  creator_id: number;
  recipient_id: number;
  content: string;
  deleted: boolean;
  read: boolean;
  published: string;
  updated?: string;
  ap_id: string;
  local: boolean;
}
