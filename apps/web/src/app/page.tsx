"use client";

import { useState } from "react";
import { SitesTable, SiteMetricsPanel } from "@/components/sites-table";
import { IngestionForm } from "@/components/ingestion-form";
import { CreateSiteForm } from "@/components/create-site-form";

export default function DashboardPage() {
  const [showIngestion, setShowIngestion] = useState(false);
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [metricsSiteId, setMetricsSiteId] = useState<string | null>(null);

  const handleSelectSite = (id: string) => {
    setSelectedSiteId(id);
    setShowIngestion(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Monitoring Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Real-time emission monitoring across all sites. Data refreshes every
            5 seconds.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateSite(true)}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            + New Site
          </button>
          <button
            onClick={() => {
              setSelectedSiteId(null);
              setShowIngestion(true);
            }}
            className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Manual Ingestion
          </button>
        </div>
      </div>

      {metricsSiteId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Site Metrics</h3>
            <button
              onClick={() => setMetricsSiteId(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>
          <SiteMetricsPanel siteId={metricsSiteId} />
        </div>
      )}

      <SitesTable onSelectSite={handleSelectSite} />

      {showIngestion && (
        <IngestionForm
          preselectedSiteId={selectedSiteId || undefined}
          onClose={() => {
            setShowIngestion(false);
            setSelectedSiteId(null);
          }}
        />
      )}

      {showCreateSite && (
        <CreateSiteForm onClose={() => setShowCreateSite(false)} />
      )}
    </div>
  );
}
