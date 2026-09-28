import { ShieldAlert } from "lucide-react";

export const COURSE_REFUND_NOTICE = "All course purchases are final and non-refundable. Please review the course details before completing payment.";

export default function CourseRefundNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`flex items-start gap-2 text-muted-foreground ${compact ? "text-sm" : "text-base"}`}>
      <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <span><strong className="text-foreground">No refunds.</strong> {COURSE_REFUND_NOTICE}</span>
    </p>
  );
}