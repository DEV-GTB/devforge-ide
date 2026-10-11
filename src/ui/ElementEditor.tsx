// Element Editor - Edit selected elements with AI assistance
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Save, Undo, Loader2 } from 'lucide-react';
import { SelectedElement } from './ElementSelector';

// NOTE: The editor calls the hosted /api/chat endpoint for AI help.
// No credentials or model details are ever handled in the browser.

interface ElementEditorProps {
  element: SelectedElement;
  onClose: () => void;
  onSave: (changes: ElementChanges) => void;
}

interface ElementChanges {
  styles: Record<string, string>;
  content?: string;
  className?: string;
}

export function ElementEditor({ element, onClose, onSave }: ElementEditorProps) {
  const [changes, setChanges] = useState<ElementChanges>({ styles: { ...element.styles } });
  const [originalChanges, setOriginalChanges] = useState<ElementChanges>({ styles: { ...element.styles } });
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [previewStyles, setPreviewStyles] = useState<Record<string, string>>({ ...element.styles });

  useEffect(() => {
    // Apply preview styles to the element
    const el = document.querySelector(element.xpath) as HTMLElement;
    if (el) {
      Object.entries(previewStyles).forEach(([prop, value]) => {
        el.style[prop as any] = value;
      });
    }

    return () => {
      // Revert styles on unmount
      const el = document.querySelector(element.xpath) as HTMLElement;
      if (el) {
        Object.entries(element.styles).forEach(([prop, value]) => {
          el.style[prop as any] = value;
        });
      }
    };
  }, [element.xpath, previewStyles, element.styles]);

  const handleStyleChange = (property: string, value: string) => {
    const newStyles = { ...changes.styles, [property]: value };
    setChanges({ ...changes, styles: newStyles });
    setPreviewStyles(newStyles);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsAiProcessing(true);
    setAiResponse('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `You are a UI design assistant. Provide CSS changes ONLY as a single JSON object mapping property names to values (no prose, no markdown).

Target element: <${element.tag}>
Current styles: ${JSON.stringify(element.styles, null, 2)}
User request: ${aiPrompt}

Example JSON output: {"color":"#ff0000","fontSize":"16px"}`,
          chatHistory: [],
          mode: 'element',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.text) {
        throw new Error(data?.error || `AI assist failed (${response.status})`);
      }

      const assistantText: string = data.text || '';
      setAiResponse(assistantText);

      // Try to parse JSON response
      try {
        const jsonMatch = assistantText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const newStyles = JSON.parse(jsonMatch[0]);
          const mergedStyles = { ...changes.styles, ...newStyles };
          setChanges({ ...changes, styles: mergedStyles });
          setPreviewStyles(mergedStyles);
        }
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    } catch (error) {
      setAiResponse(`Error: ${error instanceof Error ? error.message : 'Failed to generate styles'}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSave = () => {
    onSave(changes);
    onClose();
  };

  const handleUndo = () => {
    setChanges({ ...originalChanges });
    setPreviewStyles({ ...originalChanges.styles });
  };

  const commonStyleProperties = [
    { label: 'Color', prop: 'color', type: 'color' },
    { label: 'Background', prop: 'backgroundColor', type: 'color' },
    { label: 'Font Size', prop: 'fontSize', type: 'text' },
    { label: 'Font Weight', prop: 'fontWeight', type: 'select', options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
    { label: 'Padding', prop: 'padding', type: 'text' },
    { label: 'Margin', prop: 'margin', type: 'text' },
    { label: 'Border Radius', prop: 'borderRadius', type: 'text' },
    { label: 'Border', prop: 'border', type: 'text' },
    { label: 'Display', prop: 'display', type: 'select', options: ['block', 'inline', 'flex', 'grid', 'none'] },
    { label: 'Align Items', prop: 'alignItems', type: 'select', options: ['flex-start', 'center', 'flex-end', 'stretch'] },
    { label: 'Justify Content', prop: 'justifyContent', type: 'select', options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'] },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000000]">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl w-[600px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h3 className="font-semibold">Edit Element</h3>
            <p className="text-xs text-gray-400">{element.tag}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 px-4 py-2 text-sm ${activeTab === 'manual' ? 'bg-gray-800 border-b-2 border-blue-500' : 'hover:bg-gray-800'}`}
          >
            Manual Edit
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 px-4 py-2 text-sm flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'bg-gray-800 border-b-2 border-blue-500' : 'hover:bg-gray-800'}`}
          >
            <Sparkles size={14} />
            AI Assistant
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {activeTab === 'manual' ? (
            <div className="space-y-3">
              {commonStyleProperties.map(({ label, prop, type, options }) => (
                <div key={prop} className="flex items-center gap-3">
                  <label className="w-32 text-sm text-gray-400">{label}</label>
                  {type === 'color' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="color"
                        value={changes.styles[prop] || '#000000'}
                        onChange={(e) => handleStyleChange(prop, e.target.value)}
                        className="w-10 h-8 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={changes.styles[prop] || ''}
                        onChange={(e) => handleStyleChange(prop, e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  ) : type === 'select' ? (
                    <select
                      value={changes.styles[prop] || ''}
                      onChange={(e) => handleStyleChange(prop, e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                    >
                      {options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={changes.styles[prop] || ''}
                      onChange={(e) => handleStyleChange(prop, e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Describe the changes you want:
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Make it red with larger text and rounded corners"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm h-24 resize-none"
                />
              </div>

              <button
                onClick={handleAiGenerate}
                disabled={isAiProcessing || !aiPrompt.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-4 py-2 rounded text-sm flex items-center justify-center gap-2"
              >
                {isAiProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Changes
                  </>
                )}
              </button>

              {aiResponse && (
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-xs text-gray-400 mb-1">AI Response:</div>
                  <pre className="text-xs text-green-400 whitespace-pre-wrap">{aiResponse}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <button
            onClick={handleUndo}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white"
          >
            <Undo size={16} />
            Undo
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm flex items-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
