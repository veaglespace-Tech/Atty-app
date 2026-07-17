import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';

const PaginationFooter = ({ startIndex, endIndex, totalItems, rowsPerPage, setIsRowsModalOpen, page, totalPages, setPage }) => {
  return (
    <View className="p-5 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950/50">
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Page View</Text>
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Showing {startIndex}-{endIndex} of {totalItems} users
          </Text>
        </View>
      </View>
      
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-bold text-slate-400">Rows</Text>
          <Pressable 
            onPress={() => setIsRowsModalOpen(true)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 flex-row items-center gap-2"
          >
            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{rowsPerPage}</Text>
            <ChevronDown size={14} className="text-slate-400" />
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable 
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 flex-row items-center gap-1 ${page === 1 ? 'opacity-50' : 'active:bg-slate-50'}`}
          >
            <ChevronLeft size={14} className="text-slate-600 dark:text-slate-400" />
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Prev</Text>
          </Pressable>
          
          <Text className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2">
            {page} / {totalPages}
          </Text>

          <Pressable 
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 flex-row items-center gap-1 ${(page === totalPages || totalPages === 0) ? 'opacity-50' : 'active:bg-slate-50'}`}
          >
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Next</Text>
            <ChevronRight size={14} className="text-slate-600 dark:text-slate-400" />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default React.memo(PaginationFooter);
