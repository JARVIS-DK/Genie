import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import LoadingStates from "../components/LoadingStates";
import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { ArrowLeft, Home, Trash2, Code, Save, X, Pencil } from "lucide-react";
import { useLayout } from "../../context/LayoutContext"; // ✅ corrected import path for React apps
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-jsx";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../../../components/ui/sheet";
import { useFontLoader } from "../../hooks/useFontLoader";
import { trackEvent, MixpanelEvent } from "../../../../utils/mixpanel";
import { getHeader } from "../../services/api/header";

const GroupLayoutPreview: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const rawSlug = typeof params.slug === "string" ? params.slug : "";

  const { getFullDataByTemplateID, loading, refetch } = useLayout();
  const layoutGroup = getFullDataByTemplateID(rawSlug);

  const isCustom = rawSlug.startsWith("custom-");
  const presentationId =
    isCustom && rawSlug.length > 7 ? rawSlug.slice(7) : "";

  const [editorOpen, setEditorOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState("");
  const [currentLayoutName, setCurrentLayoutName] = useState("");
  const [currentLayoutId, setCurrentLayoutId] = useState("");
  const [currentFonts, setCurrentFonts] = useState<string[] | undefined>(
    undefined
  );
  const [isSaving, setIsSaving] = useState(false);
  const [layoutsMap, setLayoutsMap] = useState<
    Record<
      string,
      {
        layout_id: string;
        layout_name: string;
        layout_code: string;
        fonts?: string[];
      }
    >
  >({});
  const [templateMeta, setTemplateMeta] = useState<{
    name?: string;
    description?: string;
  } | null>(null);

  // ✅ Load custom layouts
  useEffect(() => {
    const loadCustomLayouts = async () => {
      if (!isCustom || !presentationId) return;
      try {
        const res = await fetch(
          `/api/v1/ppt/template-management/get-templates/${presentationId}`,
          { headers: getHeader() }
        );
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<
          string,
          {
            layout_id: string;
            layout_name: string;
            layout_code: string;
            fonts?: string[];
          }
        > = {};
        for (const l of data.layouts || []) {
          map[l.layout_name] = {
            layout_id: l.layout_id,
            layout_name: l.layout_name,
            layout_code: l.layout_code,
            fonts: l.fonts,
          };
        }
        setLayoutsMap(map);

        if (data?.template) {
          setTemplateMeta({
            name: data.template.name,
            description: data.template.description,
          });
        }

        if (Array.isArray(data?.fonts) && data.fonts.length) {
          useFontLoader(data.fonts);
        }
      } catch {
        // ignore
      }
    };

    loadCustomLayouts();
  }, [isCustom, presentationId]);

  // ✅ Ensure Tailwind editor styles
  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src*="tailwindcss.com"]'
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }
  }, [rawSlug]);

  // ✅ Handle dynamic font injection
  useEffect(() => {
    if (!isCustom) return;
    const allFonts: string[] = [];
    Object.values(layoutsMap).forEach((entry) => {
      (entry.fonts || []).forEach((f) => allFonts.push(f));
    });
    if (allFonts.length) useFontLoader(allFonts);
  }, [layoutsMap, isCustom]);

  if (loading) return <LoadingStates type="loading" />;
  if (!layoutGroup || layoutGroup.length === 0)
    return <LoadingStates type="empty" />;

  const deleteLayouts = async () => {
    refetch();
    navigate(-1);
    const response = await fetch(
      `/api/v1/ppt/template-management/delete-templates/${presentationId}`,
      {
        method: "DELETE",
        headers: getHeader(),
      }
    );
    if (response.ok) navigate("/template-preview");
  };

  const openEditor = (layoutName: string) => {
    const entry = layoutsMap[layoutName];
    if (!entry) return;

    setCurrentLayoutName(entry.layout_name);
    setCurrentLayoutId(entry.layout_id);
    setCurrentCode(entry.layout_code || "");
    setCurrentFonts(entry.fonts);
    useFontLoader(entry.fonts || []);
    setEditorOpen(true);
  };

  const handleCancel = () => {
    const entry = layoutsMap[currentLayoutName];
    if (entry) setCurrentCode(entry.layout_code || "");
    setEditorOpen(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload = {
        layouts: [
          {
            presentation: presentationId,
            layout_id: currentLayoutId,
            layout_name: currentLayoutName,
            layout_code: currentCode,
            fonts: currentFonts,
          },
        ],
      };

      const res = await fetch(
        `/api/v1/ppt/template-management/save-templates`,
        {
          method: "POST",
          headers: getHeader(),
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) return;

      setLayoutsMap((prev) => ({
        ...prev,
        [currentLayoutName]: {
          layout_id: currentLayoutId,
          layout_name: currentLayoutName,
          layout_code: currentCode,
          fonts: currentFonts,
        },
      }));

      await refetch();
      setEditorOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                trackEvent(
                  MixpanelEvent.TemplatePreview_Back_Button_Clicked,
                  { pathname: location.pathname }
                );
                navigate(-1);
              }}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/template-preview")}
            >
              <Home className="w-4 h-4" /> All Templates
            </Button>

            {isCustom && (
              <button
                className="border border-red-200 flex justify-center items-center gap-2 text-red-700 px-4 py-1 rounded-md"
                onClick={deleteLayouts}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold capitalize">
              {templateMeta?.name || layoutGroup[0].templateID} Layouts
            </h1>
            <p className="text-gray-600 mt-2">
              {layoutGroup.length} layout
              {layoutGroup.length !== 1 ? "s" : ""} •{" "}
              {templateMeta?.description || layoutGroup[0].templateID}
            </p>
          </div>
        </div>
      </header>

      {/* Layout Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {layoutGroup.map((layout: any, index: number) => {
            const { component: LayoutComponent, sampleData, name, fileName } =
              layout;

            return (
              <Card
                key={`${layoutGroup[0].templateID}-${index}`}
                className="overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="bg-white px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">{name}</h3>

                    {isCustom && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!layoutsMap[fileName]}
                        onClick={() => openEditor(fileName)}
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 aspect-video max-w-[1280px] w-full">
                  <LayoutComponent data={sampleData} />
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Right Sheet Editor */}
      {isCustom && (
        <Sheet
          open={editorOpen}
          onOpenChange={(open) => {
            if (!open) handleCancel();
          }}
        >
          <SheetContent side="right" className="w-full sm:max-w-[860px] p-0">
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle>
                <span className="flex items-center gap-2 text-purple-800">
                  <Code className="w-5 h-5 text-purple-600" />
                  HTML Editor
                </span>
              </SheetTitle>
            </SheetHeader>

            <div className="px-2 overflow-y-auto h-[85%]">
              <Editor
                value={currentCode}
                onValueChange={setCurrentCode}
                highlight={(code) => highlight(code, languages.jsx!, "jsx")}
                padding={10}
                className="container__editor"
              />
            </div>

            <SheetFooter className="px-6 py-4 border-b">
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X size={14} /> Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={isSaving}
                >
                  <Save size={14} /> Save HTML
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default GroupLayoutPreview;
