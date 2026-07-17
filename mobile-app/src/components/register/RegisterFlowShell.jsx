
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";
import SectionEyebrow from "@/components/SectionEyebrow";

const pageShellClassName =
"flex-1 bg-slate-50 px-4 pb-10 pt-8 dark:bg-slate-950";

const cardShellClassName =
"overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";




















export default function RegisterFlowShell({
  badge,
  badgeIcon,
  title,
  description,
  children,
  beforeCard,
  afterCard,
  maxWidthClassName = "max-w-2xl",
  containerClassName = "",
  cardClassName = "",
  contentClassName = "",
  headerClassName = "",
  titleClassName = "",
  descriptionClassName = "",
  badgeClassName = "",
  align = "center"
}) {
  const alignClassName = align === "left" ? "items-start" : "items-center";
  const textAlignClassName = align === "left" ? "text-left" : "text-center";

  return (
    <View className={pageShellClassName}>
      <View className="absolute left-0 right-0 top-0 h-64 bg-blue-50 dark:bg-slate-900" />

      <View className={cn("w-full self-center", maxWidthClassName, containerClassName)}>
        {beforeCard ? <View className="mb-6">{beforeCard}</View> : null}

        <View className={cn(cardShellClassName, cardClassName)}>
          <View className="h-1.5 bg-blue-600 dark:bg-blue-400" />

          <View className={cn("p-5", contentClassName)}>
            {(badge || title || description) &&
            <View className={cn("mb-8", alignClassName, headerClassName)}>
                {badge ?
              <SectionEyebrow icon={badgeIcon} className={cn("mb-5", badgeClassName)}>
                    {badge}
                  </SectionEyebrow> :
              null}

                {title ?
              <Text
                className={cn(
                  "mb-2 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white",
                  textAlignClassName,
                  titleClassName
                )}>
                
                    {title}
                  </Text> :
              null}

                {description ?
              <Text className={cn("font-medium leading-relaxed text-slate-500 dark:text-slate-300", textAlignClassName, descriptionClassName)}>
                    {description}
                  </Text> :
              null}
              </View>
            }

            {children}
          </View>
        </View>

        {afterCard ? <View className="mt-8">{afterCard}</View> : null}
      </View>
    </View>);

}