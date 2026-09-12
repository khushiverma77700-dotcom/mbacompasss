import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { normalizeEntityName, toJson, valueIsPresent } from "@/lib/informationPortal";

type DraftInsert = Database["public"]["Tables"]["information_drafts"]["Insert"];
type FieldInsert = Database["public"]["Tables"]["information_field_values"]["Insert"];

export type SaveInformationDraftInput = {
  entityType: "college" | "exam";
  name: string;
  slug: string;
  payload: Record<string, unknown>;
  existingRecordId?: string | null;
  sources?: Array<{ url: string; title?: string | null }>;
  context?: Record<string, unknown>;
};

export async function saveInformationDraft(input: SaveInformationDraftInput): Promise<string> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("You must be signed in as an administrator.");
  const { data: definitions, error: definitionsError } = await supabase.from("information_field_definitions").select("id,field_key,section_key,is_required").eq("entity_type", input.entityType).eq("is_active", true);
  if (definitionsError) throw definitionsError;
  const definitionMap = new Map((definitions ?? []).map((definition) => [definition.field_key, definition]));
  const missingRequiredFields = (definitions ?? []).filter((definition) => definition.is_required && !valueIsPresent(input.payload[definition.field_key])).map((definition) => definition.field_key);
  const proposedFields = Object.entries(input.payload).filter(([, value]) => valueIsPresent(value));
  const draft: DraftInsert = {
    entity_type: input.entityType, requested_name: input.name, normalized_name: normalizeEntityName(input.name), proposed_name: input.name,
    proposed_slug: input.slug, proposed_payload: toJson(input.payload), existing_snapshot: {} as Json, requested_context: toJson(input.context ?? {}),
    identity_candidates: [] as Json, canonical_record_id: input.existingRecordId ?? null, operation: input.existingRecordId ? "refresh" : "create",
    status: "pending_review", research_stage: "review_ready", total_field_count: proposedFields.length,
    verified_field_count: 0, conflict_count: 0, missing_required_fields: missingRequiredFields,
    last_verified_at: new Date().toISOString(), created_by: auth.user.id,
  };
  const { data: created, error: draftError } = await supabase.from("information_drafts").insert(draft).select("id").single();
  if (draftError) throw draftError;
  const fieldRows: FieldInsert[] = proposedFields.map(([fieldKey, value]) => {
    const definition = definitionMap.get(fieldKey);
    return { draft_id: created.id, field_definition_id: definition?.id ?? null, field_key: fieldKey, section_key: definition?.section_key ?? "other",
      is_required: definition?.is_required ?? false, proposed_value: toJson(value), verification_status: "manual_review", review_decision: "pending",
      change_type: input.existingRecordId ? "changed" : "added", last_verified_at: new Date().toISOString() };
  });
  if (fieldRows.length) { const { error } = await supabase.from("information_field_values").insert(fieldRows); if (error) throw error; }
  const sourceRows = (input.sources ?? []).filter((source) => source.url.startsWith("http"));
  if (sourceRows.length) {
    const { error } = await supabase.from("information_sources").insert(sourceRows.map((source) => ({ draft_id: created.id, url: source.url, title: source.title ?? null, source_class: "official_domain", is_official: true, link_status: "unchecked" })));
    if (error) throw error;
  }
  await supabase.from("information_audit_events").insert({ draft_id: created.id, actor_id: auth.user.id, event_type: "draft_created", details: toJson({ entity_type: input.entityType, source_count: sourceRows.length }) });
  return created.id;
}