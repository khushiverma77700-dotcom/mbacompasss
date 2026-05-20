import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, Sparkles, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import BRAND_LOGO_URL from "@/assets/brandLogo";

/**
 * Compact circular avatar shown in the LMS top-left.
 *
 * - Loads `profiles.avatar_url` for the current user.
 * - Falls back to the MBA Compass brand logo when not set.
 * - Click → opens upload dialog. Files are downscaled in-browser to a
 *   512×512 square (auto-fix) before uploading to the public `uploads`
 *   bucket under `student-avatars/<user_id>/...`.
 * - For the user's first 4 visits to the dashboard, an animated nudge
 *   dialog auto-opens encouraging them to set a profile picture.
 *   Tracked per-user in localStorage as `mbc_avatar_prompt_count:<uid>`.
 */
export default function StudentAvatar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Load current avatar
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [user]);

  // First-4-logins onboarding nudge (skipped once avatar exists)
  useEffect(() => {
    if (!user) return;
    const key = `mbc_avatar_prompt_count:${user.id}`;
    const count = Number(localStorage.getItem(key) ?? "0");
    if (count >= 4) return;
    // Wait briefly so it doesn't fight the page mount; skip if avatar loaded.
    const t = window.setTimeout(() => {
      if (avatarUrl) return;
      setOnboardingOpen(true);
      localStorage.setItem(key, String(count + 1));
    }, 1200);
    return () => window.clearTimeout(t);
  }, [user, avatarUrl]);

  /** Downscale + center-crop to a 512² JPEG for consistent, lightweight avatars. */
  const autoFix = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas unsupported"));
          return;
        }
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        canvas.toBlob(
          (b) => {
            URL.revokeObjectURL(url);
            b ? resolve(b) : reject(new Error("Encoding failed"));
          },
          "image/jpeg",
          0.9
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read image"));
      };
      img.src = url;
    });

  const handleFile = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please pick an image file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fixed = await autoFix(file);
      const path = `student-avatars/${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("uploads")
        .upload(path, fixed, { cacheControl: "3600", upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);
      if (dbErr) throw dbErr;
      setAvatarUrl(publicUrl);
      toast({ title: "Profile picture updated" });
      setOpen(false);
      setOnboardingOpen(false);
      // Stop nudging once they've uploaded.
      localStorage.setItem(`mbc_avatar_prompt_count:${user.id}`, "99");
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const imgSrc = avatarUrl || BRAND_LOGO_URL;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit profile picture"
        className="relative h-8 w-8 rounded-full overflow-hidden ring-2 ring-sky-200 dark:ring-sky-500/30 hover:ring-sky-400 transition-all shrink-0 group"
      >
        <img
          src={imgSrc}
          alt="My avatar"
          className="h-full w-full object-cover bg-white"
          onError={(e) => ((e.currentTarget as HTMLImageElement).src = BRAND_LOGO_URL)}
        />
        <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-3.5 w-3.5 text-white" />
        </span>
      </button>

      {/* Upload dialog (manual open) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-sky-200 bg-white"
            >
              <img src={imgSrc} alt="Avatar preview" className="h-full w-full object-cover" />
            </motion.div>
            <div>
              <h3 className="font-semibold">Profile picture</h3>
              <p className="text-xs text-muted-foreground">
                We'll auto-crop and resize to a clean 512×512 image.
              </p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
            <div className="flex gap-2 w-full">
              <Button className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                {uploading ? "Uploading…" : avatarUrl ? "Change picture" : "Upload picture"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding nudge (first 4 logins) */}
      <AnimatePresence>
        {onboardingOpen && (
          <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
            <DialogContent className="max-w-md overflow-hidden p-0">
              <div className="relative bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-sky-500/10 dark:via-background dark:to-blue-500/5 p-6">
                <button
                  onClick={() => setOnboardingOpen(false)}
                  className="absolute top-3 right-3 p-1 rounded-md hover:bg-black/5 text-muted-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>

                <motion.div
                  initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14 }}
                  className="mx-auto h-28 w-28 rounded-full bg-white ring-4 ring-sky-200 grid place-items-center shadow-xl relative"
                >
                  <img src={imgSrc} alt="Your avatar" className="h-full w-full rounded-full object-cover" />
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shadow-lg"
                  >
                    <Camera className="h-4 w-4" />
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="absolute -top-2 -left-2 text-sky-500"
                  >
                    <Sparkles className="h-5 w-5" />
                  </motion.span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center mt-5 space-y-1.5"
                >
                  <h3 className="text-lg font-bold">Add your profile picture</h3>
                  <p className="text-sm text-muted-foreground">
                    Personalise your dashboard — it takes 5 seconds and we'll
                    auto-crop it for you.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex gap-2 mt-5"
                >
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setOnboardingOpen(false)}
                  >
                    Maybe later
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Upload now
                  </Button>
                </motion.div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
