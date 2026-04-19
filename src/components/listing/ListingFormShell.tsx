import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Save, Send, Check, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { emptyPayload, getSections, type ListingType, type SectionId } from "@/lib/listingFormSchema";

import BasicInfoSection from "./sections/BasicInfoSection";
import ContactSection from "./sections/ContactSection";
import CoursesSection from "./sections/CoursesSection";
import FeesPlacementsSection from "./sections/FeesPlacementsSection";
import AcademicsSection from "./sections/AcademicsSection";
import FacultySection from "./sections/FacultySection";
import ResultsSection from "./sections/ResultsSection";
import MediaSection from "./sections/MediaSection";
import SeoSection from "./sections/SeoSection";

interface Props {
  listing: any;
  type: ListingType;
}

const ListingFormShell = ({ listing, type }: Props) => {
  const navigate = useNavigate();
  const sections = useMemo(() => getSections(type), [type]);
  const [activeSection, setActiveSection] = useState<SectionId>(sections[0].id);
  const [payload, setPayload] = useState<any>(() => ({ ...emptyPayload(type), ...(listing.payload || {}) }));
  const [completedSections, setCompletedSections] = useState<Record<string, boolean>>(listing.sections || {});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const dirtyRef = useRef(false);

  const readOnly = listing.status === "approved" || listing.status === "pending";

  // Mark dirty whenever payload changes (after mount)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    dirtyRef.current = true;
  }, [payload, completedSections]);

  // Auto-save every 20s if dirty
  useEffect(() => {
    if (readOnly) return;
    const id = setInterval(() => {
      if (dirtyRef.current) saveDraft(true);
    }, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  const updatePayload = (patch: any) => setPayload((p: any) => ({ ...p, ...patch }));

  const saveDraft = async (silent = false) => {
    if (readOnly) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_listings")
        .update({
          payload,
          sections: completedSections,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listing.id);
      if (error) throw error;
      dirtyRef.current = false;
      setLastSavedAt(new Date());
      if (!silent) toast.success("Draft saved");
    } catch (e: any) {
      if (!silent) toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    if (!payload.name?.trim()) {
      toast.error("Name is required before submitting");
      setActiveSection("basic");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("user_listings")
        .update({
          payload,
          sections: completedSections,
          status: "pending",
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", listing.id);
      if (error) throw error;
      toast.success("Submitted for admin review");
      navigate("/my-listings");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const markComplete = (sectionId: SectionId) => {
    setCompletedSections((c) => ({ ...c, [sectionId]: !c[sectionId] }));
  };

  const completedCount = Object.values(completedSections).filter(Boolean).length;
  const progress = Math.round((completedCount / sections.length) * 100);

  const renderSection = () => {
    switch (activeSection) {
      case "basic":
        return <BasicInfoSection type={type} value={payload} onChange={updatePayload} />;
      case "contact":
        return <ContactSection type={type} value={payload} onChange={updatePayload} />;
      case "courses":
        return <CoursesSection value={payload} onChange={updatePayload} />;
      case "academics":
        return <AcademicsSection value={payload} onChange={updatePayload} />;
      case "fees_placements":
        return <FeesPlacementsSection type={type} value={payload} onChange={updatePayload} />;
      case "faculty":
        return <FacultySection value={payload} onChange={updatePayload} />;
      case "results":
        return <ResultsSection value={payload} onChange={updatePayload} />;
      case "media":
        return <MediaSection value={payload} onChange={updatePayload} />;
      case "seo":
        return <SeoSection value={payload} onChange={updatePayload} />;
      default:
        return null;
    }
  };

  const current = sections.find((s) => s.id === activeSection)!;

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      {/* Sidebar */}
      <aside className="space-y-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">PROGRESS</span>
            <span className="text-xs font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-[11px] text-muted-foreground mt-2">
            {completedCount} of {sections.length} sections marked complete
          </p>
        </Card>

        <nav className="space-y-1">
          {sections.map((s) => {
            const isActive = s.id === activeSection;
            const done = completedSections[s.id];
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-2 transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1.5">
                    {s.label}
                    {s.required && <span className="text-[10px] opacity-70">*</span>}
                  </div>
                  <div className={cn("text-[11px] truncate", isActive ? "opacity-80" : "text-muted-foreground")}>
                    {s.description}
                  </div>
                </div>
                {done ? <Check className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="space-y-4 min-w-0">
        {readOnly && (
          <Card className="p-4 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-start gap-2.5 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div>
                <span className="font-semibold">View-only mode.</span>{" "}
                {listing.status === "pending"
                  ? "Your submission is under admin review."
                  : "This listing is approved and live."}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-5 pb-4 border-b border-border">
            <div>
              <h2 className="text-xl font-bold">{current.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{current.description}</p>
            </div>
            {!readOnly && (
              <Button
                type="button"
                variant={completedSections[current.id] ? "default" : "outline"}
                size="sm"
                onClick={() => markComplete(current.id)}
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                {completedSections[current.id] ? "Marked complete" : "Mark complete"}
              </Button>
            )}
          </div>

          <fieldset disabled={readOnly} className={cn(readOnly && "opacity-80 pointer-events-none")}>
            {renderSection()}
          </fieldset>
        </Card>

        {!readOnly && (
          <div className="flex items-center justify-between gap-3 flex-wrap sticky bottom-4 bg-background/95 backdrop-blur p-3 border border-border rounded-xl shadow-sm">
            <div className="text-xs text-muted-foreground">
              {lastSavedAt ? (
                <>Auto-saved {lastSavedAt.toLocaleTimeString()}</>
              ) : (
                <>Drafts auto-save every 20 seconds</>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => saveDraft(false)} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save draft
              </Button>
              <Button type="button" onClick={submitForReview} disabled={submitting || saving}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Submit for review
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingFormShell;
