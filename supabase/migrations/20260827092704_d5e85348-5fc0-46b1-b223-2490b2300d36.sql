REVOKE ALL ON FUNCTION public.claim_exam_backfill_item(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_exam_backfill_item(INTEGER, INTEGER) TO service_role;