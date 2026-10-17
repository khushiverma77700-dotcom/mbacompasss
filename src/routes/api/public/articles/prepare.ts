import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { prepareArticleDisplay } from "@/lib/articleDisplay";

const input = z.object({ articleId: z.string().uuid(), token: z.string().uuid() });
export const Route = createFileRoute("/api/public/articles/prepare")({
  server: { handlers: { POST: async ({ request }) => {
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return new Response(null, { status: 400 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Per-job random capability is stored only in an RLS-locked queue. No
    // article or draft data is returned to callers, even with a valid token.
    const { data: job, error } = await supabaseAdmin.from("article_display_jobs")
      .select("source_content").eq("article_id", parsed.data.articleId).eq("token", parsed.data.token).maybeSingle();
    if (error) return new Response(null, { status: 503 });
    if (!job) return new Response(null, { status: 401 });
    const display = prepareArticleDisplay(job.source_content);
    const { data: completed, error: saveError } = await supabaseAdmin.rpc("complete_article_display", {
      _article_id: parsed.data.articleId, _token: parsed.data.token, _display: display,
    });
    if (saveError) { console.error(saveError); return new Response(null, { status: 503 }); }
    return new Response(null, { status: completed ? 204 : 409 });
  } } },
});