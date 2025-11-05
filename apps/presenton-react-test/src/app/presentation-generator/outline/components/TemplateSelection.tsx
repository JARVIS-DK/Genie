import React, { useEffect, useMemo, useState } from "react";
import { Template } from "../types/index";
import { useLayout } from "../../context/LayoutContext";
import TemplateLayouts from "./TemplateLayouts";
import { getHeader } from "../../services/api/header";

interface TemplateSelectionProps {
  selectedTemplate: Template | null;
  onSelectTemplate: (template: Template) => void;
}

const TemplateSelection: React.FC<TemplateSelectionProps> = ({
  selectedTemplate,
  onSelectTemplate
}) => {
  const {
    getLayoutsByTemplateID,
    getTemplateSetting,
    getAllTemplateIDs,
    getFullDataByTemplateID,
    loading
  } = useLayout();

  const [summaryMap, setSummaryMap] = useState<
    Record<string, { lastUpdatedAt?: number; name?: string; description?: string }>
  >({});

  // Fetch custom template metadata
  useEffect(() => {
    fetch(`/api/v1/ppt/template-management/summary`, {
      headers: getHeader(),
    })
      .then(res => res.json())
      .then(data => {
        const map: Record<string, { lastUpdatedAt?: number; name?: string; description?: string }> = {};
        if (data && Array.isArray(data.presentations)) {
          for (const p of data.presentations) {
            const slug = `custom-${p.presentation_id}`;
            map[slug] = {
              lastUpdatedAt: p.last_updated_at ? new Date(p.last_updated_at).getTime() : 0,
              name: p.template?.name,
              description: p.template?.description,
            };
          }
        }
        setSummaryMap(map);
      })
      .catch(() => setSummaryMap({}));
  }, []);

  // Build templates list
  const templates: Template[] = useMemo(() => {
    const ids = getAllTemplateIDs();
    if (ids.length === 0) return [];

    const list: Template[] = ids
      .filter(templateID => {
        const fullData = getFullDataByTemplateID(templateID);
        const hasErrors = fullData.some((fd: any) => fd?.component?.displayName === "CustomTemplateErrorSlide");
        return !hasErrors;
      })
      .map(templateID => {
        const settings = getTemplateSetting(templateID);
        const meta = summaryMap[templateID];
        const isCustom = templateID.toLowerCase().startsWith("custom-");

        return {
          id: templateID,
          name: isCustom && meta?.name ? meta.name : templateID,
          description: (isCustom && meta?.description)
            ? meta.description
            : settings?.description || `${templateID} presentation templates`,
          ordered: settings?.ordered || false,
          default: settings?.default || false,
        };
      });

    // Sort so default templates come first
    return list.sort((a, b) => {
      if (a.default && !b.default) return -1;
      if (!a.default && b.default) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [getAllTemplateIDs, getTemplateSetting, getFullDataByTemplateID, summaryMap]);

  const inBuiltTemplates = useMemo(
    () => templates.filter(t => !t.id.toLowerCase().startsWith("custom-")),
    [templates]
  );

  const customTemplates = useMemo(() => {
    const arr = templates.filter(t => t.id.toLowerCase().startsWith("custom-"));
    return arr.sort((a, b) => (summaryMap[b.id]?.lastUpdatedAt || 0) - (summaryMap[a.id]?.lastUpdatedAt || 0));
  }, [templates, summaryMap]);

  // Auto-select first template
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const defaultOne = templates.find(t => t.default) || templates[0];
      const slides = getLayoutsByTemplateID(defaultOne.id);
      onSelectTemplate({ ...defaultOne, slides });
    }
  }, [templates, selectedTemplate, onSelectTemplate, getLayoutsByTemplateID]);

  // Load tailwind script only if missing (React safe)
  useEffect(() => {
    if (loading) return;

    const exists = document.querySelector('script[src*="tailwindcss.com"]');
    if (!exists) {
      const script = document.createElement("script");
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }
  }, [loading]);

  const handleTemplateSelection = (template: Template) => {
    const slides = getLayoutsByTemplateID(template.id);
    onSelectTemplate({ ...template, slides });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 border rounded-lg bg-gray-50 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-3"></div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1, 2, 3].map(j => (
                  <div key={j} className="aspect-video bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <h5 className="text-lg font-medium text-gray-700">No Templates Available</h5>
        <p className="text-gray-600 text-sm">
          No templates were loaded. Try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mb-4">
      {/* In-built */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">In-Built Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inBuiltTemplates.map(template => (
            <TemplateLayouts
              key={template.id}
              template={template}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={handleTemplateSelection}
            />
          ))}
        </div>
      </div>

      {/* Custom */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom AI Templates</h3>

        {customTemplates.length === 0 ? (
          <div className="text-sm text-gray-600 py-2">
            No custom templates available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customTemplates.map(template => (
              <TemplateLayouts
                key={template.id}
                template={template}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={handleTemplateSelection}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateSelection;
