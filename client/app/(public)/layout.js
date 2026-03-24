import Navbar from "@/components/Navbar";

export default function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="overflow-x-clip">{children}</main>
    </>
  );
}
