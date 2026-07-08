import type { ReactNode } from "react";
import { View, Text } from "react-native";
import SectionEyebrow from "@/components/SectionEyebrow";
import { cn } from "@/lib/utils";

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

type AuthPageShellProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  cardClassName?: string;
};

export default function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  footer = null,
  maxWidthClassName = "max-w-xl",
  cardClassName = "",
}: AuthPageShellProps) {
  return (
    <View className={authPageShellClassName}>
      <View className="absolute left-0 right-0 top-0 h-56 bg-blue-50 dark:bg-slate-900" />

      <View className={cn("w-full self-center", maxWidthClassName)}>
        <View className={cn(authCardClassName, cardClassName)}>
          <View className="h-1.5 bg-blue-600 dark:bg-blue-400" />

          <View className="p-5">
            {eyebrow || title || description ? (
              <View className="mb-8 items-center">
                {eyebrow ? <SectionEyebrow className="mb-5">{eyebrow}</SectionEyebrow> : null}
                {title ? (
                  <Text className="mb-2 text-center text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl md:text-4xl">
                    {title}
                  </Text>
                ) : null}
                {description ? (
                  <Text className="text-center font-medium tracking-wide text-slate-500 dark:text-slate-300">
                    {description}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {children}

            {footer ? <View className="mt-10 items-center">{footer}</View> : null}
          </View>
        </View>
      </View>
    </View>
  );
}
