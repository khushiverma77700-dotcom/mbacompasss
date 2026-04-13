// Curated, high-quality Unsplash images for Indian cities
// Used across the platform for location-based visuals

const CITY_IMAGES: Record<string, string> = {
  // Metros
  mumbai: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&h=500&fit=crop&q=80",
  delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&h=500&fit=crop&q=80",
  "new delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&h=500&fit=crop&q=80",
  bangalore: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&h=500&fit=crop&q=80",
  bengaluru: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&h=500&fit=crop&q=80",
  chennai: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=500&fit=crop&q=80",
  kolkata: "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&h=500&fit=crop&q=80",
  hyderabad: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&h=500&fit=crop&q=80",
  pune: "https://images.unsplash.com/photo-1572782252655-9c8771392601?w=800&h=500&fit=crop&q=80",
  ahmedabad: "https://images.unsplash.com/photo-1609948543911-7155701b82e1?w=800&h=500&fit=crop&q=80",

  // Tier 2 cities
  jaipur: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&h=500&fit=crop&q=80",
  lucknow: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=500&fit=crop&q=80",
  chandigarh: "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=800&h=500&fit=crop&q=80",
  indore: "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=800&h=500&fit=crop&q=80",
  bhopal: "https://images.unsplash.com/photo-1609947017136-9daf32a16a28?w=800&h=500&fit=crop&q=80",
  nagpur: "https://images.unsplash.com/photo-1623070573263-8ea3f2896dc2?w=800&h=500&fit=crop&q=80",
  kochi: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=500&fit=crop&q=80",
  varanasi: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&h=500&fit=crop&q=80",
  agra: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=500&fit=crop&q=80",
  mysore: "https://images.unsplash.com/photo-1600112356915-089db0832408?w=800&h=500&fit=crop&q=80",
  udaipur: "https://images.unsplash.com/photo-1602301100442-877ae66fa684?w=800&h=500&fit=crop&q=80",
  jodhpur: "https://images.unsplash.com/photo-1534758950787-7e73625f3efc?w=800&h=500&fit=crop&q=80",
  amritsar: "https://images.unsplash.com/photo-1587899897387-091ebd01a0e2?w=800&h=500&fit=crop&q=80",
  shimla: "https://images.unsplash.com/photo-1597074866923-dc0589150358?w=800&h=500&fit=crop&q=80",
  guwahati: "https://images.unsplash.com/photo-1598197748967-b4674cb3c266?w=800&h=500&fit=crop&q=80",
  dehradun: "https://images.unsplash.com/photo-1626621331169-5f34be280ed9?w=800&h=500&fit=crop&q=80",
  coimbatore: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=500&fit=crop&q=80",
  visakhapatnam: "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=800&h=500&fit=crop&q=80",
  thiruvananthapuram: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=500&fit=crop&q=80",
  bhubaneswar: "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=800&h=500&fit=crop&q=80",
  ranchi: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=500&fit=crop&q=80",
  patna: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=500&fit=crop&q=80",
  surat: "https://images.unsplash.com/photo-1609948543911-7155701b82e1?w=800&h=500&fit=crop&q=80",
  vadodara: "https://images.unsplash.com/photo-1609948543911-7155701b82e1?w=800&h=500&fit=crop&q=80",
  noida: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&h=500&fit=crop&q=80",
  gurgaon: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&h=500&fit=crop&q=80",
  "navi mumbai": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&h=500&fit=crop&q=80",
  thane: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&h=500&fit=crop&q=80",
  nashik: "https://images.unsplash.com/photo-1572782252655-9c8771392601?w=800&h=500&fit=crop&q=80",
  mangalore: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&h=500&fit=crop&q=80",
  raipur: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=500&fit=crop&q=80",
};

// State-level fallback images
const STATE_IMAGES: Record<string, string> = {
  maharashtra: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&h=500&fit=crop&q=80",
  delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&h=500&fit=crop&q=80",
  karnataka: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&h=500&fit=crop&q=80",
  "tamil nadu": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&h=500&fit=crop&q=80",
  "west bengal": "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&h=500&fit=crop&q=80",
  telangana: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&h=500&fit=crop&q=80",
  gujarat: "https://images.unsplash.com/photo-1609948543911-7155701b82e1?w=800&h=500&fit=crop&q=80",
  rajasthan: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&h=500&fit=crop&q=80",
  "uttar pradesh": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=500&fit=crop&q=80",
  kerala: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&h=500&fit=crop&q=80",
  "madhya pradesh": "https://images.unsplash.com/photo-1609947017136-9daf32a16a28?w=800&h=500&fit=crop&q=80",
  punjab: "https://images.unsplash.com/photo-1587899897387-091ebd01a0e2?w=800&h=500&fit=crop&q=80",
  "himachal pradesh": "https://images.unsplash.com/photo-1597074866923-dc0589150358?w=800&h=500&fit=crop&q=80",
  assam: "https://images.unsplash.com/photo-1598197748967-b4674cb3c266?w=800&h=500&fit=crop&q=80",
  uttarakhand: "https://images.unsplash.com/photo-1626621331169-5f34be280ed9?w=800&h=500&fit=crop&q=80",
  haryana: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&h=500&fit=crop&q=80",
  odisha: "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=800&h=500&fit=crop&q=80",
  "andhra pradesh": "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=800&h=500&fit=crop&q=80",
  goa: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&h=500&fit=crop&q=80",
  bihar: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=500&fit=crop&q=80",
  jharkhand: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=500&fit=crop&q=80",
  chhattisgarh: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=500&fit=crop&q=80",
  chandigarh: "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=800&h=500&fit=crop&q=80",
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=500&fit=crop&q=80";

/**
 * Get a city image URL with state fallback.
 * Priority: city-specific → state-level → generic India landmark.
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
