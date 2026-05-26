import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Sparkles, ArrowRight, Eye, Lock, Zap, BarChart3, Brain } from "lucide-react";

export default function DemoLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-sky-700 shadow ring-1 ring-sky-100"
        >
          <Sparkles className="h-3.5 w-3.5" /> MBA Compass · Live Demo Preview
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl"
        >
          Experience the AI-powered{" "}
          <span className="bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">
            MBA Mock Dashboard
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5 max-w-2xl text-base text-slate-600 sm:text-lg"
        >
          Explore every section, animation, graph and AI tool of MBA Compass — no login, no OTP.
          A fully visual, read-only preview of the platform real CAT toppers use.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/demo/dashboard"
            className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-7 py-4 text-base font-bold text-white shadow-xl shadow-sky-500/30 transition hover:shadow-2xl hover:shadow-sky-500/40"
          >
            <Eye className="h-5 w-5" />
            Enter Demo Dashboard
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
          </Link>
          <Link
            to="/mba-compass"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Buy Full Course
          </Link>
        </motion.div>

        <div className="mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { icon: BarChart3, t: "Live Analytics", d: "Real charts, percentile trajectory, sectional radar" },
            { icon: Brain, t: "AI Hub", d: "Personalised mock tiles, adaptive AI tools" },
            { icon: Zap, t: "All Sections", d: "Mocks, planner, leaderboard, vocabulary, tools" },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="rounded-2xl border border-sky-100 bg-white p-5 text-left shadow-sm"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">{f.t}</h3>
              <p className="mt-1 text-xs text-slate-500">{f.d}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-12 inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Lock className="h-3 w-3" /> Read-only preview · No real data is created or modified
        </p>
      </div>
    </div>
  );
}
