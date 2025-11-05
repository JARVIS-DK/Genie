import React from "react";
import { LayoutDashboard, Settings } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { trackEvent, MixpanelEvent } from "../../../utils/mixpanel";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * React (non-Next.js) version of HeaderNav
 */
const HeaderNav: React.FC = () => {
  const canChangeKeys = useSelector(
    (state: RootState) => state.userConfig.can_change_keys
  );
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (to: string) => {
    trackEvent(MixpanelEvent.Navigation, {
      from: location.pathname,
      to,
    });
    navigate(to);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleNavigation("/dashboard")}
        className={`flex items-center gap-2 px-3 py-2 text-white hover:bg-primary/80 rounded-md transition-colors outline-none ${
          location.pathname === "/dashboard" ? "bg-primary/70" : ""
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-sm font-medium font-inter">Dashboard</span>
      </button>

      {canChangeKeys && (
        <button
          onClick={() => handleNavigation("/settings")}
          className={`flex items-center gap-2 px-3 py-2 text-white hover:bg-primary/80 rounded-md transition-colors outline-none ${
            location.pathname === "/settings" ? "bg-primary/70" : ""
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium font-inter">Settings</span>
        </button>
      )}
    </div>
  );
};

export default HeaderNav;
