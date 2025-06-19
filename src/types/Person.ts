export interface Person {
  id: number;
  name: string;
  display_name?: string;
  avatar?: string;
  actor_id: string;
  published: string;
  local: boolean;
  deleted: boolean;
  bot_account: boolean;
}
