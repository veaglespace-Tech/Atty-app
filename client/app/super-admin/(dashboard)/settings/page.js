"use client";

import { useState, useEffect } from "react";
import {
  useGetSystemSettingsQuery,
  useUpdateSystemSettingMutation,
} from "@/services/api/superAdminApi";
import { toast } from "sonner";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import ErrorState from "@/components/ui/ErrorState";

export default function SuperAdminSettingsPage() {
  const { data, isLoading, error, refetch } = useGetSystemSettingsQuery();
  const [updateSetting, { isLoading: isUpdating }] = useUpdateSystemSettingMutation();

  const [gstRate, setGstRate] = useState("18");

  useEffect(() => {
    if (data?.items) {
      const gstSetting = data.items.find(s => s.key === "GST_RATE");
      if (gstSetting) {
        setGstRate(gstSetting.value);
      }
    }
  }, [data]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!gstRate || isNaN(parseFloat(gstRate))) {
      toast.error("Please enter a valid GST percentage.");
      return;
    }

    try {
      await updateSetting({ key: "GST_RATE", value: parseFloat(gstRate).toString() }).unwrap();
      toast.success("Settings updated successfully!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update settings");
    }
  };

  if (isLoading) return <LoadingOverlay message="Loading settings..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Global Settings</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage system-wide configurations including taxation and billing defaults.
          </p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div>
            <label htmlFor="gstRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              GST Percentage (%)
            </label>
            <div className="relative max-w-xs">
              <input
                type="number"
                id="gstRate"
                step="0.01"
                min="0"
                max="100"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                placeholder="18"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">%</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              This rate will be dynamically added to all plan prices during checkout and renewals.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
