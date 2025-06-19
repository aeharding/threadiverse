import { describe, it, expect, beforeEach } from "vitest";
import ThreadiverseClient, { clearCache } from "../src/ThreadiverseClient";
import { mockOptions } from "./helpers";

describe("ThreadiverseClient - Basic", () => {
  beforeEach(() => {
    clearCache();
  });

  it("should instantiate without throwing", () => {
    expect(() => {
      new ThreadiverseClient("example.com", mockOptions);
    }).not.toThrow();
  });

  it("should have correct initial state", () => {
    const client = new ThreadiverseClient("example.com", mockOptions);

    // The client should be created but not initialized yet
    expect(client).toBeInstanceOf(ThreadiverseClient);
  });

  it("should throw error when accessing name before initialization", () => {
    const client = new ThreadiverseClient("example.com", mockOptions);

    expect(() => {
      // Accessing the name getter should throw before initialization
      const name = client.name;
      return name;
    }).toThrow(
      "Client not initialized. Wait for getSoftware() or any other async method to resolve first",
    );
  });

  it("should throw error when software getter is called before initialization", async () => {
    const client = new ThreadiverseClient("example.com", mockOptions);

    expect(() => client.software).toThrow(
      "Client not initialized. Wait for getSoftware() or any other async method to resolve first",
    );
  });
});
