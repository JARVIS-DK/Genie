import React from "react";
import { Link, useLocation } from "react-router-dom";

import Wrapper from "../../../../components/Wrapper";
import BackBtn from "../../../../components/BackBtn";
// import HeaderNav from "../../HeaderNav/components/HeaderNab";
import HeaderNav from "../../components/HeaderNab";

import { Layout, FilePlus2 } from "lucide-react";
import { trackEvent, MixpanelEvent } from "../../../../utils/mixpanel";

const Header: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="bg-[#5146E5] w-full shadow-lg sticky top-0 z-50">
      <Wrapper>
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            {(pathname !== "/upload" && pathname !== "/dashboard") && <BackBtn />}

            <Link
              to="/dashboard"
              onClick={() =>
                trackEvent(MixpanelEvent.Navigation, {
                  from: pathname,
                  to: "/dashboard",
                })
              }
            >
              <img src="/logo-white.png" alt="Presentation logo" className="h-16" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/custom-template"
              onClick={() =>
                trackEvent(MixpanelEvent.Navigation, {
                  from: pathname,
                  to: "/custom-template",
                })
              }
              className="flex items-center gap-2 px-3 py-2 text-white hover:bg-primary/80 rounded-md transition-colors outline-none"
              role="menuitem"
            >
              <FilePlus2 className="w-5 h-5" />
              <span className="text-sm font-medium font-inter">Create Template</span>
            </Link>

            <Link
              to="/template-preview"
              onClick={() =>
                trackEvent(MixpanelEvent.Navigation, {
                  from: pathname,
                  to: "/template-preview",
                })
              }
              className="flex items-center gap-2 px-3 py-2 text-white hover:bg-primary/80 rounded-md transition-colors outline-none"
              role="menuitem"
            >
              <Layout className="w-5 h-5" />
              <span className="text-sm font-medium font-inter">Templates</span>
            </Link>

            <HeaderNav />
          </div>
        </div>
      </Wrapper>
    </div>
  );
};

export default Header;
