import React, { useEffect } from "react";
import { initMixpanel, MixpanelEvent, trackEvent } from "../utils/mixpanel";

interface MixpanelInitializerProps {
  children: React.ReactNode;
}

const MixpanelInitializer: React.FC<MixpanelInitializerProps> = ({ children }) => {

  // Initialize Mixpanel once
  useEffect(() => {
    initMixpanel();
  }, []);

  // Track page view based on URL path changes
  useEffect(() => {
    const trackPageView = () => {
      trackEvent(MixpanelEvent.PageView, { url: window.location.pathname });
    };

    trackPageView(); // Track initial load

    // Listen for browser navigation (back/forward)
    window.addEventListener("popstate", trackPageView);

    return () => {
      window.removeEventListener("popstate", trackPageView);
    };
  }, []);

  return <>{children}</>;
};

export default MixpanelInitializer;
