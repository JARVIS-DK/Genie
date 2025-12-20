import React, {
  useRef,
  useEffect,
  useState,
  ReactNode,
} from "react";
import ReactDOM from "react-dom/client";
import TiptapText from "./TiptapText";

interface TiptapTextReplacerProps {
  children: ReactNode;
  slideData?: any;
  slideIndex?: number;
  onContentChange?: (content: string, path: string, slideIndex?: number) => void;
}

const TiptapTextReplacer: React.FC<TiptapTextReplacerProps> = ({
  children,
  slideData,
  slideIndex,
  onContentChange = () => {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [processedElements, setProcessedElements] = useState(
    new Set<HTMLElement>()
  );

  const rootsRef = useRef<
    Map<
      HTMLElement,
      { root: any; dataPath: string; fallbackText: string }
    >
  >(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const replaceTextElements = () => {
      const allElements = container.querySelectorAll("*");

      allElements.forEach((element) => {
        const htmlElement = element as HTMLElement;

        if (
          processedElements.has(htmlElement) ||
          htmlElement.classList.contains("tiptap-text-editor") ||
          htmlElement.closest(".tiptap-text-editor")
        ) {
          return;
        }

        if (isInIgnoredElementTree(htmlElement)) return;

        const directTextContent = getDirectTextContent(htmlElement);
        const trimmedText = directTextContent.trim();
        if (!trimmedText || trimmedText.length <= 2) return;

        if (hasTextChildren(htmlElement)) return;
        if (shouldSkipElement(htmlElement)) return;

        const allClasses = Array.from(htmlElement.classList);
        const allStyles = htmlElement.getAttribute("style");

        const dataPath = findDataPath(slideData, trimmedText);

        const tiptapContainer = document.createElement("div");
        tiptapContainer.style.cssText = allStyles || "";
        tiptapContainer.className = allClasses.join(" ");

        if (htmlElement.parentNode) {
          htmlElement.parentNode.replaceChild(tiptapContainer, htmlElement);
          htmlElement.innerHTML = "";
        }

        setProcessedElements((prev) => new Set(prev).add(htmlElement));

        const root = ReactDOM.createRoot(tiptapContainer);

        const initialContent = dataPath.path
          ? getValueByPath(slideData, dataPath.path) ?? trimmedText
          : trimmedText;

        rootsRef.current.set(tiptapContainer, {
          root,
          dataPath: dataPath.path,
          fallbackText: trimmedText,
        });

        root.render(
          <TiptapText
            content={initialContent}
            onContentChange={(content) => {
              onContentChange(content, dataPath.path, slideIndex);
            }}
            placeholder="Enter text..."
          />
        );
      });
    };

    const timer = setTimeout(replaceTextElements, 1000);
    return () => clearTimeout(timer);
  }, [slideData, slideIndex]);

  // Update editors when slide data updates
  useEffect(() => {
    rootsRef.current.forEach(
      ({ root, dataPath, fallbackText }) => {
        const newContent =
          dataPath && slideData
            ? getValueByPath(slideData, dataPath) ?? fallbackText
            : fallbackText;

        root.render(
          <TiptapText
            content={newContent}
            onContentChange={(content) => {
              onContentChange(content, dataPath, slideIndex);
            }}
            placeholder="Enter text..."
          />
        );
      }
    );
  }, [slideData, slideIndex]);

  // ---------- Helper Functions ----------

  const isInIgnoredElementTree = (element: HTMLElement): boolean => {
    const ignoredTags = [
      "TABLE", "TBODY", "THEAD", "TFOOT", "TR", "TD", "TH",
      "SVG", "G", "PATH", "CIRCLE", "RECT", "LINE",
      "CANVAS", "VIDEO", "AUDIO",
      "IFRAME", "EMBED", "OBJECT",
      "SELECT", "OPTION", "OPTGROUP",
      "SCRIPT", "STYLE", "NOSCRIPT",
    ];

    const ignoredClassPatterns = [
      "chart", "graph", "visualization",
      "menu", "dropdown", "tooltip",
      "editor", "wysiwyg",
      "calendar", "datepicker",
      "slider", "carousel",
      "flowchart", "mermaid", "diagram",
    ];

    let curr: HTMLElement | null = element;
    while (curr) {
      if (ignoredTags.includes(curr.tagName)) return true;

      const name = curr.className?.toLowerCase() || "";
      if (ignoredClassPatterns.some((p) => name.includes(p))) return true;
      if (curr.id.includes("mermaid")) return true;
      if (
        curr.hasAttribute("contenteditable") ||
        curr.hasAttribute("data-chart") ||
        curr.hasAttribute("data-visualization") ||
        curr.hasAttribute("data-interactive")
      )
        return true;

      curr = curr.parentElement;
    }
    return false;
  };

  const getValueByPath = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;
    const tokens = path
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".")
      .filter(Boolean);
    let current: any = obj;
    for (const t of tokens) {
      if (current == null) return undefined;
      current = current[t];
    }
    return current;
  };

  const getDirectTextContent = (el: HTMLElement): string =>
    Array.from(el.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent || "")
      .join("");

  const hasTextChildren = (el: HTMLElement): boolean =>
    Array.from(el.children).some(
      (child) => getDirectTextContent(child).trim().length > 1
    );

  const shouldSkipElement = (el: HTMLElement): boolean => {
    if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(el.tagName))
      return true;
    if (
      el.hasAttribute("role") ||
      el.hasAttribute("aria-label") ||
      el.hasAttribute("data-testid")
    )
      return true;
    if (el.querySelector("img, svg, button, input, textarea, select, a[href]"))
      return true;

    const containerClasses = ["grid", "flex", "space-", "gap-", "container", "wrapper"];
    if (
      containerClasses.some((cls) =>
        el.className?.includes(cls)
      )
    )
      return true;

    const txt = getDirectTextContent(el).trim();
    if (txt.length < 3) return true;

    return false;
  };

  const findDataPath = (
    data: any,
    targetText: string,
    path = ""
  ): { path: string; originalText: string } => {
    if (!data || typeof data !== "object")
      return { path: "", originalText: "" };

    for (const [key, value] of Object.entries(data)) {
      const curr = path ? `${path}.${key}` : key;

      if (typeof value === "string" && value.trim() === targetText.trim()) {
        return { path: curr, originalText: value };
      }

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const r = findDataPath(value[i], targetText, `${curr}[${i}]`);
          if (r.path) return r;
        }
      } else if (typeof value === "object") {
        const r = findDataPath(value, targetText, curr);
        if (r.path) return r;
      }
    }
    return { path: "", originalText: "" };
  };

  return (
    <div ref={containerRef} className="tiptap-text-replacer">
      {children}
    </div>
  );
};

export default TiptapTextReplacer;
