import React, { ReactNode } from "react";
import { ConfigurationInitializer } from "../ConfigurationInitializer";

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div>
      <ConfigurationInitializer>{children}</ConfigurationInitializer>
    </div>
  );
};

export default Layout;
