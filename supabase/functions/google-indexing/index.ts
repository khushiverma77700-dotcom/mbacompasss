import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications";
const SEARCH_CONSOLE_SITES_API_URL = "https://www.googleapis.com/webmasters/v3/sites";
const URL_INSPECTION_API_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";
const WEBMASTERS_READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const SITE_URL = "https://bschoolbuzz.com";
const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
const MAX_BATCH_SIZE = 100;
const BATCH_DELAY_MS = 150;
const STATUS_CHECK_BATCH_SIZE = 12;
const STATUS_CHECK_CONCURRENCY = 3;

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
}

interface ApiDiagnostics {
  action?: string;
  requested_url?: string;
  error_stage?: string;
  google_status?: number;
  processing_time_ms?: number;
  retry_count?: number;
  response_preview?: string;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  diagnostics?: ApiDiagnostics & Record<string, unknown>;
}

interface GoogleSubmissionResult {
  ok: boolean;
  status: number;
  data: unknown;
  errorMessage: string | null;
  diagnostics: ApiDiagnostics;
}

interface BatchEntry {
  url: string;
  page_type?: string;
  record_id?: string | null;
}

interface StoredIndexingUrl {
  id: string;
  url: string;
  page_type: string;
  record_id: string | null;
  status: string;
  last_submitted_at: string | null;
  indexed_at: string | null;
  last_response: unknown;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

function respond<T>(payload: ApiResponse<T>) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createStageError(
  stage: string,
  message: string,
  details: Record<string, unknown> = {}
) {
  const error = new Error(message) as Error & {
    stage: string;
    details: Record<string, unknown>;
  };

  error.stage = stage;
  error.details = details;
  return error;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function stringifyValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getGoogleErrorMessage(value: unknown): string {
  if (!value) return "Google Indexing API request failed";
  if (typeof value === "string") return value;

  const record = value as Record<string, any>;

  if (typeof record.error === "string") return record.error;
  if (record.error?.message) return String(record.error.message);
  if (record.message) return String(record.message);

  return stringifyValue(value);
}

function classifyGoogleErrorStage(status: number, data: unknown) {
  const message = getGoogleErrorMessage(data).toLowerCase();

  if (status === 401) return "auth_issue";
  if (status === 403 && message.includes("quota")) return "quota_exceeded";
  if (
    status === 403 &&
    (message.includes("permission") ||
      message.includes("owner") ||
      message.includes("verified"))
  ) {
    return "permission_denied";
  }
  if (status === 429) return "quota_exceeded";
  if (status === 400 && message.includes("url")) return "invalid_url";
  if (status >= 500) return "google_server_error";

  return "google_request_failed";
}

function maybeUnwrapQuotedJson(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed.trim() : null;
  } catch {
    return null;
  }
}

function maybeDecodeBase64(raw: string) {
  try {
    const decoded = atob(raw.replace(/\s+/g, "")).trim();
    return decoded.startsWith("{") ? decoded : null;
  } catch {
    return null;
  }
}

function maybeDecodeBase64Text(raw: string) {
  try {
    const decoded = atob(raw.replace(/\s+/g, "")).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

function normalizeMultilinePrivateKey(raw: string) {
  return raw.replace(
    /"private_key"\s*:\s*"([\s\S]*?)"\s*,\s*"client_email"/m,
    (_, key: string) => `"private_key": ${JSON.stringify(key)}, "client_email"`
  );
}

function isServiceAccount(value: unknown): value is ServiceAccount {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ServiceAccount).client_email === "string" &&
    typeof (value as ServiceAccount).private_key === "string"
  );
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizePrivateKeySecret(raw: string) {
  const trimmed = raw.trim();
  const unwrapped = maybeUnwrapQuotedJson(trimmed) ?? trimmed;
  const decoded = maybeDecodeBase64Text(trimmed);
  const decodedUnwrapped = maybeDecodeBase64Text(unwrapped);

  const candidates = [trimmed, unwrapped, decoded, decodedUnwrapped].filter(
    (value): value is string => Boolean(value && value.trim())
  );

  const preferred =
    candidates.find((value) => value.includes("BEGIN PRIVATE KEY")) ?? candidates[0] ?? trimmed;

  return preferred.replace(/\\n/g, "\n").trim();
}

function extractClientEmailCandidate(rawSecret: string | null) {
  if (!rawSecret) return null;

  const trimmed = rawSecret.trim();
  const unwrapped = maybeUnwrapQuotedJson(trimmed) ?? trimmed;
  const candidates = [trimmed, unwrapped].filter((value) => Boolean(value.trim()));

  for (const candidate of candidates) {
    if (isLikelyEmail(candidate)) {
      return candidate.trim();
    }
  }

  return null;
}

function buildServiceAccountFromParts(parts: {
  clientEmail?: string | null;
  privateKey?: string | null;
  tokenUri?: string | null;
}): ServiceAccount | null {
  const clientEmail = parts.clientEmail?.trim();
  const privateKey = parts.privateKey?.trim();

  if (!clientEmail || !privateKey) return null;

  return {
    client_email: clientEmail,
    private_key: normalizePrivateKeySecret(privateKey),
    token_uri: parts.tokenUri?.trim() || GOOGLE_TOKEN_URI,
  };
}

function parseServiceAccountSecret(rawSecret: string): ServiceAccount {
  const trimmed = rawSecret.trim();
  const unwrapped = maybeUnwrapQuotedJson(trimmed) ?? trimmed;
  const decoded = maybeDecodeBase64(trimmed);
  const decodedUnwrapped = maybeDecodeBase64(unwrapped);

  const candidates = Array.from(
    new Set(
      [
        trimmed,
        unwrapped,
        normalizeMultilinePrivateKey(trimmed),
        normalizeMultilinePrivateKey(unwrapped),
        decoded,
        decoded ? normalizeMultilinePrivateKey(decoded) : null,
        decodedUnwrapped,
        decodedUnwrapped ? normalizeMultilinePrivateKey(decodedUnwrapped) : null,
      ].filter((value): value is string => Boolean(value && value.trim()))
    )
  );

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const resolved = typeof parsed === "string" ? JSON.parse(parsed) : parsed;

      if (isServiceAccount(resolved)) {
        return {
          client_email: resolved.client_email,
          private_key: resolved.private_key.replace(/\\n/g, "\n"),
          token_uri: resolved.token_uri || GOOGLE_TOKEN_URI,
        };
      }
    } catch {
      continue;
    }
  }

