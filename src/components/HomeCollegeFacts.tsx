import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@/lib/router-compat";
import { homeCollegeFactsQuery } from "@/lib/queries/homeCollegeFacts";

export default function HomeCollegeFacts({ cutoffs = false }: { cutoffs?: boolean }) {
  const { data: colleges } = useSuspenseQuery(homeCollegeFactsQuery);
  const rows = cutoffs ? colleges.filter(college => college.cutoffs.length) : colleges;
  if (!rows.length) return null;
  return <section className="bg-background py-12 md:py-16">
    <div className="container mx-auto px-4">
      <h2 className="font-heading text-3xl font-bold text-foreground">{cutoffs ? "MBA college cutoffs" : "MBA college fees and placements"}</h2>
      <p className="mb-6 mt-2 text-base text-muted-foreground">{cutoffs ? "Category, exam and year are shown where recorded in the college profile. Cutoffs are not admission guarantees." : "Programme fees and average packages from the same records displayed on each college profile. CTC is not take-home salary."}</p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-foreground"><tr><th className="p-4">College</th><th className="p-4">Programme fees</th><th className="p-4">Average package</th>{cutoffs && <th className="p-4">Recorded cutoff</th>}</tr></thead>
          <tbody>{rows.map(college => <tr key={college.id} className="border-t border-border">
            <td className="p-4 font-semibold"><Link to={`/college/${college.slug}`} className="text-primary hover:underline">{college.name}</Link></td>
            <td className="p-4 text-foreground">{college.fees || "Not disclosed"}</td>
            <td className="p-4 text-foreground">{college.placement_avg || "Not disclosed"}</td>
            {cutoffs && <td className="p-4 text-foreground"><ul className="space-y-1">{college.cutoffs.map((cutoff, index) => <li key={index}>{[cutoff.category, cutoff.exam, cutoff.year].filter(Boolean).join(" · ")}: {cutoff.percentile || "Not disclosed"}</li>)}</ul></td>}
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </section>;
}