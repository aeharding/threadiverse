import { describe, expect, it } from "vitest";

import { UnsupportedError } from "../src/errors";
import { FakePiefedInstance } from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

const HOST = "liked.piefed.test";

function setup() {
  const instance = new FakePiefedInstance({ host: HOST });
  const creator = instance.build.person({ id: 100, user_name: "alex" });
  const parentPost = instance.build.postView({
    creator,
    id: 10,
    title: "Parent post",
  });
  const client = new ThreadiverseClient(
    instance.origin,
    instance.clientOptions(),
  );

  return { client, creator, instance, parentPost };
}

describe("piefed listPersonLiked", () => {
  it("uses PieFed's upvote filter and maps a merged canonical page", async () => {
    const { client, creator, instance, parentPost } = setup();
    const likedPost = instance.build.postView({
      creator,
      id: 11,
      myVote: 1,
      title: "Liked post",
    });
    likedPost.post.published = "2026-01-01T00:00:00Z";

    const likedComment = instance.build.commentView({
      body: "Liked comment",
      creator,
      id: 21,
      myVote: 1,
      post: parentPost,
      published: "2026-01-02T00:00:00Z",
    });
    const wrongPolarityPost = instance.build.postView({
      creator,
      id: 12,
      myVote: -1,
      title: "Unexpected server result",
    });

    instance.mock("GET /api/alpha/post/list", {
      json: instance.build.postListResponse(
        [likedPost, wrongPolarityPost],
        "4",
      ),
    });
    instance.mock("GET /api/alpha/comment/list", {
      json: instance.build.commentListResponse([likedComment], "4"),
    });

    const response = await client.listPersonLiked({
      like_type: "liked_only",
      limit: 2,
      page_cursor: 3,
    });

    expect(
      response.data.map((item) =>
        "comment" in item
          ? `comment:${item.comment.id}`
          : `post:${item.post.id}`,
      ),
    ).toEqual(["comment:21", "post:11"]);
    expect(response.data.map((item) => item.my_vote)).toEqual([1, 1]);
    expect(response.next_page).toBe(4);

    for (const route of [
      "GET /api/alpha/post/list",
      "GET /api/alpha/comment/list",
    ] as const) {
      const query = instance.calls(route)[0]!.query;
      expect(query.get("liked_only")).toBe("true");
      expect(query.get("limit")).toBe("2");
      expect(query.get("page")).toBe("3");
      expect(query.get("sort")).toBe("New");
    }
  });

  it("rejects downvoted feeds before issuing a misleading partial request", async () => {
    const { client, instance } = setup();

    await expect(
      client.listPersonLiked({
        like_type: "disliked_only",
        limit: 2,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Listing downvoted content is not supported by piefed",
        name: "UnsupportedError",
      }),
    );
    await expect(
      client.listPersonLiked({ like_type: "disliked_only" }),
    ).rejects.toBeInstanceOf(UnsupportedError);

    for (const route of [
      "GET /api/alpha/post/list",
      "GET /api/alpha/comment/list",
    ] as const) {
      expect(instance.calls(route)).toEqual([]);
    }
  });
});