  throw createStageError(
    "auth_issue",
    "GOOGLE_INDEXING_SERVICE_ACCOUNT is not valid JSON. Re-save the full Google service-account JSON in Lovable Cloud.",
    { response_preview: trimmed.slice(0, 160) }
  );
}

function resolveServiceAccountFromEnv(): ServiceAccount {
  const rawServiceAccount = Deno.env.get("GOOGLE_INDEXING_SERVICE_ACCOUNT") ?? null;
  const directClientEmail = Deno.env.get("GOOGLE_INDEXING_CLIENT_EMAIL") ?? null;
  const directPrivateKey = Deno.env.get("GOOGLE_INDEXING_PRIVATE_KEY") ?? null;
  const directTokenUri = Deno.env.get("GOOGLE_INDEXING_TOKEN_URI") ?? null;

  const fallbackAccount = buildServiceAccountFromParts({
    clientEmail: directClientEmail || extractClientEmailCandidate(rawServiceAccount),
    privateKey: directPrivateKey,
    tokenUri: directTokenUri,
  });

  if (rawServiceAccount?.trim()) {
    try {
      const parsed = parseServiceAccountSecret(rawServiceAccount);
      return {
        ...parsed,
        token_uri: directTokenUri?.trim() || parsed.token_uri || GOOGLE_TOKEN_URI,
      };
    } catch (error: any) {
      if (fallbackAccount) {
        return fallbackAccount;
      }

      throw createStageError(
        "auth_issue",
        "Google indexing credentials are incomplete. Save a valid service-account JSON or use separate client email and private key secrets.",
        {
          ...(error?.details || {}),
          has_service_account_secret: Boolean(rawServiceAccount?.trim()),
          has_client_email_secret: Boolean(directClientEmail?.trim()),
          has_private_key_secret: Boolean(directPrivateKey?.trim()),
        }
      );
    }
  }

  if (fallbackAccount) {
    return fallbackAccount;
  }

  throw createStageError(
    "auth_issue",
    "Google indexing credentials are missing. Save a valid service-account JSON or use separate client email and private key secrets.",
    {
      has_service_account_secret: false,
      has_client_email_secret: Boolean(directClientEmail?.trim()),
      has_private_key_secret: Boolean(directPrivateKey?.trim()),
    }
  );
}

function createFailedSubmission(
  url: string,
  message: string,
  stage: string,
  details: Record<string, unknown> = {}
): GoogleSubmissionResult {
  return {
    ok: false,
    status: typeof details.google_status === "number" ? Number(details.google_status) : 0,
    data: { error: { message }, diagnostics: details },
    errorMessage: message,
    diagnostics: {
      requested_url: url,
      error_stage: stage,
      ...details,
    },
  };
}

async function getAccessToken(
  sa: ServiceAccount,
  scopes: string[] = [INDEXING_SCOPE]
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: scopes.join(" "),
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const signingInput = `${enc(header)}.${enc(payload)}`;

  const pemContent = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemContent), (character) =>
    character.charCodeAt(0)
  );

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${signingInput}.${sig}`;

  const response = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  const data = await readResponseBody(response);

  if (!response.ok) {
    throw createStageError("auth_issue", `Google token exchange failed: ${getGoogleErrorMessage(data)}`, {
      google_status: response.status,
      response_preview: stringifyValue(data).slice(0, 500),
    });
  }

  if (!data || typeof data !== "object" || typeof (data as any).access_token !== "string") {
    throw createStageError(
      "auth_issue",
      "Google token exchange succeeded but no access token was returned.",
      { response_preview: stringifyValue(data).slice(0, 500) }
    );
  }

  return (data as any).access_token;
}

async function submitUrl(
  accessToken: string,
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"
): Promise<GoogleSubmissionResult> {
  const response = await fetch(`${INDEXING_API_URL}:publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, type }),
  });

  const data = await readResponseBody(response);
  const ok = response.ok;

  return {
    ok,
    status: response.status,
    data,
    errorMessage: ok ? null : getGoogleErrorMessage(data),
    diagnostics: {
      requested_url: url,
      google_status: response.status,
      error_stage: ok ? "submitted" : classifyGoogleErrorStage(response.status, data),
      response_preview: stringifyValue(data).slice(0, 500),
    },
  };
}

