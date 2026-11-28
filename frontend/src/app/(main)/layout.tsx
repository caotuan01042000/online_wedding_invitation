
import { Lobster, Montserrat } from "next/font/google";
import Header from "@/components/Header";
import "@/styles/botanical-theme.css";

const sans = Montserrat({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--f-sans",
});

const script = Lobster({
  subsets: ["vietnamese", "latin"],
  weight: "400",
  variable: "--f-script",
});

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`hm ${sans.variable} ${script.variable}`}>
      <Header />
      {children}
    </div>
  );
}
