import { useEffect, useState } from "react";

/**
 * Gravatar utility functions for generating avatar URLs from email addresses.
 * Uses SHA-256 hashing and Gravatar's free API.
 */

export interface GravatarOptions {
  size?: number;
  default?:
    | "initials"
    | "identicon"
    | "monsterid"
    | "mp"
    | "robohash"
    | "blank";
  name?: string;
  rating?: "g" | "pg" | "r" | "x";
}

/**
 * Generates a Gravatar URL for the given email address.
 *
 * @param email - The email address to generate a Gravatar URL for
 * @param options - Optional configuration for the Gravatar image
 * @returns Promise<string> - The Gravatar URL
 *
 * @example
 * const url = await getGravatarUrl('user@example.com', {
 *   size: 200,
 *   default: 'initials',
 *   name: 'John Doe'
 * });
 */
export async function getGravatarUrl(
  email: string,
  options: GravatarOptions = {},
): Promise<string> {
  // Normalize email: trim whitespace and convert to lowercase
  const normalizedEmail = email.trim().toLowerCase();

  // Create SHA-256 hash using Web Crypto API (built into modern browsers)
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedEmail);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert hash buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Build query parameters
  const size = options.size || 80;
  const defaultImage = options.default || "initials";
  const rating = options.rating || "g";

  const params = new URLSearchParams({
    s: size.toString(),
    d: defaultImage,
    r: rating,
  });

  // Add name parameter for initials fallback
  if (options.name && defaultImage === "initials") {
    params.set("name", options.name);
  }

  return `https://gravatar.com/avatar/${hash}?${params.toString()}`;
}

/**
 * Synchronous wrapper that returns a placeholder until the hash is computed.
 * This is useful for components that need immediate rendering.
 *
 * @param options - Optional configuration for the Gravatar image
 * @returns string - A placeholder Gravatar URL
 */
export function getGravatarUrlSync(options: GravatarOptions = {}): string {
  const size = options.size || 80;
  const defaultImage = options.default || "initials";
  const rating = options.rating || "g";

  const params = new URLSearchParams({
    s: size.toString(),
    d: defaultImage,
    r: rating,
  });

  if (options.name && defaultImage === "initials") {
    params.set("name", options.name);
  }

  // Return a generic gravatar URL that will show the default/fallback
  // This will work as a placeholder until the real hash is computed
  return `https://gravatar.com/avatar/00000000000000000000000000000000?${params.toString()}`;
}

/**
 * React hook for getting a Gravatar URL. Handles the async nature of hashing.
 *
 * @param email - The email address to generate a Gravatar URL for
 * @param options - Optional configuration for the Gravatar image
 * @returns string - The Gravatar URL (starts with placeholder, updates when hash is ready)
 */
export function useGravatarUrl(
  email: string,
  options: GravatarOptions = {},
): string {
  const [url, setUrl] = useState<string>(() => getGravatarUrlSync(options));

  useEffect(() => {
    let mounted = true;

    const loadGravatar = async () => {
      const gravatarUrl = await getGravatarUrl(email, options);
      if (mounted) {
        setUrl(gravatarUrl);
      }
    };

    loadGravatar();

    return () => {
      mounted = false;
    };
  }, [email, options.size, options.default, options.name, options.rating]);

  return url;
}
