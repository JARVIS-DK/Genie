import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  lazy,
  Suspense,
} from "react";
import { toast } from "sonner";
import * as z from "zod";
import { useDispatch } from "react-redux";
import { setLayoutLoading } from "../../../store/slices/presentationGeneration";

import * as Babel from "@babel/standalone";
import * as Recharts from "recharts";
import * as d3 from "d3";
import { getHeader } from "../services/api/header";

export interface LayoutInfo {
  id: string;
  name?: string;
  description?: string;
  json_schema: any;
  templateID: string;
  templateName?: string;
}

export interface FullDataInfo {
  name: string;
  component: React.ComponentType<any>;
  schema: any;
  sampleData: any;
  fileName: string;
  templateID: string;
  layoutId: string;
}

export interface TemplateSetting {
  description: string;
  ordered: boolean;
  default?: boolean;
}

export interface TemplateResponse {
  templateID: string;
  templateName?: string;
  files: string[];
  settings: TemplateSetting | null;
}

export interface LayoutData {
  layoutsById: Map<string, LayoutInfo>;
  layoutsByTemplateID: Map<string, Set<string>>;
  templateSettings: Map<string, TemplateSetting>;
  fileMap: Map<string, { fileName: string; templateID: string }>;
  templateLayouts: Map<string, LayoutInfo[]>;
  layoutSchema: LayoutInfo[];
  fullDataByTemplateID: Map<string, FullDataInfo[]>;
}

export interface LayoutContextType {
  getLayoutById: (layoutId: string) => LayoutInfo | null;
  getLayoutsByTemplateID: (templateID: string) => LayoutInfo[];
  getTemplateSetting: (templateID: string) => TemplateSetting | null;
  getAllTemplateIDs: () => string[];
  getAllLayouts: () => LayoutInfo[];
  getFullDataByTemplateID: (templateID: string) => FullDataInfo[];
  getCustomTemplateFonts: (presentationId: string) => string[] | null;
  loading: boolean;
  error: string | null;
  getLayout: (layoutId: string) => React.ComponentType<{ data: any }> | null;
  isPreloading: boolean;
  cacheSize: number;
  refetch: () => Promise<void>;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);
const layoutCache = new Map<string, React.ComponentType<{ data: any }>>();
const createCacheKey = (templateID: string, fileName: string): string =>
  `${templateID}/${fileName}`;

