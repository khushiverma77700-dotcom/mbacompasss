import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Info, ChevronLeft, ChevronRight, X } from "lucide-react";
import { announcements } from "@/data/mockData";

const iconMap = {
  urgent: AlertCircle,
  success: CheckCircle,
  info: Info,
};

const bgMap = {
  urgent: "bg-destructive/10 border-destructive/20 text-destructive",
  success: "bg-green-50 border-green-200 text-green-800",
  info: "bg-secondary border-border text-secondary-foreground",
};

const AnnouncementBanner = () => {
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (dismissed) return null;

  const announcement = announcements[current];
  const Icon = iconMap[announcement.type];

  return (
    <div className={`border-b ${bgMap[announcement.type]} py-3`}>
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
