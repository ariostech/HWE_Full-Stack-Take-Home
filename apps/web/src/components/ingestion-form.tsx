"use client";

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { IngestBatchSchema } from "@emissions/shared";
import { useIngestMeasurements, useSites } from "@/hooks/use-emissions";
import { ApiError } from "@/lib/api";

type IngestionState = "idle" | "submitting" | "success" | "error";

export function IngestionForm({
  preselectedSiteId,
  onClose,
}: {
  preselectedSiteId?: string;
  onClose: () => void;
}) {
  const { data: sites } = useSites();
  const ingestMutation = useIngestMeasurements();

  const [siteId, setSiteId] = useState(preselectedSiteId || "");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("kg");
  const [source, setSource] = useState("manual");
  const [state, setState] = useState<IngestionState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => uuidv4());

  const resetForm = useCallback(() => {
    setValue("");
    setIdempotencyKey(uuidv4());
    setState("idle");
    setErrorMsg("");
    setDuplicate(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");
    setDuplicate(false);

    const payload = {
      site_id: siteId,
      measurements: [
        {
          value: parseFloat(value),
          unit,
          timestamp: new Date().toISOString(),
          source,
        },
      ],
    };

    const validation = IngestBatchSchema.safeParse(payload);
    if (!validation.success) {
      setState("error");
      setErrorMsg(validation.error.errors.map((e) => e.message).join(", "));
      return;
    }

    try {
      const res = await ingestMutation.mutateAsync({
        data: payload,
        idempotencyKey,
      });

      if (res.meta?.duplicate) {
        setDuplicate(true);
      }

      setState("success");
    } catch (err) {
      setState("error");
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("An unexpected error occurred");
      }
    }
  };

  const handleRetry = () => {
    handleSubmit(new Event("submit") as unknown as React.FormEvent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Manual Ingestion
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {state === "success" && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${duplicate ? "bg-yellow-50 border border-yellow-200 text-yellow-800" : "bg-green-50 border border-green-200 text-green-800"}`}
          >
            {duplicate
              ? "This reading was already recorded (duplicate detected). No data was duplicated."
              : "Measurement ingested successfully."}
            <div className="mt-2 flex gap-2">
              <button onClick={resetForm} className="text-xs underline">
                Add Another
              </button>
              <button onClick={onClose} className="text-xs underline">
                Close
              </button>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {errorMsg}
            <div className="mt-2">
              <button
                onClick={handleRetry}
                className="text-xs font-medium underline"
              >
                Retry (same idempotency key — safe)
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Site
            </label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Select a site...</option>
              {sites?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                placeholder="e.g. 50.5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="kg">kg</option>
                <option value="tonnes">tonnes</option>
                <option value="mcf">mcf</option>
                <option value="boe">boe</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="manual">Manual</option>
              <option value="sensor">Sensor</option>
              <option value="satellite">Satellite</option>
              <option value="field_engineer">Field Engineer</option>
            </select>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Idempotency Key</div>
            <div className="text-xs font-mono text-gray-700 mt-0.5 break-all">
              {idempotencyKey}
            </div>
          </div>

          <button
            type="submit"
            disabled={state === "submitting"}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            {state === "submitting" ? "Submitting..." : "Submit Reading"}
          </button>
        </form>
      </div>
    </div>
  );
}
