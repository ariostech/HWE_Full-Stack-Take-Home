"use client";

import { useState } from "react";
import { CreateSiteSchema } from "@emissions/shared";
import { useCreateSite } from "@/hooks/use-emissions";
import { ApiError } from "@/lib/api";

export function CreateSiteForm({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateSite();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [emissionLimit, setEmissionLimit] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payload = {
      name,
      location,
      emission_limit: parseFloat(emissionLimit),
    };

    const validation = CreateSiteSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.errors.map((e) => e.message).join(", "));
      return;
    }

    try {
      await createMutation.mutateAsync(payload);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create site");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Create Site</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Site Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Well Pad Alpha"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="e.g. Alberta, Canada"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emission Limit (kg)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={emissionLimit}
              onChange={(e) => setEmissionLimit(e.target.value)}
              required
              placeholder="e.g. 5000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            {createMutation.isPending ? "Creating..." : "Create Site"}
          </button>
        </form>
      </div>
    </div>
  );
}
