import type { z } from "zod/v4-mini";

import type { PostNotificationsMode } from "../schemas/PostNotificationsMode";

export interface EditPostNotifications {
  mode: z.infer<typeof PostNotificationsMode>;
  post_id: number;
}