async function listSearchConsoleSites(accessToken: string): Promise<string[]> {
  const response = await fetch(SEARCH_CONSOLE_SITES_API_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await readResponseBody(response);

  if (!response.ok) {
    throw createStageError(
      classifyGoogleErrorStage(response.status, data),
      `Failed to load Search Console properties: ${getGoogleErrorMessage(data)}`,
      {
        google_status: response.status,
        response_preview: stringifyValue(data).slice(0, 500),
      }
    );
  }

  if (!data || typeof data !== "object" || !Array.isArray((data as any).siteEntry)) {
    return [];
  }

  return (data as any).siteEntry
    .map((entry: any) => (typeof entry?.siteUrl === "string" ? entry.siteUrl : null))
    .filter((value: string | null): value is string => Boolean(value));
}

function resolveSearchConsoleSite(availableSites: string[], inspectionUrl: string): string {
  const { hostname, origin } = new URL(inspectionUrl);
  const bareHost = hostname.replace(/^www\./, "");
  const candidates = Array.from(
    new Set([
      `sc-domain:${bareHost}`,
      `${origin}/`,
      `${SITE_URL}/`,
      `https://${bareHost}/`,
      `https://www.${bareHost}/`,
      `http://${bareHost}/`,
      `http://www.${bareHost}/`,
    ])
  );

  const match = candidates.find((candidate) => availableSites.includes(candidate));
  if (match) return match;

  throw createStageError(
    "permission_denied",
    `No matching Search Console property found for ${inspectionUrl}.`,
    {
      requested_url: inspectionUrl,
      available_sites: availableSites.slice(0, 20),
    }
  );
}

async function inspectUrlWithSearchConsole(
  accessToken: string,
  inspectionUrl: string,
  siteUrl: string
) {
  const response = await fetch(URL_INSPECTION_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl,
      languageCode: "en-US",
    }),
  });

  const data = await readResponseBody(response);

  return {
    ok: response.ok,
    status: response.status,
    data,
    errorMessage: response.ok ? null : getGoogleErrorMessage(data),
    diagnostics: {
      requested_url: inspectionUrl,
      site_property: siteUrl,
      google_status: response.status,
      error_stage: response.ok ? "inspected" : classifyGoogleErrorStage(response.status, data),
      response_preview: stringifyValue(data).slice(0, 500),
    },
  };
}

// Inspect a URL, automatically trying www/non-www variants if the first returns "unknown"
async function inspectUrlWithVariants(
  accessToken: string,
  inspectionUrl: string,
  siteUrl: string
) {
  let result = await inspectUrlWithSearchConsole(accessToken, inspectionUrl, siteUrl);
  if (result.ok && isIndexedInInspectionResult(result.data)) return result;

  // Try variant (toggle www)
  try {
    const u = new URL(inspectionUrl);
    const altHost = u.hostname.startsWith("www.")
      ? u.hostname.replace(/^www\./, "")
      : `www.${u.hostname}`;
    u.hostname = altHost;
    const altUrl = u.toString();
    if (altUrl !== inspectionUrl) {
      const alt = await inspectUrlWithSearchConsole(accessToken, altUrl, siteUrl);
      if (alt.ok && isIndexedInInspectionResult(alt.data)) return alt;
    }
  } catch (_) {
    // ignore
  }

  return result;
}

function isIndexedInInspectionResult(data: unknown) {
  const inspection = (data as any)?.inspectionResult?.indexStatusResult;
  const coverageState = String(inspection?.coverageState || "").toLowerCase().trim();
  const verdict = String(inspection?.verdict || "").toLowerCase().trim();

  if (!coverageState && !verdict) return false;

  // Primary signal: Google's verdict. PASS means the URL is on Google.
  if (verdict === "pass") return true;

  // Secondary signal: explicit "indexed" coverage states
  if (
    coverageState.includes("submitted and indexed") ||
    coverageState === "indexed, not submitted in sitemap" ||
    coverageState.startsWith("indexed")
  ) {
    return true;
  }

  return false;
}

async function persistSubmissionResult(
  supabase: ReturnType<typeof createClient>,
  options: {
    url: string;
    pageType?: string;
    recordId?: string | null;
    action: string;
    retryCount: number;
    submission: GoogleSubmissionResult;
  }
): Promise<StoredIndexingUrl> {
  const now = new Date().toISOString();
  const status = options.submission.ok ? "submitted" : "failed";
  const storedResponse = {
    google: options.submission.data,
    diagnostics: options.submission.diagnostics,
  };

  const payload: Record<string, unknown> = {
    url: options.url,
    page_type: options.pageType || "other",
    record_id: options.recordId || null,
    status,
    last_submitted_at: now,
    last_response: storedResponse,
    error_message: options.submission.ok ? null : options.submission.errorMessage,
    retry_count: options.retryCount,
    updated_at: now,
  };

  // NOTE: A successful Google Indexing API response means Google received
  // the crawl notification, NOT that the URL is indexed. Do not set indexed_at here.
  // indexed_at should only be set when confirmed via Search Console or status check.

  const { data: record, error } = await supabase
    .from("indexing_urls")
    .upsert(payload, { onConflict: "url" })
    .select("*")
    .single();

  if (error || !record) {
    throw createStageError(
      "database_error",
      `Failed to save indexing result for ${options.url}`,
      {
        requested_url: options.url,
        response_preview: error?.message,
      }
    );
  }

  const { error: logError } = await supabase.from("indexing_logs").insert({
    indexing_url_id: record.id,
    action: options.action,
    status,
    response: storedResponse,
    error_message: options.submission.ok ? null : options.submission.errorMessage,
  });

  if (logError) {
    console.error("Failed to insert indexing log:", logError);
  }

  return record as StoredIndexingUrl;
}

