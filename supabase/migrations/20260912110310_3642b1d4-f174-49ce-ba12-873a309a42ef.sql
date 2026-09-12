CREATE TABLE public.information_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('college','exam')),
  field_key text NOT NULL,
  section_key text NOT NULL,
  label text NOT NULL,
  value_type text NOT NULL DEFAULT 'text' CHECK (value_type IN ('text','number','boolean','date','url','rich_text','string_list','object','object_list')),
  display_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  is_repeatable boolean NOT NULL DEFAULT false,
  is_time_sensitive boolean NOT NULL DEFAULT false,
  verification_interval_days integer,
  allowed_source_classes text[] NOT NULL DEFAULT ARRAY['official_domain','official_portal','government','official_document']::text[],
  minimum_verification text NOT NULL DEFAULT 'official' CHECK (minimum_verification IN ('official','cross_verified','manual')),
  canonical_field text,
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, field_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.information_field_definitions TO authenticated;
GRANT ALL ON public.information_field_definitions TO service_role;
ALTER TABLE public.information_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage information field definitions" ON public.information_field_definitions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.information_research_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('college','exam')),
  label text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','paused','completed','failed','cancelled')),
  total_items integer NOT NULL DEFAULT 0,
  completed_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.information_research_batches TO authenticated;
GRANT ALL ON public.information_research_batches TO service_role;
ALTER TABLE public.information_research_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage information research batches" ON public.information_research_batches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.information_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.information_research_batches(id) ON DELETE SET NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('college','exam')),
  requested_name text NOT NULL,
  normalized_name text NOT NULL,
  proposed_name text,
  proposed_slug text,
  city text,
  state text,
  official_domain text,
  canonical_record_id uuid,
  operation text NOT NULL DEFAULT 'create' CHECK (operation IN ('create','refresh')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','researching','identity_review','pending_review','approved_saved','published','rejected','failed','cancelled')),
  research_stage text,
  identity_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  existing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_required_fields text[] NOT NULL DEFAULT '{}'::text[],
  conflict_count integer NOT NULL DEFAULT 0,
  verified_field_count integer NOT NULL DEFAULT 0,
  total_field_count integer NOT NULL DEFAULT 0,
  requested_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_by uuid NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  published_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.information_drafts TO authenticated;
GRANT ALL ON public.information_drafts TO service_role;
ALTER TABLE public.information_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage information drafts" ON public.information_drafts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX information_drafts_active_identity_idx ON public.information_drafts(entity_type, normalized_name) WHERE status IN ('queued','researching','identity_review','pending_review');
CREATE INDEX information_drafts_status_idx ON public.information_drafts(status, entity_type, updated_at DESC);
CREATE INDEX information_drafts_batch_idx ON public.information_drafts(batch_id);

CREATE TABLE public.information_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.information_drafts(id) ON DELETE CASCADE,
  url text NOT NULL CHECK (url ~* '^https?://'),
  final_url text,
  title text,
  source_class text NOT NULL CHECK (source_class IN ('official_domain','official_portal','government','official_document','third_party')),
  document_type text,
  is_official boolean NOT NULL DEFAULT false,
  domain text,
  http_status integer,
  link_status text NOT NULL DEFAULT 'unchecked' CHECK (link_status IN ('unchecked','valid','redirected','broken','suspicious')),
  source_published_at timestamptz,
  last_verified_at timestamptz,
  content_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(draft_id, url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.information_sources TO authenticated;
GRANT ALL ON public.information_sources TO service_role;
ALTER TABLE public.information_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage information sources" ON public.information_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX information_sources_draft_idx ON public.information_sources(draft_id, is_official DESC);

CREATE TABLE public.information_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.information_drafts(id) ON DELETE CASCADE,
  field_definition_id uuid REFERENCES public.information_field_definitions(id) ON DELETE SET NULL,
  field_key text NOT NULL,
  section_key text NOT NULL,
  current_value jsonb,
  proposed_value jsonb,
  edited_value jsonb,
  verification_status text NOT NULL DEFAULT 'not_found' CHECK (verification_status IN ('verified_official','cross_verified','manual_review','conflict','not_found')),
  change_type text NOT NULL DEFAULT 'unchanged' CHECK (change_type IN ('added','changed','unchanged','removed_from_source','stale','conflicting')),
  confidence numeric(5,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
  review_decision text NOT NULL DEFAULT 'pending' CHECK (review_decision IN ('pending','accepted','rejected','manual')),
  is_required boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(draft_id, field_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.information_field_values TO authenticated;
GRANT ALL ON public.information_field_values TO service_role;
ALTER TABLE public.information_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage information field values" ON public.information_field_values FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX information_field_values_review_idx ON public.information_field_values(draft_id, review_decision, verification_status);

CREATE TABLE public.information_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_value_id uuid NOT NULL REFERENCES public.information_field_values(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.information_sources(id) ON DELETE CASCADE,
  excerpt text NOT NULL,
  locator text,
  supports_value boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(field_value_id, source_id, excerpt)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.information_evidence TO authenticated;
GRANT ALL ON public.information_evidence TO service_role;
ALTER TABLE public.information_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage information evidence" ON public.information_evidence FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.information_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES public.information_drafts(id) ON DELETE SET NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('college','exam')),
  canonical_record_id uuid,
  event_type text NOT NULL,
  actor_id uuid,
  before_snapshot jsonb,
  after_snapshot jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.information_audit_events TO authenticated;
GRANT ALL ON public.information_audit_events TO service_role;
ALTER TABLE public.information_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view information audit events" ON public.information_audit_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create information audit events" ON public.information_audit_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX information_audit_events_draft_idx ON public.information_audit_events(draft_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_information_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER information_field_definitions_updated_at BEFORE UPDATE ON public.information_field_definitions FOR EACH ROW EXECUTE FUNCTION public.set_information_updated_at();
CREATE TRIGGER information_research_batches_updated_at BEFORE UPDATE ON public.information_research_batches FOR EACH ROW EXECUTE FUNCTION public.set_information_updated_at();
CREATE TRIGGER information_drafts_updated_at BEFORE UPDATE ON public.information_drafts FOR EACH ROW EXECUTE FUNCTION public.set_information_updated_at();
CREATE TRIGGER information_field_values_updated_at BEFORE UPDATE ON public.information_field_values FOR EACH ROW EXECUTE FUNCTION public.set_information_updated_at();

INSERT INTO public.information_field_definitions (entity_type, field_key, section_key, label, value_type, display_order, is_required, is_repeatable, is_time_sensitive, verification_interval_days, canonical_field) VALUES
('college','name','identity','Official college name','text',10,true,false,false,null,'name'),
('college','website','identity','Official website','url',20,true,false,false,180,'website'),
('college','city','identity','City','text',30,true,false,false,null,'city'),
('college','state','identity','State','text',40,true,false,false,null,'state'),
('college','established','identity','Established year','number',50,false,false,false,null,'established'),
('college','description','identity','Overview','rich_text',60,false,false,true,365,'description'),
('college','courses','programmes','Courses and programmes','string_list',10,false,true,true,180,'courses'),
('college','specializations','programmes','Specializations','string_list',20,false,true,true,180,'specializations'),
('college','admission_process','admissions','Admission process','rich_text',10,false,false,true,90,'admission_process'),
('college','exams_accepted','admissions','Entrance exams accepted','string_list',20,false,true,true,90,'exams_accepted'),
('college','fees','fees','Programme fees','text',10,false,false,true,90,'fees'),
('college','placement_avg','placements','Average package','text',10,false,false,true,180,'placement_avg'),
('college','placement_highest','placements','Highest package','text',20,false,false,true,180,'placement_highest'),
('college','top_recruiters','placements','Top recruiters','string_list',30,false,true,true,180,'top_recruiters'),
('college','ranking','rankings','Official ranking','number',10,false,false,true,365,'ranking'),
('college','accreditations','rankings','Accreditations and approvals','string_list',20,false,true,true,365,'accreditations'),
('college','campus_size','campus','Campus size','text',10,false,false,false,null,'campus_size'),
('college','meta_title','seo','Meta title','text',10,false,false,true,180,'meta_title'),
('college','meta_description','seo','Meta description','text',20,false,false,true,180,'meta_description'),
('exam','name','identity','Official examination name','text',10,true,false,false,null,'name'),
('exam','official_website','identity','Official website','url',20,true,false,true,90,'official_website'),
('exam','conducting_body','identity','Conducting authority','text',30,true,false,true,180,'conducting_body'),
('exam','description','identity','Overview','rich_text',40,false,false,true,180,'description'),
('exam','eligibility','eligibility','Eligibility','rich_text',10,false,false,true,90,'eligibility'),
('exam','exam_date','dates','Examination date','date',10,false,false,true,30,'exam_date'),
('exam','registration_deadline','dates','Registration deadline','date',20,false,false,true,30,'registration_deadline'),
('exam','important_dates','dates','Important dates','object_list',30,false,true,true,30,'important_dates'),
('exam','pattern','exam','Exam pattern','object',10,false,false,true,90,'pattern'),
('exam','syllabus','exam','Syllabus','string_list',20,false,true,true,90,'syllabus'),
('exam','cutoffs','outcomes','Official cut-offs','object',10,false,false,true,90,'cutoffs'),
('exam','faqs','seo','Official FAQs','object_list',10,false,true,true,180,'faqs'),
('exam','meta_title','seo','Meta title','text',20,false,false,true,180,'meta_title'),
('exam','meta_description','seo','Meta description','text',30,false,false,true,180,'meta_description')
ON CONFLICT (entity_type, field_key) DO NOTHING;

UPDATE public.exam_generation_jobs SET auto_publish = false WHERE auto_publish = true AND status IN ('queued','running','completed');