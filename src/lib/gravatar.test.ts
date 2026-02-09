import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { getGravatarUrl, getGravatarUrlSync, useGravatarUrl } from "./gravatar";

describe("gravatar utilities", () => {
  describe("getGravatarUrl", () => {
    it("should generate a valid gravatar URL with default options", async () => {
      const url = await getGravatarUrl("test@example.com");

      expect(url).toMatch(/^https:\/\/gravatar\.com\/avatar\/[a-f0-9]{64}\?/);
      expect(url).toContain("s=80"); // default size
      expect(url).toContain("d=initials"); // default fallback
      expect(url).toContain("r=g"); // default rating
    });

    it("should normalize email (trim and lowercase)", async () => {
      const url1 = await getGravatarUrl("test@example.com");
      const url2 = await getGravatarUrl("  TEST@EXAMPLE.COM  ");

      // Extract hash from URLs
      const hash1 = url1.match(/avatar\/([a-f0-9]{64})/)?.[1];
      const hash2 = url2.match(/avatar\/([a-f0-9]{64})/)?.[1];

      expect(hash1).toBe(hash2);
    });

    it("should respect custom size option", async () => {
      const url = await getGravatarUrl("test@example.com", { size: 200 });

      expect(url).toContain("s=200");
    });

    it("should respect custom default image option", async () => {
      const url = await getGravatarUrl("test@example.com", {
        default: "identicon",
      });

      expect(url).toContain("d=identicon");
    });

    it("should respect custom rating option", async () => {
      const url = await getGravatarUrl("test@example.com", { rating: "pg" });

      expect(url).toContain("r=pg");
    });

    it("should include name parameter when using initials default", async () => {
      const url = await getGravatarUrl("test@example.com", {
        default: "initials",
        name: "John Doe",
      });

      expect(url).toContain("name=John+Doe");
    });

    it("should NOT include name parameter when not using initials default", async () => {
      const url = await getGravatarUrl("test@example.com", {
        default: "identicon",
        name: "John Doe",
      });

      expect(url).not.toContain("name=");
    });

    it("should generate consistent hash for same email", async () => {
      const url1 = await getGravatarUrl("consistent@example.com");
      const url2 = await getGravatarUrl("consistent@example.com");

      expect(url1).toBe(url2);
    });

    it("should generate different hash for different emails", async () => {
      const url1 = await getGravatarUrl("user1@example.com");
      const url2 = await getGravatarUrl("user2@example.com");

      const hash1 = url1.match(/avatar\/([a-f0-9]{64})/)?.[1];
      const hash2 = url2.match(/avatar\/([a-f0-9]{64})/)?.[1];

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("getGravatarUrlSync", () => {
    it("should return a placeholder URL with zeroed hash", () => {
      const url = getGravatarUrlSync();

      expect(url).toMatch(/^https:\/\/gravatar\.com\/avatar\/0{32}\?/);
    });

    it("should use default options", () => {
      const url = getGravatarUrlSync();

      expect(url).toContain("s=80");
      expect(url).toContain("d=initials");
      expect(url).toContain("r=g");
    });

    it("should respect custom options", () => {
      const url = getGravatarUrlSync({
        size: 150,
        default: "robohash",
        rating: "r",
      });

      expect(url).toContain("s=150");
      expect(url).toContain("d=robohash");
      expect(url).toContain("r=r");
    });

    it("should include name parameter when using initials default", () => {
      const url = getGravatarUrlSync({
        default: "initials",
        name: "Jane Smith",
      });

      expect(url).toContain("name=Jane+Smith");
    });

    it("should NOT include name parameter when not using initials default", () => {
      const url = getGravatarUrlSync({
        default: "monsterid",
        name: "Jane Smith",
      });

      expect(url).not.toContain("name=");
    });
  });

  describe("useGravatarUrl", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should initially return a placeholder URL", () => {
      const { result } = renderHook(() => useGravatarUrl("hook@example.com"));

      // Initial value is the sync placeholder
      expect(result.current).toMatch(
        /^https:\/\/gravatar\.com\/avatar\/0{32}\?/,
      );
    });

    it("should update to real URL after async hash completes", async () => {
      const { result } = renderHook(() => useGravatarUrl("hook@example.com"));

      await waitFor(() => {
        expect(result.current).toMatch(
          /^https:\/\/gravatar\.com\/avatar\/[a-f0-9]{64}\?/,
        );
        // Should no longer be the placeholder
        expect(result.current).not.toContain("/avatar/00000000");
      });
    });

    it("should pass options to the generated URL", async () => {
      const { result } = renderHook(() =>
        useGravatarUrl("hook@example.com", {
          size: 120,
          default: "mp",
          rating: "pg",
        }),
      );

      await waitFor(() => {
        expect(result.current).toContain("s=120");
        expect(result.current).toContain("d=mp");
        expect(result.current).toContain("r=pg");
      });
    });

    it("should include name in URL when using initials default", async () => {
      const { result } = renderHook(() =>
        useGravatarUrl("hook@example.com", {
          default: "initials",
          name: "Test User",
        }),
      );

      await waitFor(() => {
        expect(result.current).toContain("name=Test+User");
      });
    });

    it("should update URL when email changes", async () => {
      const { result, rerender } = renderHook(
        ({ email }) => useGravatarUrl(email),
        { initialProps: { email: "first@example.com" } },
      );

      // Wait for first URL to resolve
      await waitFor(() => {
        expect(result.current).not.toContain("/avatar/00000000");
      });

      const firstUrl = result.current;

      // Change email
      rerender({ email: "second@example.com" });

      // Wait for new URL
      await waitFor(() => {
        expect(result.current).not.toBe(firstUrl);
        expect(result.current).not.toContain("/avatar/00000000");
      });
    });
  });
});
