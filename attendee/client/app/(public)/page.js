import HomeFeatureGrid from "@/components/marketing/home/HomeFeatureGrid";
import HomeHero from "@/components/marketing/home/HomeHero";
import HomeSpotlight from "@/components/marketing/home/HomeSpotlight";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-950 transition-colors duration-500 dark:bg-slate-950 dark:text-white">
      <HomeHero />
      <HomeFeatureGrid />
      <HomeSpotlight />
    </div>
  );
}
