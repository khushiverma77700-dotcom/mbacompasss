// Canonical URL helper.
//
// All public, indexable pages must emit a self-referencing canonical that
// points at the SAME canonical host — otherwise crawlers that land on the
// page via www.mbacompass.in, the lovable preview, or any future alias get
// different canonical tags for the same content, and Google Search Console
// reports "Duplicate without user-selected canonical".
//
// Keep this in sync with the host enforced by the redirect script in
// index.html and the BASE_URL used by serve-sitemap.

import { publicPath } from "./publicPaths";
export const CANONICAL_HOST = "https://mbacompass.in";

/** Build a fully-qualified canonical URL for a given path (e.g. "/article/foo"). */
export const canonicalUrl = (path: string): string => {
  const url = new URL(path || "/", CANONICAL_HOST);
  return `${CANONICAL_HOST}${publicPath(url.pathname).replace(/\/$/, "")}`;
};
