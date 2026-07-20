
import { View, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {  ArrowLeft  } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import SectionEyebrow from "@/components/SectionEyebrow";
import { cn } from "@/lib/utils";
import AnimatedLogo from '../AnimatedLogo.jsx';

export const authPageShellClassName =
"flex-1 justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950";

export const authCardClassName =
"overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export const authFieldClassName =
"w-full rounded-[24px] border-2 bg-white px-4 py-4 text-sm text-slate-900 dark:bg-white dark:text-slate-950";

export const authFieldNormalClassName =
"border-slate-200 dark:border-white/80";

export const authFieldErrorClassName =
"border-red-400 bg-red-50/70 dark:border-red-300 dark:bg-white";











export default function AuthPageShell({ maxWidthClassName="max-w-md", cardClassName="", eyebrow, title, description, children, footer }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  return (
    <View className={authPageShellClassName}>
      <View className="absolute left-0 right-0 top-0 h-56 bg-blue-50 dark:bg-slate-900" />
      <SafeAreaView style={{ position: 'absolute', top: 16, left: 16, zIndex: 50 }}>
        <Pressable 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')} 
          className="h-10 w-10 items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} color={isDark ? "#cbd5e1" : "#334155"} />
        </Pressable>
      </SafeAreaView>

      <View className={cn("w-full self-center", maxWidthClassName)}>
        <View className={cn(authCardClassName, cardClassName)}>
          <View className="h-1.5 bg-blue-600 dark:bg-blue-400" />

          <View className="p-5">
            {eyebrow || title || description ?
            <View className="mb-8 items-center">
                <AnimatedLogo 
                  style={{ width: 64, height: 64, marginBottom: 16 }}
                />
                {eyebrow ? <SectionEyebrow className="mb-5">{eyebrow}</SectionEyebrow> : null}
                {title ?
              <Text className="mb-2 text-center text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl md:text-4xl">
                    {title}
                  </Text> :
              null}
                {description ?
              <Text className="text-center font-medium tracking-wide text-slate-500 dark:text-slate-300">
                    {description}
                  </Text> :
              null}
              </View> :
            null}

            {children}

            {footer ? <View className="mt-10 items-center">{footer}</View> : null}
          </View>
        </View>
      </View>
    </View>);

}