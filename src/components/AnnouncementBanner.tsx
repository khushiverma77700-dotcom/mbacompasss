import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Info, ChevronLeft, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const iconMap = {
  urgent: AlertCircle,
  success: CheckCircle,
  info: Info,
};

const bgMap: Record<string, string> = {
  urgent: "bg-destructive/10 border-destructive/20 text-destructive",
  success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300",
  info: "bg-secondary border-border text-secondary-foreground",
};

interface SiteAnnouncement {
  id: string;
  title: string;
  description: string;
  type: "urgent" | "info" | "success";
}

const fallbackAnnouncements: SiteAnnouncement[] = [
  { id: "a1", title: "CAT 2026 Registration Opens Soon", description: "IIM Calcutta to release CAT 2026 notification in August. Start your preparation now!", type: "urgent" },
  { id: "a2", title: "Early Bird Discount: Save 10% on All Courses", description: "Enroll before April 30th and get flat 10% off on any coaching program listed on BSchoolBuzz.", type: "success" },
  { id: "a3", title: "Free CAT Mock Test Available", description: "Take a free full-length CAT mock test to assess your current preparation level.", type: "info" },
];

const AnnouncementBanner = () => {
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [announcements, setAnnouncements] = useState<SiteAnnouncement[]>(fallbackAnnouncements);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "announcements")
        .maybeSingle();
      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        setAnnouncements(data.value as unknown as SiteAnnouncement[]);
      }
    };
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  if (dismissed || announcements.length === 0) return null;

  const announcement = announcements[current];
  const Icon = iconMap[announcement.type] || Info;

  return (
    <div className={`border-b ${bgMap[announcement.type] || bgMap.info} py-3`}>
      <div className="container mx-auto px-4 flex items-center justify-between gap-4">
        <button onClick={() => setCurrent((current - 1 + announcements.length) % announcements.length)} className="p-1 hover:opacity-70 flex-shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-sm">{announcement.title}</span>
              <span className="text-sm ml-2 hidden sm:inline opacity-80">{announcement.description}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setCurrent((current + 1) % announcements.length)} className="p-1 hover:opacity-70">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setDismissed(true)} className="p-1 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
