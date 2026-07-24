import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import { cn } from "@/lib/utils";







export default function RegisterStepBack({
  href,
  label = "Back",
  className = ""
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(href)}
      className={cn(
        "flex-row items-center gap-2",
        className
      )}>
      
      <ChevronLeft
        size={20}
        color="#64748b"
        className="dark:text-blue-300" />
      
      <Text className="text-sm font-bold text-slate-500 dark:text-slate-300">{label}</Text>
    </Pressable>);

}
