import { NotificationDataType } from ".";
import { PageParams } from "./PageParams";

export type GetNotifications = PageParams & {
  type_?: "all" | NotificationDataType;
  unread_only?: boolean;
};
