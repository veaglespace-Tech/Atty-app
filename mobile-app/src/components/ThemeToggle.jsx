import { Pressable, View } from "react-native";
import { Moon, Sun } from "lucide-react-native";
import { useColorScheme } from "nativewind";

export default function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Pressable
      onPress={toggleColorScheme}
      className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 active:opacity-80 border border-slate-200 dark:border-slate-700"
    >
      {isDark ? (
        <Sun size={18} className="text-slate-400" />
      ) : (
        <Moon size={18} className="text-slate-600" />
      )}
    </Pressable>
  );
}
