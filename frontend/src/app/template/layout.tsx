import TopBar from "@/components/TopBar";

export default function TemplateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      {children}
    </>
  );
}