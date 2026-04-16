// Curated images of famous Indian monuments, colleges, and landmarks
// Used across the platform for location-based hero backgrounds
// All images are bundled locally for reliability

import delhiImg from "@/assets/cities/delhi.jpg";
import hyderabadImg from "@/assets/cities/hyderabad.jpg";
import bangaloreImg from "@/assets/cities/bangalore.jpg";
import puneImg from "@/assets/cities/pune.jpg";
import ahmedabadImg from "@/assets/cities/ahmedabad.jpg";
import bhopalImg from "@/assets/cities/bhopal.jpg";
import noidaImg from "@/assets/cities/noida.jpg";
import gurgaonImg from "@/assets/cities/gurgaon.jpg";
import nagpurImg from "@/assets/cities/nagpur.jpg";
import indoreImg from "@/assets/cities/indore.jpg";
import shimlaImg from "@/assets/cities/shimla.jpg";
import guwahatiImg from "@/assets/cities/guwahati.jpg";
import dehradunImg from "@/assets/cities/dehradun.jpg";
import bhubaneswarImg from "@/assets/cities/bhubaneswar.jpg";
import suratImg from "@/assets/cities/surat.jpg";
import vadodaraImg from "@/assets/cities/vadodara.jpg";
import patnaImg from "@/assets/cities/patna.jpg";
import ranchiImg from "@/assets/cities/ranchi.jpg";
import raipurImg from "@/assets/cities/raipur.jpg";
import defaultCampusImg from "@/assets/cities/default-campus.jpg";

// Working Unsplash URLs (verified 200 OK)
const UNSPLASH_MUMBAI = "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=1200&h=600&fit=crop&q=80"; // Gateway of India
const UNSPLASH_CHENNAI = "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&h=600&fit=crop&q=80"; // Marina Beach Temple
const UNSPLASH_KOLKATA = "https://images.unsplash.com/photo-1536421469767-80559bb6f5e1?w=1200&h=600&fit=crop&q=80"; // Victoria Memorial
const UNSPLASH_HYDERABAD = "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=1200&h=600&fit=crop&q=80"; // Charminar
const UNSPLASH_JAIPUR = "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&h=600&fit=crop&q=80"; // Hawa Mahal
const UNSPLASH_LUCKNOW = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&h=600&fit=crop&q=80"; // Bara Imambara
const UNSPLASH_CHANDIGARH = "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=1200&h=600&fit=crop&q=80"; // Rock Garden
const UNSPLASH_KOCHI = "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&h=600&fit=crop&q=80"; // Chinese fishing nets
const UNSPLASH_VARANASI = "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1200&h=600&fit=crop&q=80"; // Ghats
const UNSPLASH_AGRA = "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&h=600&fit=crop&q=80"; // Taj Mahal
const UNSPLASH_AMRITSAR = "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=1200&h=600&fit=crop&q=80"; // Golden Temple
const UNSPLASH_GOA = "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&h=600&fit=crop&q=80"; // Beach
const UNSPLASH_MYSORE = "https://images.unsplash.com/photo-1575999502951-4ab25b5ca889?w=1200&h=600&fit=crop&q=80"; // Mysore Palace
const UNSPLASH_JODHPUR = "https://images.unsplash.com/photo-1548013146-72479768bada?w=1200&h=600&fit=crop&q=80"; // Mehrangarh Fort
const UNSPLASH_UDAIPUR = "https://images.unsplash.com/photo-1595658658481-d53d3f999875?w=1200&h=600&fit=crop&q=80"; // Lake Palace

const CITY_IMAGES: Record<string, string> = {
  // Metros — iconic monuments & college campuses
  mumbai: UNSPLASH_MUMBAI,
  delhi: delhiImg,
  "new delhi": delhiImg,
  bangalore: bangaloreImg,
  bengaluru: bangaloreImg,
  chennai: UNSPLASH_CHENNAI,
  kolkata: UNSPLASH_KOLKATA,
  hyderabad: UNSPLASH_HYDERABAD,
  pune: puneImg,
  ahmedabad: ahmedabadImg,

  // Tier 2 — famous landmarks
  jaipur: UNSPLASH_JAIPUR,
  lucknow: UNSPLASH_LUCKNOW,
  chandigarh: UNSPLASH_CHANDIGARH,
  indore: indoreImg,
  bhopal: bhopalImg,
  nagpur: nagpurImg,
  kochi: UNSPLASH_KOCHI,
  varanasi: UNSPLASH_VARANASI,
  agra: UNSPLASH_AGRA,
  mysore: UNSPLASH_MYSORE,
  udaipur: UNSPLASH_UDAIPUR,
  jodhpur: UNSPLASH_JODHPUR,
  amritsar: UNSPLASH_AMRITSAR,
  shimla: shimlaImg,
  guwahati: guwahatiImg,
  dehradun: dehradunImg,
  coimbatore: UNSPLASH_CHENNAI,
  visakhapatnam: bhubaneswarImg,
  thiruvananthapuram: UNSPLASH_KOCHI,
  bhubaneswar: bhubaneswarImg,
  ranchi: ranchiImg,
  patna: patnaImg,
  surat: suratImg,
  vadodara: vadodaraImg,
  noida: noidaImg,
  gurgaon: gurgaonImg,
  gurugram: gurgaonImg,
  "navi mumbai": UNSPLASH_MUMBAI,
  thane: UNSPLASH_MUMBAI,
  nashik: puneImg,
  mangalore: bangaloreImg,
  raipur: raipurImg,
};

// State-level fallback images — famous state landmarks
const STATE_IMAGES: Record<string, string> = {
  maharashtra: UNSPLASH_MUMBAI,
  delhi: delhiImg,
  karnataka: bangaloreImg,
  "tamil nadu": UNSPLASH_CHENNAI,
  "west bengal": UNSPLASH_KOLKATA,
  telangana: UNSPLASH_HYDERABAD,
  gujarat: ahmedabadImg,
  rajasthan: UNSPLASH_JAIPUR,
  "uttar pradesh": UNSPLASH_AGRA,
  kerala: UNSPLASH_KOCHI,
  "madhya pradesh": bhopalImg,
  punjab: UNSPLASH_AMRITSAR,
  "himachal pradesh": shimlaImg,
  assam: guwahatiImg,
  uttarakhand: dehradunImg,
  haryana: gurgaonImg,
  odisha: bhubaneswarImg,
  "andhra pradesh": UNSPLASH_HYDERABAD,
  goa: UNSPLASH_GOA,
  bihar: patnaImg,
  jharkhand: ranchiImg,
  chhattisgarh: raipurImg,
  chandigarh: UNSPLASH_CHANDIGARH,
};

// Default — iconic Indian college campus
const DEFAULT_IMAGE = defaultCampusImg;

/**
 * Get a city image URL with state fallback.
 * Priority: city-specific → state-level → generic India campus.
 */
export function getLocationImage(cityName?: string | null, stateName?: string | null): string {
  if (cityName) {
    const key = cityName.toLowerCase().trim();
    if (CITY_IMAGES[key]) return CITY_IMAGES[key];
  }
  if (stateName) {
    const stateKey = stateName.toLowerCase().trim();
    if (STATE_IMAGES[stateKey]) return STATE_IMAGES[stateKey];
  }
  return DEFAULT_IMAGE;
}

/**
 * Check if a URL is a canvas-generated banner (data URL or our uploads bucket).
 */
export function isGeneratedBanner(url?: string | null): boolean {
  if (!url) return false;
  return url.startsWith("data:") || url.includes("/city-banners/") || url.includes("/college-banners/") || url.includes("/institute-banners/");
}
