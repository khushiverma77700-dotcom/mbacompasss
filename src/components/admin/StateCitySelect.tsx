import { useMemo, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDIAN_STATES, getCitiesForState } from "@/data/indianLocations";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

interface StateCitySelectProps {
  state: string;
  city: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  /** When true, city resets on state change (default: true) */
  resetCityOnStateChange?: boolean;
  /** Layout: "row" for side-by-side, "col" for stacked */
  layout?: "row" | "col";
  /** Show labels above dropdowns */
  showLabels?: boolean;
  /** Custom class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

const StateCitySelect = ({
  state,
  city,
  onStateChange,
  onCityChange,
  resetCityOnStateChange = true,
  layout = "row",
  showLabels = true,
  className = "",
  disabled = false,
}: StateCitySelectProps) => {
  const cities = useMemo(() => getCitiesForState(state), [state]);

  const handleStateChange = useCallback(
    (value: string) => {
      const newState = value === "_none" ? "" : value;
      onStateChange(newState);
    },
    [onStateChange]
  );

  const handleCityChange = useCallback(
    (value: string) => {
      onCityChange(value === "_none" ? "" : value);
    },
    [onCityChange]
  );

  const gridClass = layout === "row" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3";

  return (
    <div className={`${gridClass} ${className}`}>
      <div>
        {showLabels && (
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            <MapPin className="w-3 h-3 inline mr-1" />State
          </Label>
        )}
        <Select value={state || "_none"} onValueChange={handleStateChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Select state...</SelectItem>
            {INDIAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        {showLabels && (
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            <MapPin className="w-3 h-3 inline mr-1" />City
          </Label>
        )}
        <Select
          value={city || "_none"}
          onValueChange={handleCityChange}
          disabled={disabled || !state}
        >
          <SelectTrigger>
            <SelectValue placeholder={state ? "Select city" : "Select state first"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Select city...</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state && cities.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">{cities.length} cities available</p>
        )}
      </div>
    </div>
  );
};

export default StateCitySelect;
