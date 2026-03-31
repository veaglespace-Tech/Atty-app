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
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/80 bg-gradient-to-br from-sky-500 via-blue-600 to-slate-900 text-white shadow-[0_20px_48px_rgba(30,112,209,0.28)]",
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
