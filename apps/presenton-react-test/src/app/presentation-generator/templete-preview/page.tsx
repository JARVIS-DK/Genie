import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingStates from "./components/LoadingStates";
import { Card } from "../../../components/ui/card";
import { Copy, ExternalLink } from "lucide-react";
import Header from "../../../components/Header";
import { useLayout } from "../context/LayoutContext";
import { trackEvent, MixpanelEvent } from "../../../utils/mixpanel";
import { getHeader } from "../services/api/header";
import { toast } from "sonner";

interface SummaryMeta {
  lastUpdatedAt?: number;
  name?: string;
  description?: string;
}

const LayoutPreview: React.FC = () => {
  const {
    getAllTemplateIDs,
    getLayoutsByTemplateID,
    getTemplateSetting,
    getFullDataByTemplateID,
    loading,
    error,
  } = useLayout();

  const navigate = useNavigate();
  const location = useLocation();

  const [summaryMap, setSummaryMap] = useState<
    Record<string, SummaryMeta>
  >({});

  // Load Tailwind when needed (works outside Next.js)
  useEffect(() => {
    if (!document.querySelector('script[src*="tailwindcss.com"]')) {
      const script = document.createElement("script");
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Fetch template summary
  useEffect(() => {
    fetch(`/api/v1/ppt/template-management/summary`, {
      headers: getHeader(),
    })
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, SummaryMeta> = {};
        if (data?.presentations) {
          data.presentations.forEach((p: any) => {
            map[`custom-${p.presentation_id}`] = {
              lastUpdatedAt: p.last_updated_at
                ? new Date(p.last_updated_at).getTime()
                : 0,
              name: p.template?.name,
              description: p.template?.description,
            };
          });
        }
        setSummaryMap(map);
      })
      .catch(() => setSummaryMap({}));
  }, []);

  const layoutTemplates = getAllTemplateIDs().map((templateID) => ({
    templateID,
    layouts: getLayoutsByTemplateID(templateID),
    settings: getTemplateSetting(templateID) || { description: "", ordered: false },
  }));

  const inBuiltTemplates = layoutTemplates.filter(
    (g) => !g.templateID.toLowerCase().startsWith("custom-")
  );

  const customTemplates = layoutTemplates.filter((g) =>
    g.templateID.toLowerCase().startsWith("custom-")
  );

  const customTemplatesSorted = [...customTemplates].sort(
    (a, b) =>
      (summaryMap[b.templateID]?.lastUpdatedAt || 0) -
      (summaryMap[a.templateID]?.lastUpdatedAt || 0)
  );

  // ✅ Loading
  if (loading) return <LoadingStates type="loading" />;

  // ✅ Error
  if (error) return <LoadingStates type="error" message={error} />;

  // ✅ Empty
  if (layoutTemplates.length === 0)
    return <LoadingStates type="empty" />;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />

      <div className="sticky top-0 z-30 bg-white">
        <div className="max-w-7xl mx-auto border-b px-6 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">All Templates</h1>
            <p className="text-gray-600 mt-2">
              {layoutTemplates.length} templates
            </p>
          </div>
        </div>
      </div>

      {/* ✅ Custom Templates */}
      <section className="pt-8 pb-8 flex justify-center">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Custom AI Templates
            </h2>

            <button
              className="text-sm text-gray-800 hover:text-blue-600 flex items-center gap-2"
              onClick={() => {
                trackEvent(MixpanelEvent.Navigation, {
                  from: location.pathname,
                  to: "/custom-template",
                });
                navigate("/custom-template");
              }}
            >
              Create Custom Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplatesSorted.length ? (
              customTemplatesSorted.map((template) => {
                const meta = summaryMap[template.templateID];
                const displayName = meta?.name || template.templateID;
                const displayDescription =
                  meta?.description || template.settings.description;

                const layouts = getFullDataByTemplateID(template.templateID);

                return (
                  <Card
                    key={template.templateID}
                    className="cursor-pointer hover:shadow-md transition"
                    onClick={() => {
                      navigate(`/template-preview/${template.templateID}`);
                    }}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {displayName}
                        </h3>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {template.layouts.length}
                          </span>
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600">ID: {template.templateID}</p>
                        <Copy
                          className="w-4 h-4 text-gray-400 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(template.templateID);
                            toast.success("Copied to clipboard");
                          }}
                        />
                      </div>

                      <p className="text-sm text-gray-600 mt-3 mb-4">{displayDescription}</p>

                      <div className="grid grid-cols-2 gap-2 min-h-[280px]">
                        {layouts.slice(0, 4).map((layout: any, index: number) => {
                          const LayoutComponent = layout.component;
                          return (
                            <div
                              key={index}
                              className="border overflow-hidden aspect-video relative"
                            >
                              <div className="transform scale-[0.2] w-[500%] h-[500%] origin-top-left">
                                <LayoutComponent data={layout.sampleData} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card
                className="cursor-pointer hover:shadow-md transition"
                onClick={() => navigate("/custom-template")}
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold">Create Custom Template</h3>
                  <p className="text-sm text-gray-600">Start building your first template</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* ✅ Inbuilt Templates */}
      <section className="pt-8 flex justify-center">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Inbuilt Templates</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inBuiltTemplates.map((template) => {
              const layouts = getFullDataByTemplateID(template.templateID);
              const displayName = template.templateID;
              const displayDesc = template.settings.description;

              return (
                <Card
                  key={template.templateID}
                  className="cursor-pointer hover:shadow-md transition group"
                  onClick={() => navigate(`/template-preview/${template.templateID}`)}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {displayName}
                      </h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {template.layouts.length}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{displayDesc}</p>

                    <div className="grid grid-cols-2 gap-2 min-h-[280px]">
                      {layouts.slice(0, 4).map((layout: any, index: number) => {
                        const LayoutComponent = layout.component;
                        return (
                          <div
                            key={index}
                            className="border overflow-hidden aspect-video"
                          >
                            <div className="transform scale-[0.2] w-[500%] h-[500%] origin-top-left">
                              <LayoutComponent data={layout.sampleData} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LayoutPreview;
