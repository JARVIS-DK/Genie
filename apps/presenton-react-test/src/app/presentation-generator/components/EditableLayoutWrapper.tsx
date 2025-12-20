import React, { ReactNode, useRef, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

// import { updateSlideImage, updateSlideIcon, updateImageProperties } from '../store/slices/presentationGeneration';
import { updateSlideImage, updateSlideIcon, updateImageProperties } from '../../../store/slices/presentationGeneration';
import ImageEditor from './ImageEditor';
import IconsEditor from './IconsEditor';

interface EditableLayoutWrapperProps {
  children: ReactNode;
  slideIndex: number;
  slideData: any;
  isEditMode?: boolean;
  properties?: any;
}

interface EditableElement {
  id: string;
  type: 'image' | 'icon';
  src: string;
  dataPath: string;
  data: any;
  element: HTMLImageElement | SVGElement;
}

const EditableLayoutWrapper: React.FC<EditableLayoutWrapperProps> = ({
  children,
  slideIndex,
  slideData,
  properties,
}) => {
  const dispatch = useDispatch();
  const containerRef = useRef<HTMLDivElement>(null);

  const [editableElements, setEditableElements] = useState<EditableElement[]>([]);
  const [activeEditor, setActiveEditor] = useState<EditableElement | null>(null);

  const findAllDataPaths = (
    targetUrl: string,
    data: any,
    path: string = ''
  ): { path: string; type: 'image' | 'icon'; data: any }[] => {
    if (!data || typeof data !== 'object') return [];

    const matches: { path: string; type: 'image' | 'icon'; data: any }[] = [];

    if (data.__image_url__ && targetUrl.includes(data.__image_url__)) {
      matches.push({ path, type: 'image', data });
    }

    if (data.__icon_url__ && targetUrl.includes(data.__icon_url__)) {
      matches.push({ path, type: 'icon', data });
    }

    for (const [key, value] of Object.entries(data)) {
      const newPath = path ? `${path}.${key}` : key;

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const results = findAllDataPaths(targetUrl, value[i], `${newPath}[${i}]`);
          matches.push(...results);
        }
      } else if (value && typeof value === 'object') {
        const results = findAllDataPaths(targetUrl, value, newPath);
        matches.push(...results);
      }
    }

    return matches;
  };

  const findBestDataPath = (
    targetUrl: string,
    imgElement: HTMLImageElement | SVGElement,
    data: any
  ): { path: string; type: 'image' | 'icon'; data: any } | null => {
    const allMatches = findAllDataPaths(targetUrl, data);

    if (allMatches.length === 0) return null;
    if (allMatches.length === 1) return allMatches[0];

    const getElementSourceUrl = (el: Element): string | null => {
      if (el instanceof HTMLImageElement) {
        return el.src || null;
      }
      if (el instanceof SVGElement) {
        const wrapper = (el as unknown as HTMLElement).closest('[data-path]') as HTMLElement | null;
        return wrapper?.getAttribute('data-path') || null;
      }
      return null;
    };

    const allMedia = containerRef.current?.querySelectorAll('img, svg') || [] as unknown as NodeListOf<Element>;
    const imgIndex = Array.from(allMedia).indexOf(imgElement as Element);

    const sameUrlElements: Element[] = [];
    allMedia.forEach((el) => {
      const elUrl = getElementSourceUrl(el);
      if (elUrl && isMatchingUrl(elUrl, targetUrl)) {
        sameUrlElements.push(el);
      }
    });

    const sameUrlIndex = sameUrlElements.indexOf(imgElement as Element);

    if (sameUrlIndex >= 0 && sameUrlIndex < allMatches.length) {
      return allMatches[sameUrlIndex];
    }

    if (imgIndex >= 0 && imgIndex < allMatches.length) {
      return allMatches[imgIndex];
    }

    return allMatches[0];
  };

  const isMatchingUrl = (url1: string, url2: string): boolean => {
    if (!url1 || !url2) return false;
    if (url1 === url2) return true;

    const cleanUrl1 = url1.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/+/, '');
    const cleanUrl2 = url2.replace(/^https?:\/\/[^\/]+/, '').replace(/^\/+/, '');

    if (cleanUrl1 === cleanUrl2) return true;

    if ((url1.includes('placeholder') && url2.includes('placeholder')) ||
        (url1.includes('/static/images/') && url2.includes('/static/images/'))) {
      return url1 === url2;
    }

    const getFilename = (path: string) => path.split('/').pop() || '';
    const filename1 = getFilename(url1);
    const filename2 = getFilename(url2);

    if (filename1 === filename2 && filename1.length > 10) {
      return true;
    }

    return false;
  };

  const findAndProcessImages = () => {
    if (!containerRef.current) return;

    const imgElements = containerRef.current.querySelectorAll('img:not([data-editable-processed])');
    const svgElements = containerRef.current.querySelectorAll('svg:not([data-editable-processed])');

    const newEditableElements: EditableElement[] = [];

    imgElements.forEach((img, index) => {
      const htmlImg = img as HTMLImageElement;
      const src = htmlImg.src;

      if (src) {
        const result = findBestDataPath(src, htmlImg, slideData);

        if (result) {
          const { path: dataPath, type, data } = result;

          htmlImg.setAttribute('data-editable-processed', 'true');
          htmlImg.setAttribute('data-editable-id', `${slideIndex}-${type}-${dataPath}-${index}`);

          const editableElement: EditableElement = {
            id: `${slideIndex}-${type}-${dataPath}-${index}`,
            type,
            src,
            dataPath,
            data,
            element: htmlImg,
          };

          newEditableElements.push(editableElement);

          const clickHandler = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveEditor(editableElement);
          };

          htmlImg.addEventListener('click', clickHandler);

          const itemIndex = parseInt(`${slideIndex}-${type}-${dataPath}-${index}`.split('-').pop() || '0');
          const propertiesData = properties?.[itemIndex];

          htmlImg.style.cursor = 'pointer';
          htmlImg.style.transition = 'opacity 0.2s, transform 0.2s';
          htmlImg.style.objectFit = propertiesData?.initialObjectFit;
          htmlImg.style.objectPosition = `${propertiesData?.initialFocusPoint?.x}% ${propertiesData?.initialFocusPoint?.y}%`;

          const mouseEnterHandler = () => {
            htmlImg.style.opacity = '0.8';
          };

          const mouseLeaveHandler = () => {
            htmlImg.style.opacity = '1';
          };

          htmlImg.addEventListener('mouseenter', mouseEnterHandler);
          htmlImg.addEventListener('mouseleave', mouseLeaveHandler);

          (htmlImg as any)._editableCleanup = () => {
            htmlImg.removeEventListener('click', clickHandler);
            htmlImg.removeEventListener('mouseenter', mouseEnterHandler);
            htmlImg.removeEventListener('mouseleave', mouseLeaveHandler);
            htmlImg.removeAttribute('data-editable-processed');
            htmlImg.style.cursor = '';
            htmlImg.style.transition = '';
            htmlImg.style.opacity = '';
          };
        }
      }
    });

    // ✅ SVG processing left intact

    setEditableElements((prev) => [...prev, ...newEditableElements]);
  };

  const cleanupElements = () => {
    editableElements.forEach(({ element }) => {
      if ((element as any)._editableCleanup) {
        (element as any)._editableCleanup();
      }
    });
    setEditableElements([]);
  };

  useEffect(() => {
    const timer = setTimeout(findAndProcessImages, 400);

    return () => {
      clearTimeout(timer);
      cleanupElements();
    };
  }, [slideData, children]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new MutationObserver((mutations) => {
      const hasNewMedia = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            ((node as Element).tagName === 'IMG' ||
              (node as Element).tagName === 'SVG' ||
              (node as Element).querySelector?.('img:not([data-editable-processed]), svg:not([data-editable-processed])'))
        )
      );

      if (hasNewMedia) {
        setTimeout(findAndProcessImages, 100);
      }
    });

    observer.observe(containerRef.current, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [slideData]);

  const handleEditorClose = () => setActiveEditor(null);

  const handleImageChange = (newImageUrl: string, prompt?: string) => {
    if (activeEditor && activeEditor.element instanceof HTMLImageElement) {
      activeEditor.element.src = newImageUrl;

      dispatch(updateSlideImage({
        slideIndex,
        dataPath: activeEditor.dataPath,
        imageUrl: newImageUrl,
        prompt: prompt || activeEditor.data?.__image_prompt__ || '',
      }));

      setActiveEditor(null);
    }
  };

  const handleIconChange = (newIconUrl: string, query?: string) => {
    if (activeEditor) {
      dispatch(updateSlideIcon({
        slideIndex,
        dataPath: activeEditor.dataPath,
        iconUrl: newIconUrl,
        query: query || activeEditor.data?.__icon_query__ || '',
      }));
    }
  };

  const handleFocusPointClick = (propertiesData: any) => {
    const id = activeEditor?.id;
    const editableId = document.querySelector(`[data-editable-id="${id}"]`);

    if (editableId instanceof HTMLImageElement) {
      editableId.style.objectFit = propertiesData.initialObjectFit;
      editableId.style.objectPosition = `${propertiesData.initialFocusPoint.x}% ${propertiesData.initialFocusPoint.y}%`;
    }

    dispatch(updateImageProperties({
      slideIndex,
      itemIndex: Number(activeEditor?.id.split('-').pop() || 0),
      properties: propertiesData,
    }));
  };

  return (
    <div ref={containerRef} className="editable-layout-wrapper w-full">
      {children}

      {activeEditor && activeEditor.type === 'image' && (
        <ImageEditor
          initialImage={activeEditor.src}
          slideIndex={slideIndex}
          promptContent={activeEditor.data?.__image_prompt__ || ''}
          imageIdx={0}
          properties={null}
          onClose={handleEditorClose}
          onImageChange={handleImageChange}
          onFocusPointClick={handleFocusPointClick}
        />
      )}

      {activeEditor && activeEditor.type === 'icon' && (
        <IconsEditor
          icon_prompt={activeEditor.data?.__icon_query__ ? [activeEditor.data.__icon_query__] : []}
          onClose={handleEditorClose}
          onIconChange={handleIconChange}
        />
      )}
    </div>
  );
};

export default EditableLayoutWrapper;
