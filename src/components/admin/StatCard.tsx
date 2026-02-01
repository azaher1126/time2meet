import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: number;
  subValue?: string;
  growth?: number;
  last7Days?: number;
  icon: ReactNode;
  color: "indigo" | "purple" | "green" | "amber" | "cyan";
}

const colorClasses = {
  indigo: "bg-indigo-100 text-indigo-600",
  purple: "bg-purple-100 text-purple-600",
  green: "bg-green-100 text-green-600",
  amber: "bg-amber-100 text-amber-600",
  cyan: "bg-cyan-100 text-cyan-600",
};

export function StatCard({
  title,
  value,
  subValue,
  growth,
  last7Days,
  icon,
  color,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>{icon}</div>
        {growth !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              growth >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {growth >= 0 ? (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            )}
            {Math.abs(growth)}%
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
      {last7Days !== undefined && (
        <p className="text-xs text-gray-500 mt-1">+{last7Days} this week</p>
      )}
    </div>
  );
}
