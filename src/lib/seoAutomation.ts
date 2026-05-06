import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SITE_URL = "https://mbacompass.in";
export const SITE_URL = typeof window !== "undefined" ? window.location.origin : DEFAULT_SITE_URL;
export const SEO_SNAPSHOT_KEY_PREFIX = "seo_page__";
export const SEO_SNAPSHOT_UPDATED_EVENT = "seo-snapshot-updated";

export type SEOContentType = "article" | "institute" | "college" | "exam" | "cityPage" | "category" | "course";

const snapshotSlugify = (input?: string | null): string =>
  (input || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export interface SEOKeywordBuckets {
  primary: string[];
  shortTail: string[];
  longTail: string[];
  faq: string[];
  trending: string[];
  lsi: string[];
}

export interface SEOSuggestionsPayload {
  meta_title?: string;
  meta_description?: string;
  h1_tag?: string;
  keywords?: Partial<SEOKeywordBuckets>;
  onPageTips?: string[];
  technicalSEO?: Record<string, any>;
  socialMeta?: Record<string, any>;
  schemaMarkup?: Record<string, any> | Record<string, any>[];
  internalLinks?: Record<string, any>;
  contentSuggestions?: string[];
  competitorInsights?: string[];
  seoScore?: Record<string, any>;
}

export interface StoredSEOSnapshot {
  contentType: SEOContentType;
  recordId: string;
  slug?: string;
  pagePath: string;
  canonicalUrl: string;
  meta_title?: string | null;
  meta_description?: string | null;
  h1_tag?: string | null;
  keywords: string[];
  keywordBuckets: SEOKeywordBuckets;
  onPageTips: string[];
  technicalSEO?: Record<string, any> | null;
  socialMeta?: Record<string, any> | null;
  schemaMarkup?: Record<string, any> | Record<string, any>[] | null;
  internalLinks?: Record<string, any> | null;
  contentSuggestions: string[];
  competitorInsights: string[];
  seoScore?: Record<string, any> | null;
  generatedAt: string;
  updatedAt?: string;
}

export const contentTypeConfig: Record<
  SEOContentType,
  {
    label: string;
    table: string;
    supportsH1Column: boolean;
    supportsSeoColumns: boolean;
    getPath: (item: Record<string, any>) => string;
  }
> = {
  article: {
    label: "Articles",
    table: "articles",
    supportsH1Column: true,
    supportsSeoColumns: true,
    getPath: (item) => `/article/${item.slug}`,
  },
  institute: {
    label: "Institutes",
    table: "institutes",
    supportsH1Column: true,
    supportsSeoColumns: true,
    getPath: (item) => `/institute/${item.slug}`,
  },
  college: {
    label: "Colleges",
    table: "colleges",
    supportsH1Column: true,
    supportsSeoColumns: true,
    getPath: (item) => `/college/${item.slug}`,
  },
  exam: {
    label: "Exams",
    table: "exams",
    supportsH1Column: true,
    supportsSeoColumns: true,
    getPath: (item) => `/exam/${item.slug}`,
  },
  cityPage: {
    label: "City/State Pages",
    table: "city_pages",
    supportsH1Column: true,
    supportsSeoColumns: true,
    getPath: (item) => `/colleges/${item.slug}`,
  },
  category: {
    label: "Categories",
    table: "categories",
    supportsH1Column: false,
    supportsSeoColumns: false,
    getPath: (item) => `/category/${item.slug}`,
  },
  course: {
    label: "Courses",
    table: "courses",
    supportsH1Column: false,
    supportsSeoColumns: false,
    getPath: (item) => `/institute/${item.institute_slug || item._institute_slug || item.institutes?.slug || "institute"}/course/${item.slug || item.course_slug || snapshotSlugify(item.name)}`,
  },
};

const uniqueStrings = (items: (string | null | undefined)[]) =>
  Array.from(
    new Set(
      items
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item)),
    ),
  );

export const mergeKeywordBuckets = (keywords?: Partial<SEOKeywordBuckets>) =>
  uniqueStrings([
    ...(keywords?.primary ?? []),
    ...(keywords?.shortTail ?? []),
    ...(keywords?.longTail ?? []),
    ...(keywords?.faq ?? []),
    ...(keywords?.trending ?? []),
    ...(keywords?.lsi ?? []),
  ]);

export const getSeoSnapshotKey = (contentType: SEOContentType, recordId: string) =>
  `${SEO_SNAPSHOT_KEY_PREFIX}${contentType}__${recordId}`;

export const notifySeoSnapshotUpdated = (contentType: SEOContentType, recordId: string) => {
  if (typeof window === "undefined" || !contentType || !recordId) return;
  const payload = { key: getSeoSnapshotKey(contentType, recordId), contentType, recordId, ts: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent(SEO_SNAPSHOT_UPDATED_EVENT, { detail: payload }));
    window.localStorage.setItem(SEO_SNAPSHOT_UPDATED_EVENT, JSON.stringify(payload));
  } catch {
    window.dispatchEvent(new CustomEvent(SEO_SNAPSHOT_UPDATED_EVENT, { detail: payload }));
  }
};

