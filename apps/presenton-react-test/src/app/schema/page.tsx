import React from "react";
import { useLayout } from "../presentation-generator/context/LayoutContext";

const Page: React.FC = () => {
  const [templateID, setTemplateID] = React.useState<string | null>(null);
  const { getLayoutsByTemplateID, getTemplateSetting, loading } = useLayout();

  // Extract query params from window.location
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTemplateID(params.get("group"));
  }, []);

  if (!templateID) {
    return <div>No templateID provided</div>;
  }

  const layouts = getLayoutsByTemplateID(templateID);
  const settings = getTemplateSetting(templateID);

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <div data-layouts={JSON.stringify(layouts)}>
            <pre>{JSON.stringify(layouts, null, 2)}</pre>
          </div>

          <div data-settings={JSON.stringify(settings)}>
            <pre>{JSON.stringify(settings, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
