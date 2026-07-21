"use client";

import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { store } from "@/store";

export default function TeamLeaderLiveLocationButton({
  teamId,
  disabled = false,
  onStart,
  onSuccess,
  onError,
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      if (!teamId) {
        throw new Error("Team context not found in dashboard.");
      }

      setLoading(true);
      onStart?.();

      const [{ getCurrentCoordinates }, { teamLeaderApi }] = await Promise.all([
        import("@/utils/location"),
        import("@/services/api/teamLeaderApi"),
      ]);

      const coords = await getCurrentCoordinates();

      await store
        .dispatch(
          teamLeaderApi.endpoints.patchTeamLeaderTeam.initiate({
            teamId,
            longitude: coords[0],
            latitude: coords[1],
          })
        )
        .unwrap();

      onSuccess?.();
    } catch (error) {
      onError?.(error?.message || "Failed to set live location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
      Set Today&apos;s Live Location
    </button>
  );
}
