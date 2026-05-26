import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, ShoppingBag, ArrowRight, X } from "lucide-react";

type Ctx = { open: (feature?: string) => void };
const DemoLockCtx = createContext<Ctx>({ open: () => {} });

export const useDemoLock = () => useContext(DemoLockCtx);

const COURSE_URL = "/mba-compass";

export function DemoLockProvider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);
  const [feature, setFeature] = useState<string | undefined>();

  const open = useCallback((f?: string) => {
    setFeature(f);
    setShow(true);
  }, []);

  return (
    <DemoLockCtx.Provider value={{ open }}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShow(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              data-demo-allow="true"
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-sky-100"
            >
              {/* glow header */}
              <div className="relative h-32 overflow-hidden bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/20 blur-2xl"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                  className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-cyan-300/30 blur-2xl"
                />
                <div className="relative z-10 flex h-full items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 ring-2 ring-white/40 backdrop-blur"
                  >
                    <Lock className="h-8 w-8 text-white" strokeWidth={2.4} />
                  </motion.div>
                </div>
                <button
                  data-demo-allow="true"
                  onClick={() => setShow(false)}
                  className="absolute right-3 top-3 z-20 rounded-full bg-white/15 p-1.5 text-white/90 transition hover:bg-white/25"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 pb-6 pt-5 text-center">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                  <Sparkles className="h-3 w-3" /> Demo Preview
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {feature ? `Unlock “${feature}”` : "This is a Demo Dashboard"}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  You're exploring a read-only preview of <span className="font-semibold text-slate-800">MBA Compass</span>.
                  Purchase the full course to unlock real mocks, AI tools, planners and personalised analytics.
                </p>

                <div className="mt-5 grid gap-2">
                  <a
                    data-demo-allow="true"
                    href={COURSE_URL}
                    className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:shadow-xl hover:shadow-sky-500/40"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Buy Full Course
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </a>
                  <button
                    data-demo-allow="true"
                    onClick={() => setShow(false)}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Continue Exploring Demo
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DemoLockCtx.Provider>
  );
}
