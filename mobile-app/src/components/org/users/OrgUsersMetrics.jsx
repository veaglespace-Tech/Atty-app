import React, { memo } from "react";
import { View, Text, Platform, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Users, UserCheck, Clock, Activity } from 'lucide-react-native';

const OrgUsersMetrics = ({ summaryMap }) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const metrics = [
    { 
      label: "Total Users", 
      value: summaryMap.get("Total Users") || summaryMap.get("Total") || 0,
      icon: Users,
      lightBg: "bg-blue-50 dark:bg-blue-500/10",
      textColor: "text-blue-600 dark:text-blue-400"
    },
    { 
      label: "Approved", 
      value: summaryMap.get("Approved") || 0,
      icon: UserCheck,
      lightBg: "bg-emerald-50 dark:bg-emerald-500/10",
      textColor: "text-emerald-600 dark:text-emerald-400"
    },
    { 
      label: "Pending", 
      value: summaryMap.get("Pending") || 0,
      icon: Clock,
      lightBg: "bg-amber-50 dark:bg-amber-500/10",
      textColor: "text-amber-600 dark:text-amber-400"
    },
    { 
      label: "Active Now", 
      value: summaryMap.get("Active") || 0,
      icon: Activity,
      lightBg: "bg-indigo-50 dark:bg-indigo-500/10",
      textColor: "text-indigo-600 dark:text-indigo-400"
    },
  ];

  return (
    <View className="flex-row flex-wrap px-4 pt-4 pb-2" style={{ gap: 12, justifyContent: isLargeScreen ? 'space-between' : 'flex-start' }}>
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Animated.View 
            entering={FadeInDown.duration(400).delay(index * 100).springify()}
            key={metric.label} 
            style={{ 
              width: isLargeScreen ? undefined : '48%',
              flex: isLargeScreen ? 1 : undefined,
              minWidth: isLargeScreen ? 160 : undefined,
            }}
          >
            <View className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400" numberOfLines={1}>
                  {metric.label}
                </Text>
                <View className={`h-8 w-8 rounded-full items-center justify-center ${metric.lightBg}`}>
                  <Icon size={14} className={metric.textColor} />
                </View>
              </View>
              <Text className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {metric.value}
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

export default memo(OrgUsersMetrics);
