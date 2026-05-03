import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";

const trendData = [
  { week: "W1", percentile: 62, target: 95 },
  { week: "W2", percentile: 68, target: 95 },
  { week: "W3", percentile: 74, target: 95 },
  { week: "W4", percentile: 79, target: 95 },
  { week: "W5", percentile: 84, target: 95 },
  { week: "W6", percentile: 88, target: 95 },
  { week: "W7", percentile: 92, target: 95 },
  { week: "W8", percentile: 95, target: 95 },
];

const subjectFocus = [
  { name: "QA", value: 78, fill: "#0ea5e9" },
  { name: "VARC", value: 86, fill: "#10b981" },
  { name: "DILR", value: 71, fill: "#f59e0b" },
];

export function PercentileTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={trendData}>
        <defs>
          <linearGradient id="planArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
        <YAxis domain={[50, 100]} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Area type="monotone" dataKey="percentile" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#planArea)" />
        <Area type="monotone" dataKey="target" stroke="#10b981" strokeDasharray="4 4" fill="none" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SectionalRadial() {
  return (
    <>
      <ResponsiveContainer width="100%" height={170}>
        <RadialBarChart data={subjectFocus} innerRadius="35%" outerRadius="100%" startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background cornerRadius={6} />
          <Tooltip />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="flex justify-around text-xs">
        {subjectFocus.map((s) => (
          <div key={s.name} className="text-center">
            <div className="font-semibold" style={{ color: s.fill }}>{s.value}%</div>
            <div className="text-muted-foreground">{s.name}</div>
          </div>
        ))}
      </div>
    </>
  );
}
