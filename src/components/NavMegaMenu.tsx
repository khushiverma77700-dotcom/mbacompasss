import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MenuItem {
  id: string;
  menu_type: string;
  tab_label: string;
  tab_sort_order: number;
  column_title: string;
  column_sort_order: number;
  link_label: string;
  link_url: string;
  link_sort_order: number;
}

interface MegaMenuProps {
  label: string;
  menuType: "college" | "coaching";
  onNavigate?: () => void;
}

const useMegaMenuData = (menuType: string) => {
  return useQuery({
    queryKey: ["mega-menu", menuType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mega_menu_items")
        .select("*")
        .eq("menu_type", menuType)
        .eq("active", true)
        .order("tab_sort_order")
        .order("column_sort_order")
        .order("link_sort_order");
      if (error) throw error;
      return data as MenuItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Build structured data: tabs -> columns -> links
function buildMenuStructure(items: MenuItem[]) {
  const tabs: {
    label: string;
    sortOrder: number;
    columns: {
      title: string;
      sortOrder: number;
      links: { label: string; url: string; sortOrder: number }[];
    }[];
  }[] = [];

  const tabMap = new Map<string, typeof tabs[0]>();

  for (const item of items) {
    if (!tabMap.has(item.tab_label)) {
      const tab = { label: item.tab_label, sortOrder: item.tab_sort_order, columns: [] };
      tabMap.set(item.tab_label, tab);
      tabs.push(tab);
    }

    const tab = tabMap.get(item.tab_label)!;
    let col = tab.columns.find((c) => c.title === item.column_title);
    if (!col) {
      col = { title: item.column_title, sortOrder: item.column_sort_order, links: [] };
      tab.columns.push(col);
    }

    col.links.push({
      label: item.link_label,
      url: item.link_url,
      sortOrder: item.link_sort_order,
    });
  }

  // Sort everything
  tabs.sort((a, b) => a.sortOrder - b.sortOrder);
  for (const tab of tabs) {
    tab.columns.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const col of tab.columns) {
      col.links.sort((a, b) => a.sortOrder - b.sortOrder);
    }
  }

  return tabs;
}

const NavMegaMenu = ({ label, menuType, onNavigate }: MegaMenuProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const ref = useRef<HTMLDivElement>(null);

  const { data: items } = useMegaMenuData(menuType);

  const tabs = useMemo(() => (items ? buildMenuStructure(items) : []), [items]);

  // Set default active tab
  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0].label);
    }
  }, [tabs, activeTab]);

  const enter = () => {
    clearTimeout(timeout.current);
    setOpen(true);
  };

  const leave = () => {
    timeout.current = setTimeout(() => {
      setOpen(false);
      setActiveTab(tabs[0]?.label || null);
    }, 250);
  };

  useEffect(() => () => clearTimeout(timeout.current), []);

  const currentTab = tabs.find((t) => t.label === activeTab);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <button
        className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        onFocus={enter}
      >
        {label}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && tabs.length > 0 && (
        <div className="absolute left-0 top-full pt-2 z-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ minWidth: "720px", maxWidth: "900px" }}
          >
            <div className="flex">
              {/* Left sidebar - Tab labels */}
              <div className="w-48 bg-muted/40 border-r border-border py-3 shrink-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.label}
                    onMouseEnter={() => setActiveTab(tab.label)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === tab.label
                        ? "text-primary bg-card border-r-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                    }`}
                  >
                    {tab.label}
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>

              {/* Right content area - Columns and links */}
              <div className="flex-1 p-5">
                {currentTab && (
                  <div className={`grid gap-6 ${
                    currentTab.columns.length >= 3
                      ? "grid-cols-3"
                      : currentTab.columns.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-1"
                  }`}>
                    {currentTab.columns.map((col) => (
                      <div key={col.title}>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 pb-2 border-b border-border">
                          {col.title}
                        </h4>
                        <ul className="space-y-0.5">
                          {col.links.map((link) => (
                            <li key={link.url + link.label}>
                              <Link
                                to={link.url}
                                onClick={() => {
                                  setOpen(false);
                                  onNavigate?.();
                                }}
                                className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-accent/60 rounded-md transition-colors leading-snug"
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom bar */}
            <div className="bg-muted/30 border-t border-border px-5 py-2.5 flex items-center justify-between">
              <Link
                to={menuType === "college" ? "/colleges" : "/category/cat"}
                onClick={() => { setOpen(false); onNavigate?.(); }}
                className="text-xs font-medium text-primary hover:underline"
              >
                View All {menuType === "college" ? "Colleges" : "Coaching"} →
              </Link>
              <Link
                to={menuType === "college" ? "/compare" : "/#ai-coaching"}
                onClick={() => { setOpen(false); onNavigate?.(); }}
                className="text-xs font-medium text-primary hover:underline"
              >
                {menuType === "college" ? "Compare Colleges" : "AI Coaching Finder"} →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mobile version
export const MobileMegaMenu = ({
  menuType,
  onNavigate,
}: {
  menuType: "college" | "coaching";
  onNavigate?: () => void;
}) => {
  const [expandedTab, setExpandedTab] = useState<string | null>(null);
  const { data: items } = useMegaMenuData(menuType);
  const tabs = useMemo(() => (items ? buildMenuStructure(items) : []), [items]);

  return (
    <div className="ml-3 pl-3 border-l-2 border-primary/20 space-y-1 py-1">
      {tabs.map((tab) => (
        <div key={tab.label}>
          <button
            onClick={() => setExpandedTab(expandedTab === tab.label ? null : tab.label)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md"
          >
            {tab.label}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                expandedTab === tab.label ? "rotate-180" : ""
              }`}
            />
          </button>
          {expandedTab === tab.label && (
            <div className="ml-2 pl-2 border-l border-border space-y-2 py-1">
              {tab.columns.map((col) => (
                <div key={col.title}>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1 px-2">
                    {col.title}
                  </p>
                  {col.links.map((link) => (
                    <Link
                      key={link.url + link.label}
                      to={link.url}
                      onClick={onNavigate}
                      className="block px-2 py-1 text-sm text-muted-foreground hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export { useMegaMenuData, buildMenuStructure };
export default NavMegaMenu;
