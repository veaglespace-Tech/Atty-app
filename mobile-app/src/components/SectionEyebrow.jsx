
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";








export default function SectionEyebrow({
  icon: Icon = null,
  children,
  className = "",
  iconClassName = ""
}) {
  if (!children) return null;

  return (
    <View
      className={cn(
        "self-center flex-row items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 dark:border-blue-500/20 dark:bg-blue-500/10",
        className
      )}>
      
      {Icon ?
      <Icon
        size={14}
        color="#2563eb"
        className={cn("text-blue-600 dark:text-blue-300", iconClassName)} /> :

      null}
      <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-200">
        {children}
      </Text>
    </View>);

}