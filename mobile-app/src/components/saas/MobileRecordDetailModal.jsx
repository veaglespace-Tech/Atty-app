import React from "react";
import { View, Text, ScrollView, Modal, Pressable, Image } from "react-native";
import { X } from "lucide-react-native";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return "-";
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return "-";
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

const formatLocation = (rec) => {
  if (rec?.punchInLocationMeta?.displayText) return rec.punchInLocationMeta.displayText;
  if (rec?.punchInLocationMeta?.areaLabel) return rec.punchInLocationMeta.areaLabel;
  return formatCoordinates(rec?.punchInCoordinates);
};

const formatWorkedHours = (rec) => {
  const val = rec?.workedHours ?? rec?.workedMinutes;
  if (val == null) return "-";
  return typeof val === "number" ? val.toFixed(2) : String(val);
};

const formatGeoStatus = (rec) => {
  if (rec?.punchInValid === false) return "No";
  if (rec?.punchOutValid === false) return "No";
  if (rec?.punchInValid === true || rec?.punchOutValid === true) return "Yes";
  return "-";
};

const formatRoleLabel = (role) => {
  if (!role) return "-";
  return String(role)
    .toLowerCase()
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

function DetailField({ label, value, wide }) {
  return (
    <View className={`rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3 ${wide ? "w-full" : "w-[48%]"}`}>
      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </Text>
      <Text className="mt-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100" numberOfLines={wide ? 4 : 2}>
        {value ?? "-"}
      </Text>
    </View>
  );
}

export default function MobileRecordDetailModal({ record, onClose, visible }) {
  if (!record) return null;

  const isAttendance =
    "status" in record &&
    ("punchInAt" in record ||
      "punchOutAt" in record ||
      "workedHours" in record ||
      "punchInCoordinates" in record);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-[#020617]">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-14 pb-4 border-b border-slate-200 dark:border-slate-800">
          <View>
            <Text className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {isAttendance ? "Attendance Details" : "Record Details"}
            </Text>
            <Text className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isAttendance ? "Detailed punch log and verification" : "Overview of all fields"}
            </Text>
          </View>
          <Pressable onPress={onClose} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800">
            <X size={18} color="#94a3b8" />
          </Pressable>
        </View>

        {/* Body */}
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {isAttendance ? (
            <View className="gap-4">
              {/* Member Profile */}
              <View className="flex-row items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <View className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-500/15 items-center justify-center">
                  <Text className="text-base font-bold text-blue-700 dark:text-blue-200">
                    {(record.member || record.userName || "M")?.[0]}
                  </Text>
                </View>
                <View>
                  <Text className="text-sm font-black text-slate-900 dark:text-white">
                    {record.member || record.userName}
                  </Text>
                  <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {formatRoleLabel(record.role)}
                  </Text>
                </View>
              </View>

              {/* Date & Status */}
              <View className="flex-row flex-wrap gap-3">
                <DetailField label="Date" value={record.date || "-"} />
                <DetailField label="Status" value={record.status || "-"} />
              </View>

              {/* Geo & Worked Hours */}
              <View className="flex-row flex-wrap gap-3">
                <DetailField label="Geo Valid" value={formatGeoStatus(record)} />
                <DetailField label="Worked Hours" value={`${formatWorkedHours(record)} hrs`} />
              </View>

              {/* Punch In */}
              <View className="border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-4 gap-3">
                <Text className="text-[11px] font-black uppercase tracking-wider text-slate-400">Punch In Details</Text>
                <View className="flex-row flex-wrap gap-3">
                  <DetailField label="Time" value={formatDate(record.punchInAt)} />
                  <DetailField label="Location" value={formatLocation(record)} />
                </View>
                {record.punchInDistanceMeters != null && (
                  <DetailField label="Distance" value={`${record.punchInDistanceMeters} m`} wide />
                )}
              </View>

              {/* Punch Out */}
              <View className="border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-4 gap-3">
                <Text className="text-[11px] font-black uppercase tracking-wider text-slate-400">Punch Out Details</Text>
                <View className="flex-row flex-wrap gap-3">
                  <DetailField label="Time" value={formatDate(record.punchOutAt)} />
                  <DetailField label="Location" value={
                    record.punchOutLocationMeta?.displayText ||
                    record.punchOutLocationMeta?.areaLabel ||
                    formatCoordinates(record.punchOutCoordinates)
                  } />
                </View>
                {record.punchOutDistanceMeters != null && (
                  <DetailField label="Distance" value={`${record.punchOutDistanceMeters} m`} wide />
                )}
              </View>

              {/* Selfie Proof */}
              {(record.punchInSelfieUrl || record.punchOutSelfieUrl) && (
                <View className="border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-4 gap-3">
                  <Text className="text-[11px] font-black uppercase tracking-wider text-slate-400">Selfie Verification</Text>
                  <View className="flex-row gap-3">
                    {record.punchInSelfieUrl && (
                      <View className="flex-1 items-center gap-2">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Punch In</Text>
                        <Image
                          source={{ uri: record.punchInSelfieUrl }}
                          style={{ width: 100, height: 100, borderRadius: 16 }}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                    {record.punchOutSelfieUrl && (
                      <View className="flex-1 items-center gap-2">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Punch Out</Text>
                        <Image
                          source={{ uri: record.punchOutSelfieUrl }}
                          style={{ width: 100, height: 100, borderRadius: 16 }}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View className="gap-3">
              {Object.entries(record)
                .filter(([key]) => key !== "id" && key !== "_id")
                .map(([key, value]) => {
                  const label = key.replace(/([A-Z])/g, " $1").trim().toUpperCase();
                  if (typeof value === "object" && value !== null) {
                    return (
                      <DetailField
                        key={key}
                        label={label}
                        value={JSON.stringify(value, null, 2)}
                        wide
                      />
                    );
                  }
                  return (
                    <DetailField
                      key={key}
                      label={label}
                      value={value === true ? "Yes" : value === false ? "No" : String(value ?? "-")}
                      wide
                    />
                  );
                })}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Pressable
            onPress={onClose}
            className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center">
            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
