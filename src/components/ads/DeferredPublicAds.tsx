import { useAdSlots } from "./AdSlots";
export default function DeferredPublicAds() {
  const ads = useAdSlots();
  return <>{ads.end}{ads.portals}</>;
}