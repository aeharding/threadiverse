import { describe, it, expect, beforeEach } from "vitest";
import { clearCache } from "../src/ThreadiverseClient";
import { setupProviderTest } from "./helpers";

describe("ThreadiverseClient - Providers", () => {
  beforeEach(() => {
    clearCache();
  });

  describe("lemmy", () => {
    it("should call wellknown endpoints and getPosts properly", async () => {
      const { client, mockFetch } = setupProviderTest({
        baseUrl: "https://lemmy.example.com",
        nodeinfoHref: "https://lemmy.example.com/nodeinfo/2.1",
        nodeinfoSoftware: { name: "lemmy", version: "0.19.6" },
      });

      // Call getPosts which should trigger the wellknown discovery
      await client.getPosts({ community_name: "test" });

      // Verify that fetch was called for wellknown discovery
      expect(mockFetch).toHaveBeenCalledWith(
        "https://lemmy.example.com/.well-known/nodeinfo",
        expect.objectContaining({
          headers: {
            Accept: "application/json",
          },
        }),
      );

      // Verify that fetch was called for nodeinfo
      expect(mockFetch).toHaveBeenCalledWith(
        "https://lemmy.example.com/nodeinfo/2.1",
        expect.objectContaining({
          headers: {
            Accept: "application/json",
          },
        }),
      );

      // Explicitly check the getPosts endpoint and options
      expect(mockFetch).toHaveBeenCalledWith(
        "https://lemmy.example.com/api/v3/post/list?community_name=test",
        expect.objectContaining({
          headers: {},
          method: "GET",
        }),
      );

      // Verify that fetch was called at least 3 times (wellknown + nodeinfo + getPosts)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("piefed", () => {
    it("should call wellknown endpoints and getPosts properly", async () => {
      const { client, mockFetch } = setupProviderTest({
        baseUrl: "https://piefed.example.com",
        nodeinfoHref: "https://piefed.example.com/nodeinfo/2.1",
        nodeinfoSoftware: { name: "piefed", version: "0.1.0" },
      });

      // Call getPosts which should trigger the wellknown discovery
      await client.getPosts({ community_name: "test" });

      // Verify that fetch was called for wellknown discovery
      expect(mockFetch).toHaveBeenCalledWith(
        "https://piefed.example.com/.well-known/nodeinfo",
        expect.objectContaining({
          headers: {
            Accept: "application/json",
          },
        }),
      );

      // Verify that fetch was called for nodeinfo
      expect(mockFetch).toHaveBeenCalledWith(
        "https://piefed.example.com/nodeinfo/2.1",
        expect.objectContaining({
          headers: {
            Accept: "application/json",
          },
        }),
      );

      // Explicitly check the getPosts endpoint and options
      const thirdCall = mockFetch.mock.calls[2][0] as Request;
      expect(thirdCall).toBeInstanceOf(Request);
      expect(thirdCall.url).toContain(
        "https://piefed.example.com/api/alpha/post/list",
      );
      expect(thirdCall.method).toBe("GET");

      // Verify that fetch was called at least 3 times (wellknown + nodeinfo + getPosts)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
