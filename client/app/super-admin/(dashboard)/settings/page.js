"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  useGetSystemSettingsQuery,
  useUpdateSystemSettingMutation,
} from "@/services/api/superAdminApi";
import { addNotification } from "@/store/slices/notificationSlice";
import { Loader2 } from "lucide-react";

export default function SuperAdminSettingsPage() {
  const dispatch = useDispatch();
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
      dispatch(
        addNotification({
          type: "error",
          title: "Invalid Input",
          message: "Please enter a valid GST percentage.",
        })
      );
      return;
    }

    try {
      await updateSetting({ key: "GST_RATE", value: parseFloat(gstRate).toString() }).unwrap();
      dispatch(
        addNotification({
          type: "success",
          title: "Settings Saved",
          message: "GST configuration updated successfully!",
        })
      );
    } catch (err) {
      dispatch(
        addNotification({
          type: "error",
          title: "Update Failed",
          message: err?.data?.message || "Failed to update settings.",
        })
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={40} />
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-gray-800 rounded-xl max-w-3xl mx-auto shadow-sm">
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Failed to Load Settings</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-md">
          {error?.data?.message || "There was a problem retrieving the global system settings."}
        </p>
        <button
          onClick={refetch}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

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
              {isUpdating ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
