
import { View, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {  ArrowLeft  } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useColorScheme } from "nativewind";import SectionEyebrow from "@/components/SectionEyebrow";
import { cn } from "@/lib/utils";
import AnimatedLogo from '../AnimatedLogo.jsx';

export const authPageShellClassName =
"flex-1 justify-center bg-white px-6 py-8 dark:bg-[#0B1120]";

export const authCardClassName =
"w-full bg-transparent";

export const authFieldClassName =
"w-full rounded-[16px] border bg-slate-50 px-4 py-4 text-[15px] font-medium text-slate-900 dark:bg-[#1E293B] dark:text-white";

export const authFieldNormalClassName =
"border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500";

export const authFieldErrorClassName =
"border-red-500 bg-red-50 dark:border-red-500/50 dark:bg-red-950/20";











export default function AuthPageShell({ maxWidthClassName="max-w-md", cardClassName="", eyebrow, title, description, children, footer }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  return (
    <View className={authPageShellClassName}>
      <SafeAreaView style={{ position: 'absolute', top: 16, left: 16, zIndex: 50 }}>
        <Pressable 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')} 
          className="h-10 w-10 items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} color={isDark ? "#cbd5e1" : "#334155"} />
        </Pressable>
      </SafeAreaView>

      <View className={cn("w-full self-center", maxWidthClassName)}>
        <Animated.View entering={FadeInUp.duration(600).springify()} className={cn(authCardClassName, cardClassName)}>
          <View className="py-2">
            {eyebrow || title || description ?
            <View className="mb-8 items-center">
                <AnimatedLogo 
                  style={{ width: 64, height: 64, marginBottom: 16 }}                />
                {eyebrow ? <SectionEyebrow className="mb-4">{eyebrow}</SectionEyebrow> : null}
                {title ?
              <Text className="mb-3 text-center text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
                    {title}
                  </Text> :
              null}
                {description ?
              <Text className="text-center text-sm font-medium leading-relaxed tracking-wide text-slate-500 dark:text-slate-400">
                    {description}
                  </Text> :
              null}
              </View> :
            null}

            {children}

            {footer ? <View className="mt-10 items-center">{footer}</View> : null}
          </View>
        </Animated.View>
      </View>
    </View>);

}
