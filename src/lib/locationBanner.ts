import { supabase } from "@/integrations/supabase/client";

// Color palettes that match the platform design
const CITY_PALETTES: Record<string, [string, string, string]> = {
  // Major metros get specific palettes
  "Mumbai": ["#1a1a2e", "#16213e", "#0f3460"],
  "Delhi": ["#2d132c", "#4a1942", "#6b2d5b"],
  "Bangalore": ["#1b4332", "#2d6a4f", "#40916c"],
  "Chennai": ["#7f2d00", "#9a3412", "#c2410c"],
  "Kolkata": ["#312e81", "#3730a3", "#4338ca"],
  "Hyderabad": ["#701a75", "#86198f", "#a21caf"],
  "Pune": ["#0c4a6e", "#075985", "#0369a1"],
  "Ahmedabad": ["#713f12", "#854d0e", "#a16207"],
};

const DEFAULT_PALETTES: [string, string, string][] = [
  ["#1e3a5f", "#2563eb", "#3b82f6"],
  ["#1e293b", "#334155", "#475569"],
  ["#134e4a", "#0d9488", "#14b8a6"],
  ["#581c87", "#7c3aed", "#8b5cf6"],
  ["#7c2d12", "#c2410c", "#ea580c"],
  ["#1e3a5f", "#1d4ed8", "#2563eb"],
];

function getPalette(cityName: string): [string, string, string] {
  if (CITY_PALETTES[cityName]) return CITY_PALETTES[cityName];
  // Deterministic palette based on city name hash
  let hash = 0;
  for (let i = 0; i < cityName.length; i++) {
    hash = ((hash << 5) - hash) + cityName.charCodeAt(i);
    hash |= 0;
  }
  return DEFAULT_PALETTES[Math.abs(hash) % DEFAULT_PALETTES.length];
}

/**
 * Generates a professional gradient banner image for a city/state using Canvas API.
 * Returns a data URL (base64 PNG).
 */
export function generateLocationBanner(
  cityName: string,
  stateName: string,
  width = 1400,
  height = 500,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const [c1, c2, c3] = getPalette(cityName);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.5, c2);
  grad.addColorStop(1, c3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decorative circles
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.2, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.15, height * 0.85, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.6, height * 0.7, 150, 0, Math.PI * 2);
  ctx.fill();

  // Dot pattern
  ctx.globalAlpha = 0.03;
  for (let x = 0; x < width; x += 30) {
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;

  // City name
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(height * 0.16)}px 'Segoe UI', system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  // Text shadow
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  ctx.fillText(cityName, width / 2, height * 0.42);

  // State name
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.font = `500 ${Math.round(height * 0.06)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.globalAlpha = 0.7;
  ctx.fillText(stateName, width / 2, height * 0.58);

  // Bottom tag
  ctx.globalAlpha = 0.5;
  ctx.font = `400 ${Math.round(height * 0.04)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText("MBA Colleges & Coaching Institutes", width / 2, height * 0.72);

  // Decorative line
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  const lineWidth = 80;
  ctx.beginPath();
  ctx.moveTo(width / 2 - lineWidth, height * 0.49);
  ctx.lineTo(width / 2 + lineWidth, height * 0.49);
  ctx.stroke();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * Generates a banner and uploads it to storage, returning the public URL.
 */
export async function generateAndUploadLocationBanner(
  cityName: string,
  stateName: string,
  folder = "city-banners",
): Promise<string | null> {
  try {
    const dataUrl = generateLocationBanner(cityName, stateName);
    
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    // Generate filename
    const slug = `${cityName}-${stateName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const filePath = `${folder}/${slug}.jpg`;

    // Upload to storage
    const { error } = await supabase.storage
      .from("uploads")
      .upload(filePath, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("Banner upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (err) {
    console.error("Banner generation error:", err);
    return null;
  }
}
