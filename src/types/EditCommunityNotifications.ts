import type { z } from "zod/v4-mini";

import type { CommunityNotificationsMode } from "../schemas/CommunityNotificationsMode";

export interface EditCommunityNotifications {
  community_id: number;
  mode: z.infer<typeof CommunityNotificationsMode>;
}
