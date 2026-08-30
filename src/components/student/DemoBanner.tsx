import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Eye, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEMO_MESSAGE =
  "This is a demo account for understanding only. Interactions are disabled — please purchase a course to unlock full access.";

/**
 * Mounted only when the LMS is rendered inside <DemoModeProvider>.
 * Renders a persistent banner and installs a capture-phase click/submit/keydown
 * blocker so students can browse the whole dashboard read-only but any attempt
 * to actually *do* something surfaces a toast.
 */
export default function DemoBanner() {
  const { toast } = useToast();

  useEffect(() => {
    const showBlockedToast = () => {
      toast({
        title: "Demo account — read only",
        description: DEMO_MESSAGE,
      });
    };

    // Elements we allow to work: sidebar nav links, top-bar links,
    // exit-demo button, theme toggle, mobile drawer toggle, and anything
    // opted-in with data-demo-allow="true".
    const isAllowed = (el: HTMLElement | null): boolean => {
      let node: HTMLElement | null = el;
      while (node && node !== document.body) {
        if (node.dataset?.demoAllow === "true") return true;
        // Allow same-app navigation links (they only read data, never mutate).
        if (node.tagName === "A") {
          const href = (node as HTMLAnchorElement).getAttribute("href") || "";
          if (
            href.startsWith("/demo") ||
            href.startsWith("/student") ||
            href === "/" ||
            href.startsWith("#")
          ) {
            return true;
          }
        }
        // Sidebar / bottom-nav / header nav is always allowed.
        if (
          node.tagName === "NAV" ||
          node.tagName === "HEADER" ||
          node.tagName === "ASIDE"
        ) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const isInteractive = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      const role = el.getAttribute("role");
      if (role === "button" || role === "menuitem" || role === "tab" || role === "switch" || role === "checkbox") return true;
      return false;
    };

    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        'button, input, textarea, select, [role="button"], [role="menuitem"], [role="tab"], [role="switch"], [role="checkbox"]'
      ) as HTMLElement | null;
      if (!interactive) return;
      if (isAllowed(interactive)) return;
      e.preventDefault();
      e.stopPropagation();
      showBlockedToast();
    };

    const onSubmitCapture = (e: SubmitEvent) => {
      const form = e.target as HTMLElement | null;
      if (isAllowed(form)) return;
      e.preventDefault();
      e.stopPropagation();
      showBlockedToast();
    };

    const onKeyCapture = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        // Text entry itself is harmless; only the eventual submit is blocked.
        return;
      }
      const interactive = target.closest(
        'button, [role="button"], [role="menuitem"], [role="switch"], [role="checkbox"]'
      ) as HTMLElement | null;
      if (!interactive || isAllowed(interactive)) return;
      e.preventDefault();
      e.stopPropagation();
      showBlockedToast();
    };

    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("submit", onSubmitCapture, true);
    document.addEventListener("keydown", onKeyCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("submit", onSubmitCapture, true);
      document.removeEventListener("keydown", onKeyCapture, true);
    };
  }, [toast]);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white text-xs sm:text-sm shadow-md"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex items-center justify-between gap-2 px-3 sm:px-6 h-9">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-medium">
            Demo Account · Read-only preview. Explore freely — actions are disabled.
          </span>
        </div>
        <Link
          to="/student/login"
          data-demo-allow="true"
          className="inline-flex items-center gap-1 rounded-md bg-white/15 hover:bg-white/25 px-2 py-1 text-xs sm:text-xs font-semibold whitespace-nowrap"
        >
          <LogOut className="h-3 w-3" /> Exit demo
        </Link>
      </div>
    </div>
  );
}