export const getAbsoluteUrl = (pathOrUrl?: string, fallbackPath = "/") => {
  const candidate = (pathOrUrl || fallbackPath).trim();
  if (!candidate) return `${SITE_URL}${fallbackPath}`;
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    try {
      const parsed = new URL(candidate);
      const siteHost = new URL(SITE_URL).hostname.replace(/^www\./, "");
      const parsedHost = parsed.hostname.replace(/^www\./, "");
      return parsedHost === siteHost ? candidate : `${SITE_URL}${fallbackPath}`;
    } catch {
      return `${SITE_URL}${fallbackPath}`;
    }
  }
  return `${SITE_URL}${candidate.startsWith("/") ? candidate : `/${candidate}`}`;
};

export const buildStoredSeoSnapshot = (
  contentType: SEOContentType,
  item: Record<string, any>,
  suggestions: SEOSuggestionsPayload,
): StoredSEOSnapshot => {
  const pagePath = contentTypeConfig[contentType].getPath(item);
  const keywordBuckets: SEOKeywordBuckets = {
    primary: uniqueStrings(suggestions.keywords?.primary ?? []),
    shortTail: uniqueStrings(suggestions.keywords?.shortTail ?? suggestions.keywords?.primary ?? []),
    longTail: uniqueStrings(suggestions.keywords?.longTail ?? []),
    faq: uniqueStrings(suggestions.keywords?.faq ?? []),
    trending: uniqueStrings(suggestions.keywords?.trending ?? []),
    lsi: uniqueStrings(suggestions.keywords?.lsi ?? []),
  };

  return {
    contentType,
    recordId: item.id,
    slug: item.slug,
    pagePath,
    canonicalUrl: getAbsoluteUrl(suggestions.technicalSEO?.canonicalUrl, pagePath),
    meta_title: suggestions.meta_title ?? null,
    meta_description: suggestions.meta_description ?? null,
    h1_tag: suggestions.h1_tag ?? null,
    keywords: mergeKeywordBuckets(keywordBuckets),
    keywordBuckets,
    onPageTips: suggestions.onPageTips ?? [],
    technicalSEO: suggestions.technicalSEO ?? null,
    socialMeta: suggestions.socialMeta ?? null,
    schemaMarkup: suggestions.schemaMarkup ?? null,
    internalLinks: suggestions.internalLinks ?? null,
    contentSuggestions: suggestions.contentSuggestions ?? [],
    competitorInsights: suggestions.competitorInsights ?? [],
    seoScore: suggestions.seoScore ?? null,
    generatedAt: new Date().toISOString(),
  };
};

export const saveSeoSnapshot = async (snapshot: StoredSEOSnapshot) => {
  const key = getSeoSnapshotKey(snapshot.contentType, snapshot.recordId);
  const value = { ...snapshot, updatedAt: new Date().toISOString() };

  const { data, error } = await supabase
    .from("site_settings")
    .upsert({ key, value: value as unknown as Record<string, any>, updated_at: value.updatedAt }, { onConflict: "key" })
    .select("id")
    .single();

  if (error) throw error;
  notifySeoSnapshotUpdated(snapshot.contentType, snapshot.recordId);
  return data.id;
};

export const useSeoSnapshot = (contentType?: SEOContentType, recordId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["seo-snapshot", contentType, recordId] as const;
  const snapshotKey = contentType && recordId ? getSeoSnapshotKey(contentType, recordId) : null;

  useEffect(() => {
    if (!snapshotKey) return;
    const invalidate = (incomingKey?: string) => {
      if (!incomingKey || incomingKey === snapshotKey) {
        queryClient.invalidateQueries({ queryKey });
      }
    };
    const onCustom = (event: Event) => invalidate((event as CustomEvent<{ key?: string }>).detail?.key);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SEO_SNAPSHOT_UPDATED_EVENT || !event.newValue) return;
      try { invalidate(JSON.parse(event.newValue)?.key); } catch { invalidate(); }
    };
    window.addEventListener(SEO_SNAPSHOT_UPDATED_EVENT, onCustom as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SEO_SNAPSHOT_UPDATED_EVENT, onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [queryClient, queryKey, snapshotKey]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value, updated_at")
        .eq("key", getSeoSnapshotKey(contentType!, recordId!))
        .limit(1);

      if (error) throw error;

      const row = data?.[0];
      if (!row?.value) return null;

      return {
        ...(row.value as Record<string, any>),
        updatedAt: row.updated_at,
      } as StoredSEOSnapshot;
    },
    enabled: Boolean(contentType && recordId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
};

export const fetchAllSeoSnapshots = async () => {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value, updated_at")
    .like("key", `${SEO_SNAPSHOT_KEY_PREFIX}%`);

  if (error) throw error;

  return (data || []).reduce<Record<string, StoredSEOSnapshot>>((acc, row: any) => {
    const snapshot = {
      ...(row.value as Record<string, any>),
      updatedAt: row.updated_at,
    } as StoredSEOSnapshot;

    if (snapshot?.contentType && snapshot?.recordId) {
      acc[`${snapshot.contentType}:${snapshot.recordId}`] = snapshot;
    }

    return acc;
  }, {});
};