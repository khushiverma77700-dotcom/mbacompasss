export function articleAttribution(author?: string | null) {
  const name = author?.trim();
  const editorial = !name || /^MBA Compass Editorial(?: Team)?$/i.test(name);
  return editorial
    ? { name: "MBA Compass Editorial Team", role: "Editorial Team", type: "Organization", url: "/authors/mba-compass-editorial-team" }
    : { name, role: "Author", type: "Person", url: undefined };
}