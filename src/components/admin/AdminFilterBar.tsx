import { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface FilterSelectOption {
  label: string;
  value: string;
}

export interface FilterSelectConfig {
  type: "select";
  key: string;
  label: string;
  placeholder?: string;
  /** Width class on the trigger, e.g. "w-40". */
  width?: string;
  options: FilterSelectOption[];
  /** Optional value->display mapping for the active-chip pill. Defaults to option label. */
  formatChip?: (val: string) => string;
}

export interface FilterCustomConfig {
  type: "custom";
  key: string;
  /** Label shown in the active-filter chip. */
  label: string;
  render: () => ReactNode;
  /** Whether this filter currently has a non-default value. */
  isActive: boolean;
  /** Reset handler, called when the user clicks the chip "x". */
  onClear: () => void;
  /** Optional formatter for the chip text. */
  formatChip?: () => string;
}

export type FilterConfig = FilterSelectConfig | FilterCustomConfig;

interface Props {
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  /** Current filter values (only used to read `select` filter values). */
  values: Record<string, string>;
  /** Setter shared with useAdminFilters. */
  onFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
  activeCount: number;
  /** Optional right-aligned action slot (e.g. "Add" buttons). */
  rightSlot?: ReactNode;
  /** Optional extra info shown under the filter row (e.g. "12 of 240 shown"). */
  resultsHint?: ReactNode;
}

const SEARCH_KEY = "search";

const AdminFilterBar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search by name…",
  filters = [],
  values,
  onFilterChange,
  onClearAll,
  activeCount,
  rightSlot,
  resultsHint,
}: Props) => {
  const renderActiveChips = () => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (searchValue.trim()) {
      chips.push({
        key: SEARCH_KEY,
        label: `Search: "${searchValue.trim()}"`,
        onClear: () => onSearchChange(""),
      });
    }
    for (const f of filters) {
      if (f.type === "select") {
        const v = values[f.key];
        if (v && v !== "all" && v !== "") {
          const opt = f.options.find((o) => o.value === v);
          const display = f.formatChip ? f.formatChip(v) : opt?.label ?? v;
          chips.push({
            key: f.key,
            label: `${f.label}: ${display}`,
            onClear: () => onFilterChange(f.key, "all"),
          });
        }
      } else if (f.isActive) {
        chips.push({
          key: f.key,
          label: f.formatChip ? f.formatChip() : f.label,
          onClear: f.onClear,
        });
      }
    }
    return chips;
  };

  const chips = renderActiveChips();

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {filters.map((f) => {
          if (f.type === "select") {
            return (
              <div key={f.key} className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </span>
                <Select value={values[f.key] ?? "all"} onValueChange={(v) => onFilterChange(f.key, v)}>
                  <SelectTrigger className={f.width ?? "w-44"}>
                    <SelectValue placeholder={f.placeholder ?? f.label} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {f.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }
          return (
            <div key={f.key} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {f.label}
              </span>
              {f.render()}
            </div>
          );
        })}

        {(activeCount > 0 || searchValue.trim()) && (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" /> Clear all
          </Button>
        )}

        {rightSlot && <div className="ml-auto flex items-center gap-2">{rightSlot}</div>}
      </div>

      {(chips.length > 0 || resultsHint) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <Badge key={c.key} variant="secondary" className="gap-1.5 pr-1.5 text-xs">
              {c.label}
              <button
                type="button"
                onClick={c.onClear}
                className="ml-0.5 rounded hover:bg-muted-foreground/15 p-0.5"
                aria-label={`Remove ${c.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {resultsHint && (
            <span className="ml-auto text-xs text-muted-foreground">{resultsHint}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminFilterBar;
