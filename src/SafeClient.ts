import type { BaseClient } from "./BaseClient";
import type { UnsafePiefedClient } from "./providers/piefed";
import {
  PostView,
  CommentView,
  CommunityView,
  PersonView,
  PersonMentionView,
  CommentReplyView,
  PrivateMessageView,
  ResolveObjectResponse,
  GetSiteResponse,
  GetCommunityResponse,
  GetUnreadCountResponse,
  FederatedInstances,
  UploadImageResponse,
  LoginResponse,
  GetCaptchaResponse,
  ListReportsResponse,
  GetModlogResponse,
  GetPersonDetailsResponse,
  ListPersonContentResponse,
  PostReportView,
  CommentReportView,
  GetSiteMetadataResponse,
  Notification,
} from "./schemas";

export default function buildSafeClient(Client: typeof UnsafePiefedClient) {
  return class SafeClient extends Client {
    async resolveObject(...params: Parameters<BaseClient["resolveObject"]>) {
      const response = await super.resolveObject(...params);
      return ResolveObjectResponse.parse(response);
    }

    async getSite(...params: Parameters<BaseClient["getSite"]>) {
      const response = await super.getSite(...params);
      return GetSiteResponse.parse(response);
    }

    async getCommunity(...params: Parameters<BaseClient["getCommunity"]>) {
      const response = await super.getCommunity(...params);
      return GetCommunityResponse.parse(response);
    }

    async getPosts(...params: Parameters<BaseClient["getPosts"]>) {
      const response = await super.getPosts(...params);
      return {
        ...response,
        posts: response.posts.map((post) => PostView.parse(post)),
      };
    }

    async getComments(...params: Parameters<BaseClient["getComments"]>) {
      const response = await super.getComments(...params);
      return {
        ...response,
        comments: response.comments.map((comment) =>
          CommentView.parse(comment),
        ),
      };
    }

    async getPost(...params: Parameters<BaseClient["getPost"]>) {
      const { post_view } = await super.getPost(...params);
      return { post_view: PostView.parse(post_view) };
    }

    async createPost(...params: Parameters<BaseClient["createPost"]>) {
      const { post_view } = await super.createPost(...params);
      return { post_view: PostView.parse(post_view) };
    }

    async editPost(...params: Parameters<BaseClient["editPost"]>) {
      const { post_view } = await super.editPost(...params);
      return { post_view: PostView.parse(post_view) };
    }

    async createComment(...params: Parameters<BaseClient["createComment"]>) {
      const { comment_view } = await super.createComment(...params);
      return { comment_view: CommentView.parse(comment_view) };
    }

    async editComment(...params: Parameters<BaseClient["editComment"]>) {
      const { comment_view } = await super.editComment(...params);
      return { comment_view: CommentView.parse(comment_view) };
    }

    async createPrivateMessage(
      ...params: Parameters<BaseClient["createPrivateMessage"]>
    ) {
      const { private_message_view } = await super.createPrivateMessage(
        ...params,
      );
      return {
        private_message_view: PrivateMessageView.parse(private_message_view),
      };
    }

    async login(...params: Parameters<BaseClient["login"]>) {
      const response = await super.login(...params);
      return LoginResponse.parse(response);
    }

    async logout(...params: Parameters<BaseClient["logout"]>) {
      return super.logout(...params);
    }

    async getUnreadCount(...params: Parameters<BaseClient["getUnreadCount"]>) {
      const response = await super.getUnreadCount(...params);
      return GetUnreadCountResponse.parse(response);
    }

    async getFederatedInstances(
      ...params: Parameters<BaseClient["getFederatedInstances"]>
    ) {
      const { federated_instances } = await super.getFederatedInstances(
        ...params,
      );
      return {
        federated_instances: federated_instances
          ? FederatedInstances.parse(federated_instances)
          : undefined,
      };
    }

    async markPostAsRead(...params: Parameters<BaseClient["markPostAsRead"]>) {
      return super.markPostAsRead(...params);
    }

    async likePost(...params: Parameters<BaseClient["likePost"]>) {
      const { post_view } = await super.likePost(...params);
      return { post_view: PostView.parse(post_view) };
    }

    async likeComment(...params: Parameters<BaseClient["likeComment"]>) {
      const { comment_view } = await super.likeComment(...params);
      return { comment_view: CommentView.parse(comment_view) };
    }

    async savePost(...params: Parameters<BaseClient["savePost"]>) {
      const { post_view } = await super.savePost(...params);
      return { post_view: PostView.parse(post_view) };
    }

    async deletePost(...params: Parameters<BaseClient["deletePost"]>) {
      const { post_view } = await super.deletePost(...params);
      return { post_view: PostView.parse(post_view) };
    }

    async removePost(...params: Parameters<BaseClient["removePost"]>) {
      const { post_view } = await super.removePost(...params);
      return { post_view: PostView.parse(post_view) };
    }

    async lockPost(...params: Parameters<BaseClient["lockPost"]>) {
      const { post_view } = await super.lockPost(...params);
      return { post_view: PostView.parse(post_view) };
    }

    async featurePost(...params: Parameters<BaseClient["featurePost"]>) {
      const { post_view } = await super.featurePost(...params);
      return { post_view: PostView.parse(post_view) };
    }

    async listCommunities(
      ...params: Parameters<BaseClient["listCommunities"]>
    ) {
      const { communities } = await super.listCommunities(...params);
      return {
        communities: communities.map((community) =>
          CommunityView.parse(community),
        ),
      };
    }

    async search(...params: Parameters<BaseClient["search"]>) {
      const { comments, posts, communities, users } = await super.search(
        ...params,
      );
      return {
        comments: comments.map((comment) => CommentView.parse(comment)),
        posts: posts.map((post) => PostView.parse(post)),
        communities: communities.map((community) =>
          CommunityView.parse(community),
        ),
        users: users.map((user) => PersonView.parse(user)),
      };
    }

    async getPersonDetails(
      ...params: Parameters<BaseClient["getPersonDetails"]>
    ) {
      const response = await super.getPersonDetails(...params);
      return GetPersonDetailsResponse.parse(response);
    }

    async listPersonContent(
      ...params: Parameters<BaseClient["listPersonContent"]>
    ) {
      const response = await super.listPersonContent(...params);
      return ListPersonContentResponse.parse(response);
    }

    async listPersonSaved(
      ...params: Parameters<BaseClient["listPersonSaved"]>
    ) {
      const { content, next_page } = await super.listPersonSaved(...params);
      return {
        content: content.map((item) => {
          if ("post" in item) {
            return PostView.parse(item);
          } else {
            return CommentView.parse(item);
          }
        }),
        next_page,
      };
    }

    async getNotifications(
      ...params: Parameters<BaseClient["getNotifications"]>
    ) {
      const { notifications } = await super.getNotifications(...params);
      return {
        notifications: notifications.map((notification) =>
          Notification.parse(notification),
        ),
      };
    }

    async getPersonMentions(
      ...params: Parameters<BaseClient["getPersonMentions"]>
    ) {
      const { mentions } = await super.getPersonMentions(...params);
      return {
        mentions: mentions.map((mention) => PersonMentionView.parse(mention)),
      };
    }

    async markPersonMentionAsRead(
      ...params: Parameters<BaseClient["markPersonMentionAsRead"]>
    ) {
      return super.markPersonMentionAsRead(...params);
    }

    async markPrivateMessageAsRead(
      ...params: Parameters<BaseClient["markPrivateMessageAsRead"]>
    ) {
      return super.markPrivateMessageAsRead(...params);
    }

    async markCommentReplyAsRead(
      ...params: Parameters<BaseClient["markCommentReplyAsRead"]>
    ) {
      return super.markCommentReplyAsRead(...params);
    }

    async markAllAsRead(...params: Parameters<BaseClient["markAllAsRead"]>) {
      return super.markAllAsRead(...params);
    }

    async getPrivateMessages(
      ...params: Parameters<BaseClient["getPrivateMessages"]>
    ) {
      const { private_messages } = await super.getPrivateMessages(...params);
      return {
        private_messages: private_messages.map((message) =>
          PrivateMessageView.parse(message),
        ),
      };
    }

    async saveUserSettings(
      ...params: Parameters<BaseClient["saveUserSettings"]>
    ) {
      return super.saveUserSettings(...params);
    }

    async blockInstance(...params: Parameters<BaseClient["blockInstance"]>) {
      return super.blockInstance(...params);
    }

    async uploadImage(...params: Parameters<BaseClient["uploadImage"]>) {
      const response = await super.uploadImage(...params);
      return UploadImageResponse.parse(response);
    }

    async deleteImage(...params: Parameters<BaseClient["deleteImage"]>) {
      return super.deleteImage(...params);
    }

    async register(...params: Parameters<BaseClient["register"]>) {
      const response = await super.register(...params);
      return LoginResponse.parse(response);
    }

    async getCaptcha(...params: Parameters<BaseClient["getCaptcha"]>) {
      const response = await super.getCaptcha(...params);
      return GetCaptchaResponse.parse(response);
    }

    async listReports(...params: Parameters<BaseClient["listReports"]>) {
      const response = await super.listReports(...params);
      return ListReportsResponse.parse(response);
    }

    async getModlog(...params: Parameters<BaseClient["getModlog"]>) {
      const response = await super.getModlog(...params);
      return GetModlogResponse.parse(response);
    }

    async getReplies(...params: Parameters<BaseClient["getReplies"]>) {
      const { replies } = await super.getReplies(...params);
      return {
        replies: replies.map((reply) => CommentReplyView.parse(reply)),
      };
    }

    async banFromCommunity(
      ...params: Parameters<BaseClient["banFromCommunity"]>
    ) {
      return super.banFromCommunity(...params);
    }

    async saveComment(...params: Parameters<BaseClient["saveComment"]>) {
      const { comment_view } = await super.saveComment(...params);
      return { comment_view: CommentView.parse(comment_view) };
    }

    async distinguishComment(
      ...params: Parameters<BaseClient["distinguishComment"]>
    ) {
      const { comment_view } = await super.distinguishComment(...params);
      return { comment_view: CommentView.parse(comment_view) };
    }

    async deleteComment(...params: Parameters<BaseClient["deleteComment"]>) {
      const { comment_view } = await super.deleteComment(...params);
      return { comment_view: CommentView.parse(comment_view) };
    }

    async removeComment(...params: Parameters<BaseClient["removeComment"]>) {
      const { comment_view } = await super.removeComment(...params);
      return { comment_view: CommentView.parse(comment_view) };
    }

    async followCommunity(
      ...params: Parameters<BaseClient["followCommunity"]>
    ) {
      const { community_view } = await super.followCommunity(...params);
      return { community_view: CommunityView.parse(community_view) };
    }

    async blockCommunity(...params: Parameters<BaseClient["blockCommunity"]>) {
      const { community_view } = await super.blockCommunity(...params);
      return { community_view: CommunityView.parse(community_view) };
    }

    async blockPerson(...params: Parameters<BaseClient["blockPerson"]>) {
      const { person_view } = await super.blockPerson(...params);
      return { person_view: PersonView.parse(person_view) };
    }

    async createPostReport(
      ...params: Parameters<BaseClient["createPostReport"]>
    ) {
      return super.createPostReport(...params);
    }

    async createCommentReport(
      ...params: Parameters<BaseClient["createCommentReport"]>
    ) {
      return super.createCommentReport(...params);
    }

    async createPrivateMessageReport(
      ...params: Parameters<BaseClient["createPrivateMessageReport"]>
    ) {
      return super.createPrivateMessageReport(...params);
    }

    async getSiteMetadata(
      ...params: Parameters<BaseClient["getSiteMetadata"]>
    ) {
      const response = await super.getSiteMetadata(...params);
      return GetSiteMetadataResponse.parse(response);
    }

    async resolvePostReport(
      ...params: Parameters<BaseClient["resolvePostReport"]>
    ) {
      return super.resolvePostReport(...params);
    }

    async resolveCommentReport(
      ...params: Parameters<BaseClient["resolveCommentReport"]>
    ) {
      return super.resolveCommentReport(...params);
    }

    async getRandomCommunity(
      ...params: Parameters<BaseClient["getRandomCommunity"]>
    ) {
      const { community_view } = await super.getRandomCommunity(...params);
      return { community_view: CommunityView.parse(community_view) };
    }

    async listPostReports(
      ...params: Parameters<BaseClient["listPostReports"]>
    ) {
      const { post_reports } = await super.listPostReports(...params);
      return {
        post_reports: post_reports.map((report) =>
          PostReportView.parse(report),
        ),
      };
    }

    async listCommentReports(
      ...params: Parameters<BaseClient["listCommentReports"]>
    ) {
      const { comment_reports } = await super.listCommentReports(...params);
      return {
        comment_reports: comment_reports.map((report) =>
          CommentReportView.parse(report),
        ),
      };
    }
  };
}
