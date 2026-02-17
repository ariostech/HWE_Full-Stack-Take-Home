"use client";

import { useSites, useSiteMetrics } from "@/hooks/use-emissions";
import { useState } from "react";

export function SitesTable({
  onSelectSite,
}: {
  onSelectSite: (id: string) => void;
}) {
  const { data: sites, isLoading, error } = useSites();
  const [expandedSite, setExpandedSite] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load sites: {error.message}
      </div>
    );
  }

  if (!sites || sites.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No sites found. Create one to get started.
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow-sm rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Site
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Emissions
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Limit
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sites.map((site) => {
            const total = parseFloat(site.total_emissions_to_date);
            const limit = parseFloat(site.emission_limit);
            const exceeded = total > limit;
            const pct = Math.min((total / limit) * 100, 100);

            return (
              <tr
                key={site.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() =>
                  setExpandedSite(expandedSite === site.id ? null : site.id)
                }
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {site.name}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {site.id.slice(0, 8)}...
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {site.location}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {total.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kg
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${exceeded ? "bg-red-500" : "bg-brand-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600">
                  {limit.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  kg
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      exceeded
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {exceeded ? "Limit Exceeded" : "Within Limit"}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSite(site.id);
                    }}
                    className="text-brand-600 hover:text-brand-800 text-sm font-medium"
                  >
                    Ingest Data
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SiteMetricsPanel({ siteId }: { siteId: string }) {
  const { data: metrics, isLoading, error } = useSiteMetrics(siteId);

  if (isLoading)
    return <div className="animate-pulse h-32 bg-gray-200 rounded-lg" />;
  if (error)
    return <div className="text-red-600 text-sm">Failed to load metrics</div>;
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        label="Total Emissions"
        value={`${metrics.total_emissions_to_date.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`}
      />
      <MetricCard
        label="Emission Limit"
        value={`${metrics.emission_limit.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`}
      />
      <MetricCard
        label="Measurements"
        value={metrics.measurement_count.toString()}
      />
      <MetricCard
        label="Avg per Reading"
        value={`${metrics.average_emission.toFixed(2)} kg`}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}
