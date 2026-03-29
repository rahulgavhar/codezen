import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  TimeScale
);

const RatingGraph = ({ data = [] }) => {
  // Calculate 12-month window ending at current month
  const now = new Date();
  
  // Use provided data or empty array
  const dataPoints = data && data.length > 0 ? data : [];
    
    // derive axis bounds from data points
    const firstDate = dataPoints[0]?.date;
    const lastDate = dataPoints[dataPoints.length - 1]?.date;
    // min bound: start of month for the first data point
    const startMonth = firstDate
      ? new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 11, 1);
    // max bound: end of month for the last data point
    const currentMonth = lastDate
      ? new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const values = dataPoints.map((d) => d.value);
  const current = values.length > 0 ? values[values.length - 1] : 0;
  const prev = values.length > 1 ? values[values.length - 2] : undefined;
  const delta = (prev !== undefined && current !== undefined) ? current - prev : 0;

  // Compute tick labels: up to 5 months including start and end
  const monthsBetween = (a, b) => (b.getFullYear() * 12 + b.getMonth()) - (a.getFullYear() * 12 + a.getMonth());
  const span = monthsBetween(startMonth, currentMonth);
  const candidateOffsets = span >= 1 ? [0, Math.round(span * 0.25), Math.round(span * 0.5), Math.round(span * 0.75), span] : [0, span];
  const uniqueOffsets = Array.from(new Set(candidateOffsets)).sort((x, y) => x - y).slice(0, 5);
  const tickDates = uniqueOffsets.map((m) => new Date(startMonth.getFullYear(), startMonth.getMonth() + m, 1));

  const chartData = {
    labels: tickDates,
    datasets: [
      {
        label: "Rating",
        // Data points with flexible dates
        data: dataPoints.map((d) => ({ x: d.date, y: d.value })),
        borderColor: "#ffffff",
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const { ctx: c, chartArea } = chart || {};
          if (!chartArea) return "rgba(34,197,94,0.15)";
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, "rgba(34,197,94,0.35)");
          gradient.addColorStop(1, "rgba(34,197,94,0)");
          return gradient;
        },
        tension: 0,
        pointRadius: 2.8,
        pointBackgroundColor: "#ffffff",
        pointHitRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        intersect: false,
        mode: "index",
        displayColors: false,
        backgroundColor: "rgba(2,6,23,0.95)",
        borderColor: "rgba(148,163,184,0.2)",
        borderWidth: 1,
        titleColor: "#e2e8f0",
        bodyColor: "#e2e8f0",
        padding: 10,
        // add a delta icon and color the label by delta
        callbacks: {
            label: function (context) {
                const index = context.dataIndex;
                const value = context.parsed.y;
                let deltaText = "";
                if (index > 0) {
                    const prevValue = context.chart.data.datasets[0].data[index - 1].y;
                    const delta = value - prevValue;
                    deltaText = delta >= 0 ? ` (▲ +${delta})` : ` (▼ ${delta})`;
                }
                return `${value}${deltaText}`;
            },
            labelTextColor: function (context) {
                const index = context.dataIndex;
                const value = context.parsed.y;
                if (index === 0 || typeof value !== 'number') return '#e2e8f0';
                const prevValue = context.chart.data.datasets[0].data[index - 1].y;
                const delta = value - prevValue;
                if (delta > 0) return '#22c55e'; // green
                if (delta < 0) return '#f43f5e'; // red
                return '#e2e8f0'; // neutral
            },
        }
      },
    },
    scales: {
      x: {
        type: "time",
        min: startMonth,
        // set to end of last month to ensure final month is shown
        max: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0),
        time: {
          unit: "month",
          displayFormats: { month: "MMM yyyy" },
          tooltipFormat: "dd MMM yyyy",
        },
        grid: { color: "rgba(148,163,184,0.15)" },
        ticks: {
          color: "#94a3b8",
          source: "labels",
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
        },
      },
      y: {
        grid: { color: "rgba(148,163,184,0.12)" },
        suggestedMin: 0,
        suggestedMax: 1900,
        ticks: { color: "#94a3b8", minTicksLimit: 8 },
      },
    },
    elements: {
      line: { borderWidth: 2.5 },
      point: { radius: 2.8 },
    },
  };

  return (
    <div className="w-full">
      {dataPoints.length === 0 ? (
        <div className="text-center text-slate-400 py-8">
          <p className="text-sm">No rating data available</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-bold text-slate-50 sm:text-xl">Rating</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-50">{current}</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  delta >= 0
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-rose-400/30 bg-rose-400/10 text-rose-200"
                }`}
              >
                {delta >= 0 ? "+" : ""}
                {delta}
              </span>
            </div>
          </div>
          <div className="h-48 w-full sm:h-56 max-md:hidden">
            <Line data={chartData} options={options} />
          </div>
        </>
      )}
    </div>
  );
};

export default RatingGraph;
