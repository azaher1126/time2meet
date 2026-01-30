"use client";

import { format, parseISO } from "date-fns";
import type { DailyData } from "../types";

interface ChartCardProps {
  title: string;
  data: DailyData[];
  color: "indigo" | "purple" | "green" | "cyan";
}

const colorClasses = {
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  green: "bg-green-500",
  cyan: "bg-cyan-500",
};

const lightColorClasses = {
  indigo: "bg-indigo-100",
  purple: "bg-purple-100",
  green: "bg-green-100",
  cyan: "bg-cyan-100",
};

export function ChartCard({ title, data, color }: ChartCardProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  // Generate Y-axis labels (5 steps)
  const yAxisLabels = [0, 1, 2, 3, 4].map((i) =>
    Math.round((maxCount / 4) * (4 - i))
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">Total: {totalCount}</span>
      </div>

      <div className="flex">
        {/* Y-Axis */}
        <div className="flex flex-col justify-between pr-2 text-xs text-gray-400 h-40">
          {yAxisLabels.map((label, i) => (
            <span key={i} className="text-right w-6">
              {label}
            </span>
          ))}
        </div>

        {/* Chart Area */}
        <div className="flex-1 flex flex-col">
          {/* Bars Container */}
          <div className="relative h-40 flex items-end border-l border-b border-gray-200">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-gray-100 w-full" />
              ))}
            </div>

            {/* Bars */}
            <div className="relative z-10 flex items-end w-full h-full gap-px px-px">
              {data.map((d) => {
                const heightPercent =
                  maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                return (
                  <div
                    key={d.date}
                    className="flex-1 group relative flex flex-col justify-end"
                    style={{ height: "100%" }}
                  >
                    {/* Bar */}
                    <div
                      className={`w-full ${colorClasses[color]} rounded-t-sm transition-all hover:opacity-80`}
                      style={{
                        height: `${heightPercent}%`,
                        minHeight: d.count > 0 ? "2px" : "0",
                      }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20 shadow-lg">
                      <div className="font-medium">
                        {format(parseISO(d.date), "MMM d, yyyy")}
                      </div>
                      <div>
                        {d.count} {d.count === 1 ? "item" : "items"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-Axis Labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-400 pl-1">
            <span>
              {data[0]?.date
                ? format(parseISO(data[0].date), "MMM d")
                : ""}
            </span>
            <span>
              {data[Math.floor(data.length / 2)]?.date
                ? format(parseISO(data[Math.floor(data.length / 2)].date), "MMM d")
                : ""}
            </span>
            <span>
              {data[data.length - 1]?.date
                ? format(parseISO(data[data.length - 1].date), "MMM d")
                : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${colorClasses[color]}`}></div>
          <span>Daily count</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className={`w-3 h-3 rounded ${lightColorClasses[color]} border border-gray-200`}
          ></div>
          <span>Hover for details</span>
        </div>
      </div>
    </div>
  );
}
