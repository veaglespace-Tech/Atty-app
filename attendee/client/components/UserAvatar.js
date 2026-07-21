import Image from "next/image";
import { cn } from "@/lib/utils";

export default function UserAvatar({
  src,
  name,
  alt,
  className,
  imageClassName,
  fallbackClassName,
  sizes = "96px",
}) {
  const userName = String(name || "User").trim() || "User";
  const userInitial = userName.charAt(0).toUpperCase() || "U";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-[rgb(var(--brand-line)/0.84)] bg-gradient-to-br from-blue-600 to-slate-900 text-white shadow-[0_18px_42px_rgba(37,99,235,0.22)]",
        !src ? "font-black" : "",
        className,
        !src ? fallbackClassName : ""
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt || `${userName} profile photo`}
          fill
          sizes={sizes}
          unoptimized
          className={cn("object-cover", imageClassName)}
        />
      ) : (
        <span aria-hidden="true">{userInitial}</span>
      )}
    </div>
  );
}
