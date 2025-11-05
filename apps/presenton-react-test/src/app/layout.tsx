import React from "react";
import "./globals.css";

import { Providers } from "./providers";
import MixpanelInitializer from "./MixPanelInitializer";
import { LayoutProvider } from "./presentation-generator/context/LayoutContext";
import { Toaster } from "../components/ui/sonner";

// Since next/font is removed, import fonts with CSS or local @font-face rules
// Example in globals.css:
// @font-face {
//   font-family: 'Inter';
//   src: url('./fonts/Inter.ttf') format('truetype');
//   font-weight: 400;
// }

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <div className="antialiased font-inter font-roboto font-instrument_sans">
      <Providers>
        <MixpanelInitializer>
          <LayoutProvider>
            {children}
          </LayoutProvider>
        </MixpanelInitializer>
      </Providers>
      <Toaster position="top-center" />
    </div>
  );
};

export default RootLayout;
