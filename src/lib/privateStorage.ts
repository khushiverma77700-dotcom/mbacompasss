import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Buckets that are private and must be served through short-lived signed URLs. */
export const PRIVATE_BUCKETS = ["listing-uploads"] as const;

export const isPrivateBucket = (bucket: string): boolean =>
  (PRIVATE_BUCKETS as readonly string[]).includes(bucket);

/** Create a short-lived signed URL for an object stored in a private bucket. */
export const createSignedStorageUrl = async (
  bucket: string,
  path: string,
  expiresInSeconds = 3600,
): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
};

/**
 * Resolve a value for display. Absolute URLs are returned as-is; storage object
 * paths inside a private bucket are signed on demand.
 */
export const useSignedStorageUrl = (bucket: string, pathOrUrl: string | null | undefined): string | null => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const value = pathOrUrl ?? "";
    if (!value) {
      setUrl(null);
      return;
    }
    if (/^https?:\/\//i.test(value) || !isPrivateBucket(bucket)) {
      setUrl(value);
      return;
    }
    void createSignedStorageUrl(bucket, value).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [bucket, pathOrUrl]);

  return url;
};
