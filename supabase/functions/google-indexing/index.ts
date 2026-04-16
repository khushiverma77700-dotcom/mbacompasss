import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications";
const SITE_URL = "https://bschoolbuzz.com";
const MAX_BATCH_SIZE = 100;
const BATCH_DELAY_MS = 150;

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
    const decoded = atob(raw).trim();
    return decoded.startsWith("{") ? decoded : null;
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
          token_uri: resolved.token_uri || "https://oauth2.googleapis.com/token",
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

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/indexing",
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
    .replace(/
/g, "");

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

  if (options.submission.ok) {
    payload.indexed_at = now;
  }

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
      const rawSecret = Deno.env.get("GOOGLE_INDEXING_SERVICE_ACCOUNT");

      if (!rawSecret) {
        throw createStageError(
          "auth_issue",
          "GOOGLE_INDEXING_SERVICE_ACCOUNT is not configured."
        );
      }

      const serviceAccount = parseServiceAccountSecret(rawSecret);
      return getAccessToken(serviceAccount);
    };

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
        let query = supabase.from(table.table).select("id, slug, name");

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
