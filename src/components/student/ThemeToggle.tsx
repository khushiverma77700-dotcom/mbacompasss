import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentTheme } from "@/contexts/StudentThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useStudentTheme();
  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="h-9 w-9"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
