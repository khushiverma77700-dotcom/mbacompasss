// Lovable Cloud (Supabase) usage-based pricing estimator.
// Used by the admin "Cloud Usage" dashboard to surface a real $ figure
// instead of a generic "$1-3/month" range.
//
// Pricing is approximated from Supabase's published pay-as-you-go rates
// (sufficient for an internal estimator — the Lovable Cloud bill is the
// source of truth):
//   - Database storage:      $0.125 per GB-month
//   - File storage (S3):     $0.021 per GB-month
//   - Edge function invocations: $2.00 per 1M invocations
//   - Auth Monthly Active Users (MAU): $0.00325 per MAU above 100k (free below)
//   - Egress / bandwidth:    $0.09 per GB
//
// Every workspace gets a $25 free Cloud credit per month, so we also surface
// "remaining free balance".

export const CLOUD_FREE_MONTHLY_USD = 25;

export const CLOUD_RATES = {
  dbStoragePerGbMonth: 0.125,
  fileStoragePerGbMonth: 0.021,
  edgeInvocationsPer1M: 2.0,
  egressPerGb: 0.09,
  // We assume an average row in this project is ~2 KB of structured data.
  // (Empirically reasonable for the mix of articles, colleges, institutes
  // — long HTML blobs balanced with thin join tables.)
  avgRowBytes: 2 * 1024,
};

export interface CloudUsageInput {
  totalRows: number;
  storageFiles: number;
  avgFileSizeKb?: number;     // default 250 KB if unknown
  edgeInvocationsLast30d?: number; // default 0 if not measured
  monthlyActiveUsers?: number;
}

export interface CloudCostBreakdown {
  dbStorageGb: number;
  dbStorageCost: number;
  fileStorageGb: number;
  fileStorageCost: number;
  edgeInvocationsCost: number;
  authCost: number;
  totalMonthly: number;
  freeRemaining: number;
  withinFreeTier: boolean;
}

export function estimateCloudCost(input: CloudUsageInput): CloudCostBreakdown {
  const dbBytes = input.totalRows * CLOUD_RATES.avgRowBytes;
  const dbStorageGb = dbBytes / (1024 ** 3);
  const dbStorageCost = dbStorageGb * CLOUD_RATES.dbStoragePerGbMonth;

  const avgFileKb = input.avgFileSizeKb ?? 250;
  const fileBytes = input.storageFiles * avgFileKb * 1024;
  const fileStorageGb = fileBytes / (1024 ** 3);
  const fileStorageCost = fileStorageGb * CLOUD_RATES.fileStoragePerGbMonth;

  const invocations = input.edgeInvocationsLast30d ?? 0;
  const edgeInvocationsCost =
    (invocations / 1_000_000) * CLOUD_RATES.edgeInvocationsPer1M;

  // Auth: free under 100k MAU.
  const mau = input.monthlyActiveUsers ?? 0;
  const authCost = mau > 100_000 ? (mau - 100_000) * 0.00325 : 0;

  const totalMonthly =
    dbStorageCost + fileStorageCost + edgeInvocationsCost + authCost;

  const freeRemaining = Math.max(0, CLOUD_FREE_MONTHLY_USD - totalMonthly);
  const withinFreeTier = totalMonthly <= CLOUD_FREE_MONTHLY_USD;

  return {
    dbStorageGb,
    dbStorageCost,
    fileStorageGb,
    fileStorageCost,
    edgeInvocationsCost,
    authCost,
    totalMonthly,
    freeRemaining,
    withinFreeTier,
  };
}

export function formatUsd(n: number, digits = 4): string {
  if (!isFinite(n)) return "$0.00";
  if (n === 0) return "$0.00";
  if (n < 0.0001) return "<$0.0001";
  return `$${n.toFixed(digits)}`;
}
