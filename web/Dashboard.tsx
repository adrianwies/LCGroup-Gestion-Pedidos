import { ReportingDashboard } from "./ReportingDashboard";
const paths: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  orders:
    "M5 3h14v18l-2-1.5L15 21l-3-1.5L9 21l-2-1.5L5 21V3z M8 8h8 M8 12h8 M8 16h5",
  clients:
    "M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21v-3a7 7 0 0 1 14 0v3 M17 4a4 4 0 0 1 0 8 M19 15a6 6 0 0 1 3 6",
  stock: "M3 10l9-6 9 6v11H3V10z M7 21v-7h10v7 M3 10h18",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  layers: "M2 7l10-5 10 5-10 5L2 7z M2 12l10 5 10-5",
  settings: "M12 2.5l1.4 2.1 2.5.4 1.7-1.8 3.2 3.2-1.8 1.7.4 2.5 2.1 1.4-2.1 1.4-.4 2.5 1.8 1.7-3.2 3.2-1.7-1.8-2.5.4-1.4 2.1-1.4-2.1-2.5-.4-1.7 1.8-3.2-3.2 1.8-1.7-.4-2.5L2.5 12l2.1-1.4L5 8.1 3.2 6.4l3.2-3.2L8.1 5l2.5-.4L12 2.5z M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
};
export function NavIcon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
export function Dashboard({role,navigate}:{role:string;navigate:(view:string)=>void}) { return <ReportingDashboard role={role} navigate={navigate}/>; }
