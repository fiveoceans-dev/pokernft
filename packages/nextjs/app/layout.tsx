import type { Metadata, Viewport } from "next";
import { ScaffoldStarkAppWithProviders } from "~~/components/ScaffoldStarkAppWithProviders";
import "~~/styles/globals.css";
import { ThemeProvider } from "~~/components/ThemeProvider";

export const metadata: Metadata = {
  title: "PokerNFTs",
  description: "Fast track your starknet journey",
  icons: "/logo.ico",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const ScaffoldStarkApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="flex flex-col min-h-screen bg-main"
      >
        <ThemeProvider>
          <ScaffoldStarkAppWithProviders>
            {children}
          </ScaffoldStarkAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldStarkApp;
