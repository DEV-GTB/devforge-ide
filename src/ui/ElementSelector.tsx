// Element Selector - Click to select and edit elements in preview
import React, { useState, useRef, useEffect } from 'react';
import { X, Edit, Code, Trash2 } from 'lucide-react';

export interface SelectedElement {
  tag: string;
  id?: string;
  className?: string;
  text?: string;
  styles: Record<string, string>;
  xpath: string;
}

interface ElementSelectorProps {
  onElementSelected: (element: SelectedElement) => void;
  onEditElement: (element: SelectedElement) => void;
  isActive: boolean;
  onDeactivate: () => void;
}

export function ElementSelector({
  onElementSelected,
  onEditElement,
  isActive,
  onDeactivate,
}: ElementSelectorProps) {
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) {
      // Clean up when deactivated
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.remove();
      }
      return;
    }

    // Create overlay for element selection
    const overlay = document.createElement('div');
    overlay.id = 'devforge-element-selector-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999999;
      pointer-events: none;
      cursor: crosshair;
    `;
    document.body.appendChild(overlay);
    overlayRef.current = overlay;

    const highlightBox = document.createElement('div');
    highlightBox.id = 'devforge-highlight-box';
    highlightBox.style.cssText = `
      position: absolute;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      pointer-events: none;
      display: none;
      transition: all 0.1s ease;
    `;
    document.body.appendChild(highlightBox);

    const handleMouseMove = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target || target === overlay || target === highlightBox) {
        highlightBox.style.display = 'none';
        setHoveredElement(null);
        return;
      }

      const element = target as HTMLElement;
      const rect = element.getBoundingClientRect();

      highlightBox.style.left = `${rect.left}px`;
      highlightBox.style.top = `${rect.top}px`;
      highlightBox.style.width = `${rect.width}px`;
      highlightBox.style.height = `${rect.height}px`;
      highlightBox.style.display = 'block';

      setHoveredElement(element);
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target || target === overlay || target === highlightBox) return;

      const element = target as HTMLElement;
      const elementData = extractElementData(element);

      setSelectedElement(elementData);
      onElementSelected(elementData);

      // Keep highlight on selected element
      const rect = element.getBoundingClientRect();
      highlightBox.style.borderColor = '#10b981';
      highlightBox.style.background = 'rgba(16, 185, 129, 0.1)';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDeactivate();
      }
      if (e.key === 'Enter' && selectedElement) {
        onEditElement(selectedElement);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
      overlay.remove();
      highlightBox.remove();
    };
  }, [isActive, onElementSelected, onEditElement, onDeactivate]);

  if (!isActive) return null;

  return (
    <div className="fixed top-4 right-4 z-[1000000] bg-gray-900 text-white rounded-lg shadow-2xl p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Element Selector</h3>
        <button
          onClick={onDeactivate}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <X size={16} />
        </button>
      </div>

      <div className="text-xs text-gray-400 mb-3">
        Click on any element to select it. Press <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> to edit, <kbd className="bg-gray-700 px-1 rounded">Esc</kbd> to cancel.
      </div>

      {selectedElement && (
        <div className="bg-gray-800 rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 font-mono text-sm">{selectedElement.tag}</span>
            <div className="flex gap-1">
              <button
                onClick={() => onEditElement(selectedElement)}
                className="p-1 hover:bg-gray-700 rounded"
                title="Edit element"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => {
                  if (selectedElement.id) {
                    const el = document.getElementById(selectedElement.id);
                    if (el) {
                      console.log('Element:', el);
                    }
                  }
                }}
                className="p-1 hover:bg-gray-700 rounded"
                title="View code"
              >
                <Code size={14} />
              </button>
            </div>
          </div>

          {selectedElement.id && (
            <div className="text-xs">
              <span className="text-gray-400">ID:</span> {selectedElement.id}
            </div>
          )}

          {selectedElement.className && (
            <div className="text-xs">
              <span className="text-gray-400">Class:</span> {selectedElement.className}
            </div>
          )}

          {selectedElement.text && (
            <div className="text-xs truncate">
              <span className="text-gray-400">Text:</span> {selectedElement.text}
            </div>
          )}

          <div className="text-xs text-gray-500 font-mono">
            {selectedElement.xpath}
          </div>
        </div>
      )}

      {hoveredElement && !selectedElement && (
        <div className="mt-2 text-xs text-gray-400">
          Hovering: <span className="text-blue-400">{hoveredElement.tagName.toLowerCase()}</span>
        </div>
      )}
    </div>
  );
}

function extractElementData(element: HTMLElement): SelectedElement {
  const computedStyles = window.getComputedStyle(element);
  const styles: Record<string, string> = {};

  // Extract important styles
  const styleProperties = [
    'color',
    'backgroundColor',
    'fontSize',
    'fontWeight',
    'padding',
    'margin',
    'border',
    'borderRadius',
    'display',
    'flexDirection',
    'alignItems',
    'justifyContent',
  ];

  styleProperties.forEach(prop => {
    styles[prop] = computedStyles.getPropertyValue(prop);
  });

  // Generate XPath
  const xpath = generateXPath(element);

  return {
    tag: element.tagName.toLowerCase(),
    id: element.id || undefined,
    className: element.className || undefined,
    text: element.textContent?.slice(0, 50) || undefined,
    styles,
    xpath,
  };
}

function generateXPath(element: HTMLElement): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as HTMLElement).tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.tagName.toLowerCase();
    const part = index > 1 ? `${tagName}[${index}]` : tagName;
    parts.unshift(part);

    current = current.parentElement;
  }

  return parts.length ? `/${parts.join('/')}` : '';
}
