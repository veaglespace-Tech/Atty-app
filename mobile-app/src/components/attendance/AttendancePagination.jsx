import React from "react";
import { View, Text, Pressable } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

export default function AttendancePagination({
  recordsLength,
  startIndex,
  endIndex,
  page,
  pageSize,
  totalPages,
  setPage,
  setShowPageSizeModal,
}) {
  if (totalPages <= 1) return null;

  return (
    <View className="bg-slate-900 dark:bg-slate-900 rounded-[24px] p-5 mt-2 flex-col gap-4 border border-[#1e293b]">
      <View>
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Page View</Text>
        <Text className="text-xs font-semibold text-slate-300">
          Showing {startIndex}-{endIndex} of {recordsLength} records
        </Text>
      </View>
      
      <View className="flex-row flex-wrap items-center justify-between gap-4">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-semibold text-slate-400">Rows</Text>
          <Pressable 
            onPress={() => setShowPageSizeModal(true)}
            className="bg-[#1e293b] rounded-lg border border-[#334155] px-3 py-1.5 flex-row items-center active:bg-[#334155]"
          >
            <Text className="text-xs font-bold text-slate-300 mr-1">{pageSize.toString()}</Text>
            <ChevronRight size={12} className="text-slate-400" />
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable 
            onPress={() => setPage(page - 1)}
            disabled={page === 1}
            className={`flex-row items-center gap-1 px-3 py-1.5 rounded-lg border border-[#334155] ${page === 1 ? 'opacity-40' : 'active:bg-[#1e293b]'}`}
          >
            <ChevronLeft size={14} className="text-slate-300" />
            <Text className="text-xs font-bold text-slate-300">Prev</Text>
          </Pressable>

          <Text className="text-xs font-bold text-white px-2">
            {page} / {totalPages}
          </Text>

          <Pressable 
            onPress={() => setPage(page + 1)}
            disabled={page === totalPages}
            className={`flex-row items-center gap-1 px-3 py-1.5 rounded-lg border border-[#334155] ${page === totalPages ? 'opacity-40' : 'active:bg-[#1e293b]'}`}
          >
            <Text className="text-xs font-bold text-slate-300">Next</Text>
            <ChevronRight size={14} className="text-slate-300" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