function normalizeBatchEntries(rawEntries: unknown[]): BatchEntry[] {
  return rawEntries
    .map((entry) => {
      if (typeof entry === "string") {
        const url = entry.trim();
        return url ? { url } : null;
      }

      if (entry && typeof entry === "object" && typeof (entry as any).url === "string") {
        const url = String((entry as any).url).trim();
        if (!url) return null;

        return {
          url,
          page_type:
            typeof (entry as any).page_type === "string"
              ? String((entry as any).page_type)
              : undefined,
          record_id:
            typeof (entry as any).record_id === "string"
              ? String((entry as any).record_id)
              : null,
        };
      }

      return null;
    })
    .filter((entry): entry is BatchEntry => Boolean(entry));
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();
  let action = "unknown";

  try {
    const body = await req.json();
    action = typeof body?.action === "string" ? body.action : "";

    if (!action) {
      throw createStageError("validation_error", "action is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw createStageError(
        "configuration_error",
        "Backend credentials are missing for Google indexing."
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const getToken = async () => {
      const serviceAccount = resolveServiceAccountFromEnv();
      return getAccessToken(serviceAccount);
    };

    if (action === "debug_secret") {
      const rawSecret = Deno.env.get("GOOGLE_INDEXING_SERVICE_ACCOUNT") || "";
      const unwrapped = rawSecret ? maybeUnwrapQuotedJson(rawSecret.trim()) ?? rawSecret.trim() : "";
      const secretShape = !rawSecret.trim()
        ? "missing"
        : rawSecret.trimStart().startsWith("{")
          ? "json"
          : isLikelyEmail(unwrapped)
            ? "email_only"
            : "other";

      return respond({
        ok: true,
        data: {
          length: rawSecret.length,
          startsWithBrace: rawSecret.trimStart().startsWith("{"),
          secretShape,
          hasSeparateClientEmail: Boolean(Deno.env.get("GOOGLE_INDEXING_CLIENT_EMAIL")?.trim()),
          hasSeparatePrivateKey: Boolean(Deno.env.get("GOOGLE_INDEXING_PRIVATE_KEY")?.trim()),
          hasSeparateTokenUri: Boolean(Deno.env.get("GOOGLE_INDEXING_TOKEN_URI")?.trim()),
          canResolveCredentials: (() => {
            try {
              resolveServiceAccountFromEnv();
              return true;
            } catch {
              return false;
            }
          })(),
        },
      });
    }

    if (action === "list_sites") {
      try {
        const serviceAccount = resolveServiceAccountFromEnv();
        const accessToken = await getAccessToken(serviceAccount, [WEBMASTERS_READONLY_SCOPE]);
        const sites = await listSearchConsoleSites(accessToken);
        return respond({
          ok: true,
          data: { sites },
          diagnostics: { action, processing_time_ms: Date.now() - startedAt },
        });
      } catch (error: any) {
        return respond({
          ok: false,
          error: error?.message || "Failed to list Search Console sites",
          diagnostics: {
            action,
            error_stage: error?.stage || "auth_issue",
            processing_time_ms: Date.now() - startedAt,
            ...(error?.details || {}),
          },
        });
      }
    }

    if (action === "submit_url") {
      const url = typeof body?.url === "string" ? body.url.trim() : "";
      const pageType = typeof body?.page_type === "string" ? body.page_type : "other";
      const recordId = typeof body?.record_id === "string" ? body.record_id : null;

      if (!url) {
        throw createStageError("validation_error", "url is required");
      }

      let submission: GoogleSubmissionResult;

      try {
        const accessToken = await getToken();
        submission = await submitUrl(accessToken, url);
      } catch (error: any) {
        submission = createFailedSubmission(
          url,
          error?.message || "Google Indexing authentication failed",
          error?.stage || "auth_issue",
          error?.details || {}
        );
      }

      const record = await persistSubmissionResult(supabase, {
        url,
        pageType,
        recordId,
        action: "submit",
        retryCount: 0,
        submission,
      });

      const diagnostics = {
        ...submission.diagnostics,
        action,
        processing_time_ms: Date.now() - startedAt,
      };

      return respond({
        ok: submission.ok,
        data: {
          success: submission.ok,
          url,
          status: record.status,
          error: record.error_message,
          google: submission.data,
          diagnostics,
          record,
        },
        error: submission.ok ? undefined : record.error_message || submission.errorMessage || "Submission failed",
        diagnostics,
      });
    }

    if (action === "batch_submit") {
      const entries = normalizeBatchEntries(Array.isArray(body?.urls) ? body.urls : []).slice(
        0,
        MAX_BATCH_SIZE
      );

      if (!entries.length) {
        throw createStageError("validation_error", "urls array is required");
      }

      let accessToken: string | null = null;
      let sharedError: any = null;

      try {
        accessToken = await getToken();
      } catch (error: any) {
        sharedError = error;
      }

      if (!accessToken && sharedError) {
        return respond({
          ok: false,
          error: sharedError?.message || "Google Indexing authentication failed",
          diagnostics: {
            action,
            error_stage: sharedError?.stage || "auth_issue",
            processing_time_ms: Date.now() - startedAt,
            ...(sharedError?.details || {}),
          },
        });
      }

      const results: any[] = [];
      let successCount = 0;

      for (const entry of entries) {
        try {
          const submission = accessToken
            ? await submitUrl(accessToken, entry.url)
            : createFailedSubmission(
                entry.url,
                sharedError?.message || "Google Indexing authentication failed",
                sharedError?.stage || "auth_issue",
                sharedError?.details || {}
              );

          const record = await persistSubmissionResult(supabase, {
            url: entry.url,
            pageType: entry.page_type,
            recordId: entry.record_id,
            action: "batch_submit",
            retryCount: 0,
            submission,
          });

          if (submission.ok) successCount += 1;

          results.push({
            url: entry.url,
            success: submission.ok,
            status: record.status,
            error: record.error_message,
            google: submission.data,
            diagnostics: submission.diagnostics,
            record,
          });
        } catch (error: any) {
          results.push({
            url: entry.url,
            success: false,
            error: error?.message || "Unexpected batch submission failure",
            diagnostics: {
              requested_url: entry.url,
              error_stage: error?.stage || "unexpected_error",
              ...(error?.details || {}),
            },
          });
        }

        await delay(BATCH_DELAY_MS);
      }

      return respond({
        ok: true,
        data: {
          total: entries.length,
          processed: results.length,
          success: successCount,
          failed: results.length - successCount,
          results,
        },
        diagnostics: {
          action,
          processing_time_ms: Date.now() - startedAt,
        },
      });
    }

    if (action === "refresh") {
      const { data: pendingRows, error } = await supabase
        .from("indexing_urls")
        .select("id, url, page_type, record_id, retry_count")
        .in("status", ["pending", "failed"])
        .lt("retry_count", 5)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        throw createStageError("database_error", "Failed to load pending URLs", {
          response_preview: error.message,
        });
      }

      if (!pendingRows?.length) {
        return respond({
          ok: true,
          data: { message: "No URLs to retry", total: 0, success: 0, failed: 0, results: [] },
          diagnostics: {
            action,
            processing_time_ms: Date.now() - startedAt,
          },
        });
      }

      let accessToken: string | null = null;
      let sharedError: any = null;

      try {
        accessToken = await getToken();
      } catch (tokenError: any) {
        sharedError = tokenError;
      }

      if (!accessToken && sharedError) {
        return respond({
          ok: false,
          error: sharedError?.message || "Google Indexing authentication failed",
          diagnostics: {
            action,
            error_stage: sharedError?.stage || "auth_issue",
            processing_time_ms: Date.now() - startedAt,
            ...(sharedError?.details || {}),
          },
        });
      }

      const results: any[] = [];
      let successCount = 0;

      for (const row of pendingRows) {
        try {
          const submission = accessToken
            ? await submitUrl(accessToken, row.url)
            : createFailedSubmission(
                row.url,
                sharedError?.message || "Google Indexing authentication failed",
                sharedError?.stage || "auth_issue",
                sharedError?.details || {}
              );

          const record = await persistSubmissionResult(supabase, {
            url: row.url,
            pageType: row.page_type,
            recordId: row.record_id,
            action: "retry",
            retryCount: row.retry_count + 1,
            submission,
          });

          if (submission.ok) successCount += 1;

          results.push({
            url: row.url,
            success: submission.ok,
            status: record.status,
            error: record.error_message,
            google: submission.data,
            diagnostics: {
              ...submission.diagnostics,
              retry_count: row.retry_count + 1,
            },
            record,
          });
        } catch (rowError: any) {
          const message = rowError?.message || "Unexpected retry failure";
          const fallbackSubmission = createFailedSubmission(
            row.url,
            message,
            rowError?.stage || "unexpected_error",
            rowError?.details || {}
          );

          try {
            const record = await persistSubmissionResult(supabase, {
              url: row.url,
              pageType: row.page_type,
              recordId: row.record_id,
              action: "retry",
              retryCount: row.retry_count + 1,
              submission: fallbackSubmission,
            });

            results.push({
              url: row.url,
              success: false,
              status: record.status,
              error: record.error_message,
              google: fallbackSubmission.data,
              diagnostics: {
                ...fallbackSubmission.diagnostics,
                retry_count: row.retry_count + 1,
              },
              record,
            });
          } catch (persistError: any) {
            results.push({
              url: row.url,
              success: false,
              error: persistError?.message || message,
              diagnostics: {
                requested_url: row.url,
                error_stage: persistError?.stage || rowError?.stage || "unexpected_error",
                ...(persistError?.details || rowError?.details || {}),
              },
            });
          }
        }

        await delay(BATCH_DELAY_MS);
      }

      return respond({
        ok: true,
        data: {
          total: pendingRows.length,
          success: successCount,
          failed: results.length - successCount,
          results,
        },
        diagnostics: {
          action,
          processing_time_ms: Date.now() - startedAt,
        },
      });
    }

    if (action === "check_index_status") {
      const requestedLimit = Number(body?.limit) || 50;
      const limit = Math.min(requestedLimit, STATUS_CHECK_BATCH_SIZE, 100);
      const requestedSkip = Math.max(Number(body?.skip) || 0, 0);
      const onlyUrl = typeof body?.url === "string" ? body.url.trim() : "";

      let rows: any[] = [];
      let totalPending = 0;

      if (onlyUrl) {
        const { data } = await supabase
          .from("indexing_urls")
          .select("id, url, status, indexed_at")
          .eq("url", onlyUrl)
          .limit(1);
        rows = data || [];
        totalPending = rows.length;
      } else {
        const { count, error: countError } = await supabase
          .from("indexing_urls")
          .select("id", { count: "exact", head: true })
          .is("indexed_at", null)
          .in("status", ["submitted", "pending"]);

        if (countError) {
          throw createStageError("database_error", "Failed to count URLs to check", {
            response_preview: countError.message,
          });
        }

        totalPending = count || 0;

        const { data, error } = await supabase
          .from("indexing_urls")
          .select("id, url, status, indexed_at")
          .is("indexed_at", null)
          .in("status", ["submitted", "pending"])
          .order("last_submitted_at", { ascending: true, nullsFirst: false })
          .range(requestedSkip, requestedSkip + limit - 1);
        if (error) {
          throw createStageError("database_error", "Failed to load URLs to check", {
            response_preview: error.message,
          });
        }
        rows = data || [];
      }

      if (!rows.length) {
        return respond({
          ok: true,
          data: { checked: 0, indexed: 0, not_indexed: 0, results: [] },
          diagnostics: { action, processing_time_ms: Date.now() - startedAt },
        });
      }

      let accessToken: string;
      let availableSites: string[];
      let propertySiteUrl: string;
      try {
        const serviceAccount = resolveServiceAccountFromEnv();
        accessToken = await getAccessToken(serviceAccount, [WEBMASTERS_READONLY_SCOPE]);
        availableSites = await listSearchConsoleSites(accessToken);
        const overrideSite =
          typeof body?.site_property === "string" ? body.site_property.trim() : "";
        if (overrideSite && availableSites.includes(overrideSite)) {
          propertySiteUrl = overrideSite;
        } else {
          propertySiteUrl = resolveSearchConsoleSite(availableSites, rows[0].url);
        }
      } catch (error: any) {
        return respond({
          ok: false,
          error: error?.message || "Google Indexing authentication failed",
          diagnostics: {
            action,
            error_stage: error?.stage || "auth_issue",
            processing_time_ms: Date.now() - startedAt,
            ...(error?.details || {}),
          },
        });
      }

      const results: any[] = [];
      let indexedCount = 0;
      const now = new Date().toISOString();

      const rowsToCheck = rows;
      const rowChunks = chunkItems(rowsToCheck, STATUS_CHECK_CONCURRENCY);

      for (const rowChunk of rowChunks) {
        const chunkResults = await Promise.all(
          rowChunk.map(async (row) => {
            try {
              const inspection = await inspectUrlWithVariants(accessToken, row.url, propertySiteUrl);
              const isIndexed = inspection.ok && isIndexedInInspectionResult(inspection.data);

              if (isIndexed) {
                await supabase
                  .from("indexing_urls")
                  .update({
                    status: "indexed",
                    indexed_at: now,
                    last_response: {
                      google: inspection.data,
                      diagnostics: { source: "search_console_inspection", site_property: propertySiteUrl },
                    },
                    error_message: null,
                    updated_at: now,
                  })
                  .eq("id", row.id);

                await supabase.from("indexing_logs").insert({
                  indexing_url_id: row.id,
                  action: "status_check",
                  status: "indexed",
                  response: { google: inspection.data, diagnostics: { site_property: propertySiteUrl } },
                });
              } else {
                const inspectionMessage = inspection.ok ? null : inspection.errorMessage;

                await supabase.from("indexing_logs").insert({
                  indexing_url_id: row.id,
                  action: "status_check",
                  status: inspection.ok ? "not_indexed_yet" : "check_failed",
                  response: {
                    google: inspection.data,
                    diagnostics: { google_status: inspection.status, site_property: propertySiteUrl },
                  },
                  error_message: inspectionMessage,
                });

                await supabase
                  .from("indexing_urls")
                  .update({
                    last_response: {
                      google: inspection.data,
                      diagnostics: { source: "search_console_inspection", site_property: propertySiteUrl },
                    },
                    error_message: inspectionMessage,
                    updated_at: now,
                  })
                  .eq("id", row.id);
              }

              return {
                url: row.url,
                indexed: Boolean(isIndexed),
                google_status: inspection.status,
                google: inspection.data,
                site_property: propertySiteUrl,
              };
            } catch (err: any) {
              return {
                url: row.url,
                indexed: false,
                error: err?.message || "Status check failed",
              };
            }
          })
        );

        results.push(...chunkResults);
        indexedCount += chunkResults.filter((entry) => entry.indexed).length;

        if (rowChunk !== rowChunks[rowChunks.length - 1]) {
          await delay(BATCH_DELAY_MS);
        }
      }

      return respond({
        ok: true,
        data: {
          checked: rowsToCheck.length,
          indexed: indexedCount,
          not_indexed: rowsToCheck.length - indexedCount,
          remaining: Math.max(totalPending - requestedSkip - rowsToCheck.length, 0),
          truncated: totalPending > requestedSkip + rowsToCheck.length,
          processed_in_batch: rowsToCheck.length,
          next_skip: requestedSkip + rowsToCheck.length,
          total_pending: totalPending,
          site_property: propertySiteUrl,
          results,
        },
        diagnostics: { action, processing_time_ms: Date.now() - startedAt },
      });
    }

    if (action === "current_run_status") {
      // Window: 18:30–19:35 UTC = 12:00–1:05 AM IST. Plus a "recently active" check
      // (any auto_run log in the last 15 min outside the window also counts).
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcMin = now.getUTCMinutes();
      const utcMinutesOfDay = utcHour * 60 + utcMin;
      const WINDOW_START = 18 * 60 + 30; // 18:30 UTC
      const WINDOW_END = 19 * 60 + 35; // 19:35 UTC
      const inWindow = utcMinutesOfDay >= WINDOW_START && utcMinutesOfDay <= WINDOW_END;

      // Today's window start as ISO (in UTC)
      const windowStartToday = new Date(now);
      windowStartToday.setUTCHours(18, 30, 0, 0);
      // If we're past midnight UTC but before 18:30, the "current" window is yesterday's
      const referenceWindowStart =
        utcMinutesOfDay < WINDOW_START
          ? new Date(windowStartToday.getTime() - 24 * 60 * 60 * 1000)
          : windowStartToday;
      const referenceWindowEnd = new Date(referenceWindowStart.getTime() + 65 * 60 * 1000);

      // Pull logs from the reference window
      const { data: windowLogs } = await supabase
        .from("indexing_logs")
        .select("action, status, created_at, error_message")
        .gte("created_at", referenceWindowStart.toISOString())
        .lte("created_at", referenceWindowEnd.toISOString())
        .order("created_at", { ascending: false })
        .limit(500);

      let submittedInWindow = 0;
      let indexedInWindow = 0;
      let failedInWindow = 0;
      let lastActivityAt: string | null = null;
      let autoRunTicks = 0;

      if (windowLogs) {
        for (const log of windowLogs) {
          if (!lastActivityAt) lastActivityAt = log.created_at;
          if (log.action === "auto_run_tick") autoRunTicks += 1;
          if (
            (log.action === "submit_url" ||
              log.action === "batch_submit" ||
              log.action === "refresh") &&
            (log.status === "success" || log.status === "submitted")
          ) {
            submittedInWindow += 1;
          }
          if (log.action === "check_index_status" && log.status === "indexed") {
            indexedInWindow += 1;
          }
          if (log.status === "failed") failedInWindow += 1;
        }
      }

      // Active = in window AND we saw a tick in the last 15 min, OR a tick in last 15 min anytime
      const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      const isActive = !!(lastActivityAt && lastActivityAt >= fifteenMinAgo);

      // Compute next window start
      let nextWindowStart: Date;
      if (utcMinutesOfDay < WINDOW_START) {
        nextWindowStart = new Date(now);
        nextWindowStart.setUTCHours(18, 30, 0, 0);
      } else if (utcMinutesOfDay > WINDOW_END) {
        nextWindowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        nextWindowStart.setUTCHours(18, 30, 0, 0);
      } else {
        // currently in window
        nextWindowStart = referenceWindowStart;
      }

      return respond({
        ok: true,
        data: {
          in_window: inWindow,
          is_active: isActive,
          window_start_utc: referenceWindowStart.toISOString(),
          window_end_utc: referenceWindowEnd.toISOString(),
          next_window_start_utc: nextWindowStart.toISOString(),
          submitted_in_window: submittedInWindow,
          indexed_in_window: indexedInWindow,
          failed_in_window: failedInWindow,
          auto_run_ticks: autoRunTicks,
          last_activity_at: lastActivityAt,
        },
        diagnostics: { action, processing_time_ms: Date.now() - startedAt },
      });
    }

    if (action === "auto_run" || action === "quota_status") {
      // Daily quotas per Google Indexing API
      const SUBMISSION_DAILY_QUOTA = 1000;
      const INSPECTION_DAILY_QUOTA = 200;
      // Safety buffer to avoid exhausting quota on one site if multiple properties exist
      const SUBMISSION_SAFETY_BUFFER = 20;
      const INSPECTION_SAFETY_BUFFER = 5;

      // Compute usage for today (UTC day window)
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const { data: todaysLogs } = await supabase
        .from("indexing_logs")
        .select("action, status")
        .gte("created_at", startOfDay.toISOString());

      let submissionsUsed = 0;
      let inspectionsUsed = 0;
      if (todaysLogs) {
        for (const log of todaysLogs) {
          // Submissions: any submit_url / batch_submit / refresh attempt that actually hit Google
          if (
            (log.action === "submit_url" ||
              log.action === "batch_submit" ||
              log.action === "refresh") &&
            (log.status === "success" || log.status === "submitted" || log.status === "failed")
          ) {
            submissionsUsed += 1;
          }
          // Inspections
          if (
            log.action === "check_index_status" &&
            (log.status === "success" ||
              log.status === "indexed" ||
              log.status === "not_indexed" ||
              log.status === "failed")
          ) {
            inspectionsUsed += 1;
          }
        }
      }

      const submissionBudget = Math.max(
        0,
        SUBMISSION_DAILY_QUOTA - SUBMISSION_SAFETY_BUFFER - submissionsUsed
      );
      const inspectionBudget = Math.max(
        0,
        INSPECTION_DAILY_QUOTA - INSPECTION_SAFETY_BUFFER - inspectionsUsed
      );

      if (action === "quota_status") {
        return respond({
          ok: true,
          data: {
            submissions_used: submissionsUsed,
            submissions_remaining: submissionBudget,
            submissions_quota: SUBMISSION_DAILY_QUOTA,
            inspections_used: inspectionsUsed,
            inspections_remaining: inspectionBudget,
            inspections_quota: INSPECTION_DAILY_QUOTA,
            window_start: startOfDay.toISOString(),
          },
          diagnostics: { action, processing_time_ms: Date.now() - startedAt },
        });
      }

      // === auto_run pipeline ===
      // Log a heartbeat tick so the admin UI can show "live activity"
      await supabase.from("indexing_logs").insert({
        action: "auto_run_tick",
        status: "started",
      });

      const summary: any = {
        discovered: 0,
        submitted: 0,
        submission_failed: 0,
        inspected: 0,
        newly_indexed: 0,
        submissions_used_before: submissionsUsed,
        inspections_used_before: inspectionsUsed,
        submission_budget: submissionBudget,
        inspection_budget: inspectionBudget,
        steps: [] as string[],
      };

      const selfUrl = `${supabaseUrl}/functions/v1/google-indexing`;
      const selfHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      };
      const callSelf = async (payload: Record<string, unknown>) => {
        const res = await fetch(selfUrl, {
          method: "POST",
          headers: selfHeaders,
          body: JSON.stringify(payload),
        });
        return res.json().catch(() => ({}));
      };

      // Step 1: Discover new URLs
      try {
        const r = await callSelf({ action: "discover" });
        summary.discovered = r?.data?.discovered || 0;
        summary.steps.push(`discover: +${summary.discovered}`);
      } catch (e: any) {
        summary.steps.push(`discover_error: ${e?.message || "unknown"}`);
      }

      // Step 2: Submit pending URLs in batches up to submissionBudget
      if (submissionBudget > 0) {
        try {
          const { data: pendingRows } = await supabase
            .from("indexing_urls")
            .select("url, page_type, record_id")
            .in("status", ["pending", "failed"])
            .order("created_at", { ascending: true })
            .limit(submissionBudget);

          if (pendingRows && pendingRows.length) {
            // Chunk into MAX_BATCH_SIZE (100)
            for (let i = 0; i < pendingRows.length; i += MAX_BATCH_SIZE) {
              const chunk = pendingRows.slice(i, i + MAX_BATCH_SIZE);
              const r = await callSelf({ action: "batch_submit", urls: chunk });
              summary.submitted += r?.data?.success || 0;
              summary.submission_failed += r?.data?.failed || 0;
            }
          }
          summary.steps.push(
            `submit: ok=${summary.submitted} failed=${summary.submission_failed}`
          );
        } catch (e: any) {
          summary.steps.push(`submit_error: ${e?.message || "unknown"}`);
        }
      } else {
        summary.steps.push("submit_skipped: quota exhausted");
      }

      // Step 3: Check index status in batches up to inspectionBudget
      if (inspectionBudget > 0) {
        try {
          let nextSkip = 0;
          while (summary.inspected < inspectionBudget) {
            const remaining = inspectionBudget - summary.inspected;
            const batchSize = Math.min(STATUS_CHECK_BATCH_SIZE, remaining);
            const r = await callSelf({
              action: "check_index_status",
              limit: batchSize,
              skip: nextSkip,
            });
            const checked = r?.data?.checked || 0;
            const indexed = r?.data?.indexed || 0;
            if (!checked) break;
            summary.inspected += checked;
            summary.newly_indexed += indexed;
            nextSkip = r?.data?.next_skip ?? nextSkip + checked;
            if (r?.data?.truncated === false) break;
          }
          summary.steps.push(
            `inspect: checked=${summary.inspected} newly_indexed=${summary.newly_indexed}`
          );
        } catch (e: any) {
          summary.steps.push(`inspect_error: ${e?.message || "unknown"}`);
        }
      } else {
        summary.steps.push("inspect_skipped: quota exhausted");
      }

      // Completion heartbeat
      await supabase.from("indexing_logs").insert({
        action: "auto_run_tick",
        status: "completed",
        response: summary as any,
      });

      return respond({
        ok: true,
        data: summary,
        diagnostics: {
          action,
          processing_time_ms: Date.now() - startedAt,
        },
      });
    }

    if (action === "discover") {
      const tables = [
        {
          table: "articles",
          type: "article",
          pathFn: (row: any) => `/article/${row.slug}`,
          filter: { published: true },
        },
        { table: "institutes", type: "institute", pathFn: (row: any) => `/institute/${row.slug}` },
        { table: "colleges", type: "college", pathFn: (row: any) => `/college/${row.slug}` },
        { table: "exams", type: "exam", pathFn: (row: any) => `/exam/${row.slug}` },
        {
          table: "city_pages",
          type: "city_page",
          pathFn: (row: any) => `/colleges/${row.slug}`,
          filter: { active: true },
        },
      ];

      let newCount = 0;
      const now = new Date().toISOString();

      for (const table of tables) {
        let query = supabase.from(table.table).select("id, slug");

        if (table.filter) {
          for (const [key, value] of Object.entries(table.filter)) {
            query = query.eq(key, value);
          }
        }

        const { data: rows } = await query;
        if (!rows) continue;

        for (const row of rows) {
          if (!row.slug) continue;

          const url = `${SITE_URL}${table.pathFn(row)}`;
          const { data: existing } = await supabase
            .from("indexing_urls")
            .select("id")
            .eq("url", url)
            .maybeSingle();

          if (!existing) {
            await supabase.from("indexing_urls").insert({
              url,
              page_type: table.type,
              record_id: row.id,
              status: "pending",
              updated_at: now,
            });
            newCount += 1;
          }
        }
      }

      return respond({
        ok: true,
        data: { discovered: newCount },
        diagnostics: {
          action,
          processing_time_ms: Date.now() - startedAt,
        },
      });
    }

    if (action === "stats") {
      const { data: all, error } = await supabase
        .from("indexing_urls")
        .select("status, indexed_at");

      if (error) {
        throw createStageError("database_error", "Failed to load indexing stats", {
          response_preview: error.message,
        });
      }

      const stats = { total: 0, submitted: 0, indexed: 0, failed: 0, pending: 0 };

      if (all) {
        stats.total = all.length;

        for (const row of all) {
          const isIndexed = Boolean(row.indexed_at || row.status === "indexed");

          if (isIndexed) stats.indexed += 1;
          if (!isIndexed && row.status !== "failed") stats.pending += 1;
          if (row.status === "submitted" && !isIndexed) stats.submitted += 1;
          if (row.status === "failed") stats.failed += 1;
        }
      }

      return respond({
        ok: true,
        data: stats,
        diagnostics: {
          action,
          processing_time_ms: Date.now() - startedAt,
        },
      });
    }

    return respond({
      ok: false,
      error: `Unknown action: ${action}`,
      diagnostics: {
        action,
        error_stage: "validation_error",
        processing_time_ms: Date.now() - startedAt,
      },
    });
  } catch (error: any) {
    console.error("Google Indexing error:", error);

    return respond({
      ok: false,
      error: error?.message || "Unexpected Google indexing error",
      diagnostics: {
        action,
        error_stage: error?.stage || "unexpected_error",
        processing_time_ms: Date.now() - startedAt,
        ...(error?.details || {}),
      },
    });
  }
});
