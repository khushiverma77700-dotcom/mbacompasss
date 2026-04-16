import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectTagsProps {
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}

export default function MultiSelectTags({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  emptyText = "No options available",
}: MultiSelectTagsProps) {
  const [open, setOpen] = useState(false);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">
              {selected.length > 0 ? `${selected.length} selected` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="max-h-64 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              options.map(opt => {
                const isChecked = selected.includes(opt.value);
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm w-full text-left hover:bg-muted transition-colors",
                      isChecked && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center",
                      isChecked ? "bg-primary border-primary" : "border-muted-foreground/30"
                    )}>
                      {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="flex-1">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(value => {
            const opt = options.find(o => o.value === value);
            return (
              <Badge key={value} variant="secondary" className="gap-1 text-xs">
                {opt?.label || value}
                <button type="button" onClick={() => toggle(value)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
