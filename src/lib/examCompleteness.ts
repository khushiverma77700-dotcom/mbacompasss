/**
 * Browser-side re-export of the shared exam completeness auditor so the admin
 * dashboard scores pages with EXACTLY the same rules the backfill worker uses.
 */
export * from "../../supabase/functions/_shared/examCompleteness";