/** ---------------- Compile Custom Runtime Layout ---------------- */
const compileCustomLayout = (layoutCode: string, ReactObj: any, zObj: any) => {
  const cleanCode = layoutCode
    .replace(/import\s+React\s+from\s+'react';?/g, "")
    .replace(/import\s*{\s*z\s*}\s*from\s+'zod';?/g, "")
    .replace(/import\s+.*\s+from\s+['"]zod['"];?/g, "")
    .replace(/const\s+[^=]*=\s*require\(['"]zod['"]\);?/g, "")
    .replace(/typescript/g, "");

  const compiled = Babel.transform(cleanCode, {
    presets: [
      ["react", { runtime: "classic" }],
      ["typescript", { isTSX: true, allExtensions: true }],
    ],
    sourceType: "script",
  }).code;

  const factory = new Function(
    "React",
    "_z",
    "Recharts",
    `
    const z = _z;
    const useRef = React.useRef;
    const useEffect = React.useEffect;

    const {
      ResponsiveContainer, LineChart, Line, BarChart, Bar,
      XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
      AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
      PolarRadiusAxis, ComposedChart, ScatterChart, Scatter, FunnelChart,
      Funnel, TreemapChart, Treemap, SankeyChart, Sankey, RadialBarChart,
      RadialBar, ReferenceLine, ReferenceDot, ReferenceArea, Brush, ErrorBar,
      LabelList, Label
    } = Recharts || {};

    ${compiled}

    return {
      __esModule: true,
      default: typeof dynamicSlideLayout !== 'undefined' ? dynamicSlideLayout
        : (typeof DefaultLayout !== 'undefined' ? DefaultLayout : undefined),
      layoutName,
      layoutId,
      layoutDescription,
      Schema
    };
  `
  );

  return factory(ReactObj, zObj, Recharts);
};

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [layoutData, setLayoutData] = useState<LayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPreloading, setIsPreloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTemplateFonts, setCustomTemplateFonts] = useState<Map<string, string[]>>(
    new Map()
  );
  const dispatch = useDispatch();

  /** ---------------- Load Built-In Templates ---------------- */
  const buildData = async (templateData: TemplateResponse[]) => {
    const layouts: LayoutInfo[] = [];
    const layoutsById = new Map<string, LayoutInfo>();
    const layoutsByTemplateID = new Map<string, Set<string>>();
    const templateSettings = new Map<string, TemplateSetting>();
    const fileMap = new Map<string, { fileName: string; templateID: string }>();
    const templateLayoutsCache = new Map<string, LayoutInfo[]>();
    const fullDataByTemplateID = new Map<string, FullDataInfo[]>();

    setIsPreloading(true);

    for (const template of templateData) {
      if (!layoutsByTemplateID.has(template.templateID)) {
        layoutsByTemplateID.set(template.templateID, new Set());
      }

      const settings = template.settings || {
        description: `${template.templateID} presentation layouts`,
        ordered: false,
        default: false,
      };

      templateSettings.set(template.templateID, settings);
      const templateLayouts: LayoutInfo[] = [];
      const fullData: FullDataInfo[] = [];

      for (const fileName of template.files) {
        try {
          // ✅ replace Next.js dynamic import with standard import()
          const file = fileName.replace(".tsx", "").replace(".ts", "");
          const module = await import(
            `@/presentation-templates/${template.templateID}/${file}`
          );

          if (!module.default) {
            toast.error(`${file} missing default export`);
            continue;
          }
          if (!module.Schema) {
            toast.error(`${file} missing Schema export`);
            continue;
          }

          const cacheKey = createCacheKey(template.templateID, fileName);
          if (!layoutCache.has(cacheKey)) {
            layoutCache.set(cacheKey, module.default);
          }

          const originalLayoutId =
            module.layoutId || file.toLowerCase().replace(/layout$/, "");
          const id = `${template.templateID}:${originalLayoutId}`;
          const name = module.layoutName || file.replace(/([A-Z])/g, " $1").trim();

          const schemaJson = z.toJSONSchema(module.Schema, {
            override: (ctx) => delete ctx.jsonSchema.default,
          });
          const sampleData = module.Schema.parse({});

          const layout: LayoutInfo = {
            id,
            name,
            description: module.layoutDescription || `${name} layout`,
            json_schema: schemaJson,
            templateID: template.templateID,
            templateName: template.templateName,
          };

          const full: FullDataInfo = {
            name,
            component: module.default,
            schema: schemaJson,
            sampleData,
            fileName,
            templateID: template.templateID,
            layoutId: id,
          };

          fileMap.set(id, { fileName, templateID: template.templateID });
          layoutsById.set(id, layout);
          layoutsByTemplateID.get(template.templateID)!.add(id);
          templateLayouts.push(layout);
          fullData.push(full);
          layouts.push(layout);
        } catch (err) {
          console.error("Layout import failed:", err);
        }
      }

      fullDataByTemplateID.set(template.templateID, fullData);
      templateLayoutsCache.set(template.templateID, templateLayouts);
    }

    return {
      layoutsById,
      layoutsByTemplateID,
      templateSettings,
      fileMap,
      templateLayoutsCache,
      layoutSchema: layouts,
      fullDataByTemplateID,
    };
  };

  /** ---------------- Fetch Base + Custom Layouts ---------------- */
  const loadLayouts = async () => {
    try {
      setLoading(true);
      setError(null);
      dispatch(setLayoutLoading(true));

      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error(`Failed: ${res.statusText}`);

      const templates: TemplateResponse[] = await res.json();
      const built = await buildData(templates);
      const custom = await loadCustomLayouts();

      const merged = {
        layoutsById: mergeMaps(built.layoutsById, custom.layoutsById),
        layoutsByTemplateID: mergeMaps(
          built.layoutsByTemplateID,
          custom.layoutsByTemplateID
        ),
        templateSettings: mergeMaps(
          built.templateSettings,
          custom.templateSettings
        ),
        fileMap: mergeMaps(built.fileMap, custom.fileMap),
        templateLayouts: mergeMaps(
          built.templateLayoutsCache,
          custom.templateLayoutsCache
        ),
        fullDataByTemplateID: mergeMaps(
          built.fullDataByTemplateID,
          custom.fullDataByTemplateID
        ),
        layoutSchema: [...built.layoutSchema, ...custom.layoutSchema],
      };

      setLayoutData(merged);
    } catch (err: any) {
      setError(err.message || "Failed to load layouts");
    } finally {
      dispatch(setLayoutLoading(false));
      setLoading(false);
      setIsPreloading(false);
    }
  };

  const mergeMaps = <K, V>(m1: Map<K, V>, m2: Map<K, V>) => {
    const out = new Map(m1);
    m2.forEach((v, k) => out.set(k, v));
    return out;
  };

  /** ---------------- Load Custom Saved Layouts ---------------- */
  const loadCustomLayouts = async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    const layouts: LayoutInfo[] = [];
    const layoutsById = new Map<string, LayoutInfo>();
    const layoutsByTemplateID = new Map<string, Set<string>>();
    const templateSettings = new Map<string, TemplateSetting>();
    const fileMap = new Map<string, { fileName: string; templateID: string }>();
    const templateLayoutsCache = new Map<string, LayoutInfo[]>();
    const fullDataByTemplateID = new Map<string, FullDataInfo[]>();

    try {
      const res = await fetch(`/api/v1/ppt/template-management/summary`, {
        headers: {
          ...getHeader(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      const customTemplates = data.presentations || [];

      const fontMap = new Map<string, string[]>();

      for (const item of customTemplates) {
        const pid =
          item.presentation_id || item.presentation || item.id || "";
        if (!pid) continue;

        const templateID = `custom-${pid}`;
        const templateName = item.template?.name || templateID;

        layoutsByTemplateID.set(templateID, new Set());
        fullDataByTemplateID.set(templateID, []);

        const templatesRes = await fetch(
          `/api/v1/ppt/template-management/get-templates/${pid}`,
          {
            headers: {
              ...getHeader(),
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        const layoutData = await templatesRes.json();
        const allLayout = layoutData.layouts || [];

        templateSettings.set(templateID, {
          description: "Custom presentation layouts",
          ordered: false,
          default: false,
        });

        const templateLayouts: LayoutInfo[] = [];
        const fullData: FullDataInfo[] = [];

        for (const l of allLayout) {
          try {
            const mod = compileCustomLayout(l.layout_code, React, z);

            const originalId =
              mod.layoutId || l.layout_name.toLowerCase().replace(/layout$/, "");
            const uniqueKey = `${templateID}:${originalId}`;
            const name =
              mod.layoutName || l.layout_name.replace(/([A-Z])/g, " $1").trim();
            const desc =
              mod.layoutDescription || `${name} layout for presentations`;

            let schemaJson: any = {};
            let sampleData: any = {};
            let component = () => <div />;

            if (!mod.default) {
              component = () => (
                <div className="p-4 bg-red-100 text-red-700 border">
                  Missing default export in {l.layout_name}
                </div>
              );
            } else if (!mod.Schema) {
              component = () => (
                <div className="p-4 bg-red-100 text-red-700 border">
                  Missing Schema export in {l.layout_name}
                </div>
              );
            } else {
              component = mod.default;
              try {
                schemaJson = z.toJSONSchema(mod.Schema, {
                  override: (ctx) => delete ctx.jsonSchema.default,
                });
                sampleData = mod.Schema.parse({});
              } catch (err) {
                component = () => (
                  <div className="p-4 bg-red-100 text-red-700 border">
                    Schema parsing failed
                  </div>
                );
              }
            }

            fontMap.set(pid, l.fonts);

            const layout: LayoutInfo = {
              id: uniqueKey,
              name,
              description: desc,
              json_schema: schemaJson,
              templateID,
              templateName,
            };

            const full: FullDataInfo = {
              name,
              component,
              schema: schemaJson,
              sampleData,
              fileName: l.layout_name,
              templateID,
              layoutId: uniqueKey,
            };

            layoutsById.set(uniqueKey, layout);
            layoutsByTemplateID.get(templateID)!.add(uniqueKey);
            fileMap.set(uniqueKey, { fileName: l.layout_name, templateID });
            templateLayouts.push(layout);
            fullData.push(full);
            layouts.push(layout);
          } catch {}
        }

        setCustomTemplateFonts(fontMap);
        fullDataByTemplateID.set(templateID, fullData);
        templateLayoutsCache.set(templateID, templateLayouts);
      }
    } catch (err) {
      console.error("Custom layout load error:", err);
    }

    return {
      layoutsById,
      layoutsByTemplateID,
      templateSettings,
      fileMap,
      templateLayoutsCache,
      layoutSchema: layouts,
      fullDataByTemplateID,
    };
  };

  /** ---------------- Getter: Load by ID with Lazy Fallback ---------------- */
  const getLayout = (layoutId: string): React.ComponentType<{ data: any }> | null => {
    if (!layoutData) return null;

    let fileInfo: { fileName: string; templateID: string } | undefined;

    for (const [key, info] of layoutData.fileMap.entries()) {
      if (key === layoutId) {
        fileInfo = info;
        break;
      }
    }
    if (!fileInfo) return null;

    const cacheKey = createCacheKey(fileInfo.templateID, fileInfo.fileName);
    if (layoutCache.has(cacheKey)) return layoutCache.get(cacheKey)!;

    const file = fileInfo.fileName.replace(".tsx", "").replace(".ts", "");

    // ✅ pure React lazy import instead of next/dynamic
    const Layout = lazy(
      () =>
        import(
          `@/presentation-templates/${fileInfo.templateID}/${file}`
        )
    );

    layoutCache.set(cacheKey, Layout);
    return Layout;
  };

  /** ---------------- Accessor Methods ---------------- */
  const getLayoutById = (layoutId: string): LayoutInfo | null =>
    layoutData?.layoutsById.get(layoutId) || null;

  const getLayoutsByTemplateID = (templateID: string) =>
    layoutData?.templateLayouts.get(templateID) || [];

  const getTemplateSetting = (templateID: string) =>
    layoutData?.templateSettings.get(templateID) || null;

  const getAllTemplateIDs = () =>
    layoutData ? Array.from(layoutData.templateSettings.keys()) : [];

  const getAllLayouts = () => layoutData?.layoutSchema || [];

  const getFullDataByTemplateID = (templateID: string) =>
    layoutData?.fullDataByTemplateID.get(templateID) || [];

  const getCustomTemplateFonts = (pid: string): string[] | null =>
    customTemplateFonts.get(pid) || null;

  useEffect(() => {
    loadLayouts();
  }, []);

  const contextValue: LayoutContextType = {
    getLayoutById,
    getLayoutsByTemplateID,
    getTemplateSetting,
    getAllTemplateIDs,
    getAllLayouts,
    getFullDataByTemplateID,
    getCustomTemplateFonts,
    loading,
    error,
    getLayout,
    isPreloading,
    cacheSize: layoutCache.size,
    refetch: loadLayouts,
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      <Suspense fallback={<div className="p-4">Loading layout...</div>}>
        {children}
      </Suspense>
    </LayoutContext.Provider>
  );
};

export const useLayout = (): LayoutContextType => {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used inside LayoutProvider");
  return ctx;
};
