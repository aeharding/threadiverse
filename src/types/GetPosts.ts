import { ListingType } from ".";
import { PageParams } from "./PageParams";
import { PostSortType } from "./PostSortType";

export type GetPosts = PageParams &
  PostSortType & {
    community_id?: number;
    community_name?: string;
    show_hidden?: boolean;
    /**
     * If true, then show the nsfw posts (even if your user setting is to hide them)
     */
    show_nsfw?: boolean;
    /**
     * If true, then show the read posts (even if your user setting is to hide them)
     */
    show_read?: boolean;

    type_?: ListingType;
  };
