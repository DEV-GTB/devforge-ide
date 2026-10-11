import { FileNode, flattenFiles } from './filesystem';
import { outputService } from './output';
import { debugService } from './debug';

export type DevicePreset = 'responsive' | 'desktop' | 'laptop' | 'tablet' | 'mobile' | 'custom';

export interface DeviceDimension {
  width: string;
  height: string;
  label: string;
  isCustom?: boolean;
}

export const DEVICE_DIMENSIONS: Record<DevicePreset, DeviceDimension> = {
  responsive: { width: '100%', height: '100%', label: 'Responsive' },
  desktop: { width: '1440px', height: '900px', label: 'Desktop (1440×900)' },
  laptop: { width: '1024px', height: '640px', label: 'Laptop (1024×640)' },
  tablet: { width: '768px', height: '1024px', label: 'Tablet (768×1024)' },
  mobile: { width: '390px', height: '844px', label: 'Mobile (390×844)' },
  custom: { width: '800px', height: '600px', label: 'Custom', isCustom: true }
};

export type PreviewStatus = 'stopped' | 'starting' | 'running' | 'reloading' | 'error' | 'unavailable';

export type ProjectKind = 'static' | 'vite' | 'react' | 'typescript' | 'node' | 'unknown';

export interface ProjectDetectionResult {
  kind: ProjectKind;
  name: string;
  description: string;
  entryPoint: string | null;
  canRunInBrowserSandbox: boolean;
  recommendedCommand: string;
  hasHtml: boolean;
  hasPackageJson: boolean;
  detectedFiles: string[];
}

export interface PreviewError {
  id: string;
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: string;
}

export interface InspectedElement {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  styles: Record<string, string>;
  sourceHint?: string;
  boundingRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PreviewConsoleMsg {
  id: string;
  level: 'log' | 'warn' | 'error' | 'info';
  text: string;
  timestamp: string;
}

export interface PreviewBundle {
  javascript: string;
  stylesheet?: string;
  error?: string;
}

/**
 * Detect project type from workspace files
 */
export function detectProject(files: FileNode[]): ProjectDetectionResult {
  const flat = flattenFiles(files);
  const fileNames = flat.map((f) => f.name.toLowerCase());
  const filePaths = flat.map((f) => f.path.toLowerCase());

  const hasPackageJson = fileNames.includes('package.json');
  const hasViteConfig = fileNames.some((n) => n.startsWith('vite.config.'));
  const hasTsConfig = fileNames.includes('tsconfig.json');
  const hasIndexHtml = fileNames.includes('index.html');
  const hasHtml = flat.some((f) => f.name.endsWith('.html'));

  // Look into package.json content if available
  let packageJsonObj: any = null;
  const pkgNode = flat.find((f) => f.name === 'package.json');
  if (pkgNode && pkgNode.content) {
    try {
      packageJsonObj = JSON.parse(pkgNode.content);
    } catch {}
  }

  const allDeps = {
    ...(packageJsonObj?.dependencies || {}),
    ...(packageJsonObj?.devDependencies || {})
  };

  const hasReact = Boolean(allDeps['react'] || filePaths.some((p) => p.endsWith('.tsx') || p.endsWith('.jsx')));
  const hasVite = Boolean(hasViteConfig || allDeps['vite']);

  // Case 1: Vite Project
  if (hasVite) {
    const entry = flat.find((f) => f.name === 'index.html' || f.name === 'main.tsx' || f.name === 'App.tsx');
    return {
      kind: 'vite',
      name: hasReact ? 'Vite + React App' : 'Vite Web Project',
      description: 'Modern frontend project configured with Vite bundler',
      entryPoint: entry?.path || 'index.html',
      canRunInBrowserSandbox: hasIndexHtml,
      recommendedCommand: 'npm run dev',
      hasHtml: hasHtml || hasIndexHtml,
      hasPackageJson,
      detectedFiles: flat.filter((f) => f.name === 'package.json' || f.name.startsWith('vite.config.') || f.name === 'index.html').map((f) => f.path)
    };
  }

  // Case 2: React Project
  if (hasReact) {
    const entry = flat.find((f) => f.name === 'App.tsx' || f.name === 'index.tsx' || f.name === 'main.tsx');
    return {
      kind: 'react',
      name: 'React Application',
      description: 'Component-driven user interface with React',
      entryPoint: entry?.path || 'src/App.tsx',
      canRunInBrowserSandbox: hasIndexHtml,
      recommendedCommand: 'npm start',
      hasHtml,
      hasPackageJson,
      detectedFiles: flat.filter((f) => f.name === 'package.json' || f.name.endsWith('.tsx')).map((f) => f.path)
    };
  }

  // Case 3: TypeScript Frontend Project
  if (hasTsConfig) {
    const entry = flat.find((f) => f.name === 'index.html' || f.name === 'main.ts' || f.name === 'index.ts');
    return {
      kind: 'typescript',
      name: 'TypeScript Web Project',
      description: 'Typed web project with tsconfig.json compiler settings',
      entryPoint: entry?.path || 'index.html',
      canRunInBrowserSandbox: hasIndexHtml,
      recommendedCommand: 'npm run build',
      hasHtml,
      hasPackageJson,
      detectedFiles: flat.filter((f) => f.name === 'tsconfig.json' || f.name === 'index.html').map((f) => f.path)
    };
  }

  // Case 4: Static HTML/CSS/JS Project
  if (hasIndexHtml || hasHtml) {
    const entry = flat.find((f) => f.name === 'index.html') || flat.find((f) => f.name.endsWith('.html'));
    return {
      kind: 'static',
      name: 'Static HTML/CSS/JS',
      description: 'Classic static web application runnable directly in browser sandbox',
      entryPoint: entry?.path || 'index.html',
      canRunInBrowserSandbox: true,
      recommendedCommand: 'Static Browser Engine (No server needed)',
      hasHtml: true,
      hasPackageJson,
      detectedFiles: flat.filter((f) => f.name.endsWith('.html') || f.name.endsWith('.css') || f.name.endsWith('.js') || f.name.endsWith('.ts')).map((f) => f.path)
    };
  }

  // Case 5: Node.js Backend/Library
  if (hasPackageJson) {
    return {
      kind: 'node',
      name: 'Node.js Application',
      description: 'Backend or CLI project without an HTML document root',
      entryPoint: packageJsonObj?.main || 'index.js',
      canRunInBrowserSandbox: false,
      recommendedCommand: 'node index.js',
      hasHtml: false,
      hasPackageJson: true,
      detectedFiles: ['package.json']
    };
  }

  // Default: Unknown / Empty project
  return {
    kind: 'unknown',
    name: 'Generic Workspace',
    description: 'No standard web manifest or HTML entry point detected',
    entryPoint: flat[0]?.path || null,
    canRunInBrowserSandbox: false,
    recommendedCommand: '',
    hasHtml: false,
    hasPackageJson: false,
    detectedFiles: []
  };
}

/**
 * Generate sanitized isolated preview HTML for browser-sandbox preview
 */
export function generatePreviewHtml(files: FileNode[], bundle?: PreviewBundle): string {
  const flat = flattenFiles(files);
  const htmlFile = flat.find((f) => f.name === 'index.html') || flat.find((f) => f.name.endsWith('.html'));
  const cssFiles = flat.filter((f) => f.name.endsWith('.css'));
  const jsOrTsFiles = flat.filter(
    (f) => f.name.endsWith('.js') || f.name.endsWith('.ts')
  );

  if (!htmlFile) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>No HTML Entry Point</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 32px;
      max-width: 480px;
    }
    h2 { margin: 0 0 12px; color: #58a6ff; font-size: 18px; }
    p { font-size: 13px; line-height: 1.6; color: #8b949e; margin: 0 0 16px; }
    code { background: #21262d; padding: 2px 6px; border-radius: 4px; color: #79c0ff; font-family: monospace; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>No index.html Detected</h2>
    <p>DevForge Live Preview renders HTML documents directly. Create an <code>index.html</code> in the project root to preview your web application.</p>
  </div>
</body>
</html>`;
  }

  if (bundle?.error) {
    const escapedError = bundle.error.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character] || character));
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#111218;color:#e4e4e7;font:13px ui-monospace,monospace;padding:20px"><strong style="color:#f87171">Preview build failed</strong><pre style="white-space:pre-wrap;line-height:1.5">${escapedError}</pre></body></html>`;
  }

  let htmlContent = htmlFile.content || '';

  const workspaceCssPaths = new Set(cssFiles.map((file) => file.path.replace(/^\.\//, '').replace(/^\/+/, '')));
  htmlContent = htmlContent.replace(/<link\b[^>]*>/gi, (linkTag) => {
    const href = linkTag.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!href) return linkTag;
    const normalizedHref = decodeURIComponent(href).split(/[?#]/)[0].replace(/^\.\//, '').replace(/^\/+/, '');
    return workspaceCssPaths.has(normalizedHref) ? '' : linkTag;
  });

  // Combine CSS files
  let combinedCss = [
    ...cssFiles.map((c) => `/* ${c.path} */\n${c.content || ''}`),
    bundle?.stylesheet || ''
  ].filter(Boolean).join('\n\n');

  // Strip simple TypeScript type annotations from scripts for in-browser execution
  const processedJs = jsOrTsFiles
    .filter((f) => !f.name.endsWith('.d.ts'))
    .map((f) => {
      let code = f.content || '';
      // Remove typescript type definitions
      code = code
        .replace(/:\s*(string|number|boolean|void|any|Record<[^>]+>|Array<[^>]+>|[\w\[\]]+)/g, '')
        .replace(/export\s+default\s+/g, '')
        .replace(/export\s+/g, '')
        .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
      return `// --- ${f.path} ---\n${code}`;
    })
    .join('\n\n');

  // Safety & Inspection Script
  const isolationBridgeScript = `
<script>
(function() {
  // Capture console messages and route to parent DevForge Output / Console
  var origLog = console.log;
  var origWarn = console.warn;
  var origError = console.error;
  var origInfo = console.info;

  function safeStringify(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    try {
      return JSON.stringify(arg);
    } catch (e) {
      return String(arg);
    }
  }

  function forwardConsole(level, args) {
    try {
      var text = Array.prototype.slice.call(args).map(safeStringify).join(' ');
      window.parent.postMessage({
        type: 'DEVFORGE_PREVIEW_CONSOLE',
        level: level,
        text: text
      }, '*');
    } catch (err) {}
  }

  console.log = function() { forwardConsole('log', arguments); origLog.apply(console, arguments); };
  console.warn = function() { forwardConsole('warn', arguments); origWarn.apply(console, arguments); };
  console.error = function() { forwardConsole('error', arguments); origError.apply(console, arguments); };
  console.info = function() { forwardConsole('info', arguments); origInfo.apply(console, arguments); };

  // Runtime error capturing
  window.onerror = function(message, source, lineno, colno, error) {
    try {
      window.parent.postMessage({
        type: 'DEVFORGE_PREVIEW_ERROR',
        message: String(message),
        filename: source ? source.split('/').pop() : 'index.html',
        lineno: lineno || 1,
        colno: colno || 1,
        stack: error && error.stack ? error.stack : undefined
      }, '*');
    } catch (e) {}
    return false;
  };

  window.onunhandledrejection = function(event) {
    try {
      window.parent.postMessage({
        type: 'DEVFORGE_PREVIEW_ERROR',
        message: 'Unhandled Promise Rejection: ' + (event.reason ? event.reason.message || String(event.reason) : 'Unknown'),
        filename: 'index.html',
        lineno: 1,
        colno: 1
      }, '*');
    } catch (e) {}
  };

  // Element Inspector Bridge
  window.__devforgeInspectorActive = false;
  var hoveredEl = null;

  function captureViewportPng() {
    try {
      var doc = document.documentElement;
      var clone = doc.cloneNode(true);
      var scripts = clone.querySelectorAll('script');
      for (var s = 0; s < scripts.length; s++) scripts[s].parentNode.removeChild(scripts[s]);
      var xmlns = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(xmlns, 'svg');
      svg.setAttribute('xmlns', xmlns);
      svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      var w = Math.max(1, doc.scrollWidth);
      var h = Math.max(1, doc.scrollHeight);
      svg.setAttribute('width', String(w));
      svg.setAttribute('height', String(h));
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      var fo = document.createElementNS(xmlns, 'foreignObject');
      fo.setAttribute('width', '100%');
      fo.setAttribute('height', '100%');
      fo.appendChild(clone);
      svg.appendChild(fo);
      var svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
      var img = new Image();
      img.onload = function() {
        try {
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          window.parent.postMessage({
            type: 'DEVFORGE_PREVIEW_SCREENSHOT',
            dataUrl: canvas.toDataURL('image/png'),
            width: w,
            height: h
          }, '*');
        } catch (err) {
          window.parent.postMessage({ type: 'DEVFORGE_PREVIEW_SCREENSHOT_ERROR', message: String(err && err.message || err) }, '*');
        }
      };
      img.onerror = function() {
        window.parent.postMessage({ type: 'DEVFORGE_PREVIEW_SCREENSHOT_ERROR', message: 'Could not render the document for capture.' }, '*');
      };
      img.src = svgUrl;
    } catch (err) {
      window.parent.postMessage({ type: 'DEVFORGE_PREVIEW_SCREENSHOT_ERROR', message: String(err && err.message || err) }, '*');
    }
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'VISION_CAPTURE_REQUEST') {
      captureViewportPng();
    }
    if (e.data && e.data.type === 'TOGGLE_INSPECTOR') {
      window.__devforgeInspectorActive = Boolean(e.data.active);
      document.body.style.cursor = window.__devforgeInspectorActive ? 'crosshair' : 'default';
      if (!window.__devforgeInspectorActive && hoveredEl) {
        hoveredEl.style.outline = '';
        hoveredEl = null;
      }
    }
    if (e.data && e.data.type === 'PREVIEW_HISTORY') {
      if (e.data.direction === 'back') window.history.back();
      if (e.data.direction === 'forward') window.history.forward();
    }
  });

  document.addEventListener('mouseover', function(e) {
    if (!window.__devforgeInspectorActive) return;
    e.stopPropagation();
    if (hoveredEl && hoveredEl !== e.target) {
      hoveredEl.style.outline = '';
    }
    hoveredEl = e.target;
    hoveredEl.style.outline = '2px solid #3b82f6';
    hoveredEl.style.outlineOffset = '-1px';
  });

  document.addEventListener('mouseout', function(e) {
    if (!window.__devforgeInspectorActive) return;
    e.stopPropagation();
    if (e.target === hoveredEl) {
      e.target.style.outline = '';
      hoveredEl = null;
    }
  });

  document.addEventListener('click', function(e) {
    if (!window.__devforgeInspectorActive) return;
    e.preventDefault();
    e.stopPropagation();

    var target = e.target;
    var computed = window.getComputedStyle(target);
    var rect = target.getBoundingClientRect();
    var styles = {
      'width': computed.width,
      'height': computed.height,
      'padding': computed.padding,
      'margin': computed.margin,
      'background-color': computed.backgroundColor,
      'color': computed.color,
      'font-size': computed.fontSize,
      'font-family': computed.fontFamily.split(',')[0],
      'display': computed.display,
      'border-radius': computed.borderRadius
    };

    var classHint = target.className && typeof target.className === 'string' ? '.' + target.className.trim().split(/\\s+/)[0] : '';
    var sourceHint = target.id ? '#' + target.id : classHint ? classHint : target.tagName.toLowerCase();

    window.parent.postMessage({
      type: 'DEVFORGE_ELEMENT_INSPECTED',
      payload: {
        tagName: target.tagName.toLowerCase(),
        id: target.id || undefined,
        className: (typeof target.className === 'string' ? target.className : undefined),
        textContent: (target.innerText || target.textContent || '').trim().slice(0, 60),
        styles: styles,
        sourceHint: sourceHint,
        boundingRect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      }
    }, '*');
  });

  // Signal ready to parent
  window.parent.postMessage({ type: 'DEVFORGE_PREVIEW_READY' }, '*');
})();
</script>
`;

  // Runtime shield: run before any user script so the very first render frame
  // is already protected. Generated animation code commonly derives radii from
  // animated values that briefly go negative (e.g. `size * life` once `life`
  // decays past zero). Native Canvas2D throws IndexSizeError on negative
  // radii, which aborts the requestAnimationFrame loop and blanks the preview.
  // Clamping instead of throwing keeps every render loop alive.
  const runtimeShieldScript = `
<script id="devforge-runtime-shield">
(function () {
  try {
    var proto = window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype;
    if (!proto) return;

    function clampRadius(value) {
      var n = +value;
      if (!isFinite(n) || n < 0) return 0;
      return n;
    }

    if (typeof proto.arc === 'function') {
      var _arc = proto.arc;
      proto.arc = function (x, y, r) {
        var args = Array.prototype.slice.call(arguments);
        args[2] = clampRadius(args[2]);
        return _arc.apply(this, args);
      };
    }

    if (typeof proto.arcTo === 'function') {
      var _arcTo = proto.arcTo;
      proto.arcTo = function (x1, y1, x2, y2, r) {
        var args = Array.prototype.slice.call(arguments);
        args[4] = clampRadius(args[4]);
        return _arcTo.apply(this, args);
      };
    }

    if (typeof proto.ellipse === 'function') {
      var _ellipse = proto.ellipse;
      proto.ellipse = function (x, y, rx, ry) {
        var args = Array.prototype.slice.call(arguments);
        args[2] = clampRadius(args[2]);
        args[3] = clampRadius(args[3]);
        return _ellipse.apply(this, args);
      };
    }

    if (typeof proto.createRadialGradient === 'function') {
      var _crg = proto.createRadialGradient;
      proto.createRadialGradient = function (x0, y0, r0, x1, y1, r1) {
        try {
          return _crg.call(this, x0, y0, clampRadius(r0), x1, y1, clampRadius(r1));
        } catch (e) {
          if (typeof this.createLinearGradient === 'function') {
            return this.createLinearGradient(x0, y0, x1, y1);
          }
          throw e;
        }
      };
    }
  } catch (e) {}
})();
</script>
`;

  if (htmlContent.includes('</head>')) {
    htmlContent = htmlContent.replace('</head>', `${runtimeShieldScript}\n</head>`);
  } else if (/<body[^>]*>/i.test(htmlContent)) {
    htmlContent = htmlContent.replace(/<body([^>]*)>/i, `<body$1>\n${runtimeShieldScript}`);
  } else {
    htmlContent = `${runtimeShieldScript}\n${htmlContent}`;
  }

  // Inject CSS
  if (combinedCss) {
    if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `<style id="devforge-injected-styles">\n${combinedCss}\n</style>\n</head>`);
    } else {
      htmlContent = `<style id="devforge-injected-styles">\n${combinedCss}\n</style>\n${htmlContent}`;
    }
  }

  // Inject JS
  if (bundle?.javascript) {
    htmlContent = htmlContent.replace(/<script\b(?=[^>]*\bsrc=["'][^"']+\.(?:tsx?|jsx?)(?:\?[^"']*)?["'])[^>]*>\s*<\/script>/gi, '');
    const inlineBundle = bundle.javascript.replace(/<\/script/gi, '<\\/script');
    const bundleScript = `<script id="devforge-compiled-preview">${inlineBundle}</script>`;
    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', `${bundleScript}\n</body>`);
    } else {
      htmlContent = `${htmlContent}\n${bundleScript}`;
    }
  } else if (processedJs) {
    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', `<script id="devforge-injected-scripts">\n${processedJs}\n</script>\n</body>`);
    } else {
      htmlContent = `${htmlContent}\n<script id="devforge-injected-scripts">\n${processedJs}\n</script>`;
    }
  }

  // Inject Bridge Script at end of body or document
  if (htmlContent.includes('</body>')) {
    htmlContent = htmlContent.replace('</body>', `${isolationBridgeScript}\n</body>`);
  } else {
    htmlContent = `${htmlContent}\n${isolationBridgeScript}`;
  }

  return htmlContent;
}

/**
 * Centralized Live Preview Service
 */
export class PreviewService {
  private static instance: PreviewService;

  private status: PreviewStatus = 'stopped';
  private currentURL: string = 'preview://devforge/index.html';
  private viewportPreset: DevicePreset = 'responsive';
  private customDimensions: { width: string; height: string } = { width: '800px', height: '600px' };
  private zoomLevel: number = 100; // in percent: 50, 75, 100, 125, etc.
  private autoReloadEnabled: boolean = true;
  private currentError: PreviewError | null = null;
  private lastInspectedElement: InspectedElement | null = null;
  private isInspectorActive: boolean = false;
  private listeners: Set<() => void> = new Set();
  private autoReloadTimeout: any = null;

  private constructor() {
    // Listen to iframe postMessages
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handlePostMessage.bind(this));
    }
  }

  public static getInstance(): PreviewService {
    if (!PreviewService.instance) {
      PreviewService.instance = new PreviewService();
    }
    return PreviewService.instance;
  }

  private handlePostMessage(e: MessageEvent) {
    if (!e.data || typeof e.data !== 'object') return;

    if (e.data.type === 'DEVFORGE_PREVIEW_READY') {
      this.status = 'running';
      this.currentError = null;
      outputService.append('Preview', 'Preview render completed and ready.', 'success');
      this.notifyListeners();
    } else if (e.data.type === 'DEVFORGE_PREVIEW_CONSOLE') {
      const level = e.data.level === 'error' ? 'error' : e.data.level === 'warn' ? 'warn' : 'info';
      outputService.append('Preview', `[Console] ${e.data.text}`, level);
      debugService.addEntry(e.data.level === 'error' ? 'error' : 'output', `[Preview ${e.data.level}] ${e.data.text}`);
    } else if (e.data.type === 'DEVFORGE_PREVIEW_ERROR') {
      const err: PreviewError = {
        id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        message: e.data.message || 'Unknown runtime error',
        filename: e.data.filename,
        lineno: e.data.lineno,
        colno: e.data.colno,
        stack: e.data.stack,
        timestamp: new Date().toLocaleTimeString()
      };
      this.currentError = err;
      this.status = 'error';
      outputService.append('Preview', `Runtime Error: ${err.message} (${err.filename}:${err.lineno}:${err.colno})`, 'error');
      this.notifyListeners();
    } else if (e.data.type === 'DEVFORGE_ELEMENT_INSPECTED') {
      this.lastInspectedElement = e.data.payload;
      outputService.append(
        'Preview',
        `Inspected <${e.data.payload.tagName}${e.data.payload.id ? ` id="${e.data.payload.id}"` : ''}> (${e.data.payload.styles.width} × ${e.data.payload.styles.height})`,
        'debug'
      );
      this.notifyListeners();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn());
  }

  // --- Core Lifecycle Methods ---

  public detect(files: FileNode[]): ProjectDetectionResult {
    return detectProject(files);
  }

  public async start(files: FileNode[]): Promise<void> {
    const detection = this.detect(files);
    this.status = 'starting';
    this.currentError = null;
    outputService.append('Preview', `Detecting project: ${detection.name} (${detection.kind})...`, 'info');

    if (detection.canRunInBrowserSandbox) {
      this.currentURL = `preview://devforge/${detection.entryPoint || 'index.html'}`;
      outputService.append('Preview', `Starting browser sandbox preview on ${this.currentURL}`, 'info');
      // Simulate quick initialization
      setTimeout(() => {
        this.status = 'running';
        outputService.append('Preview', `Preview available: ${this.currentURL}`, 'success');
        this.notifyListeners();
      }, 150);
    } else {
      this.currentURL = 'http://localhost:3000';
      outputService.append(
        'Preview',
        `Project requires runtime development server. Run '${detection.recommendedCommand}' to boot local server.`,
        'warn'
      );
      this.status = 'stopped';
    }
    this.notifyListeners();
  }

  public stop(): void {
    this.status = 'stopped';
    outputService.append('Preview', 'Preview server stopped.', 'info');
    this.notifyListeners();
  }

  public async restart(files: FileNode[]): Promise<void> {
    this.status = 'reloading';
    this.currentError = null;
    outputService.append('Preview', 'Restarting preview session...', 'info');
    this.notifyListeners();
    setTimeout(() => {
      this.start(files);
    }, 200);
  }

  public reload(): void {
    if (this.status === 'stopped') {
      outputService.append('Preview', 'Cannot reload: preview server is stopped.', 'warn');
      return;
    }
    this.status = 'reloading';
    this.currentError = null;
    outputService.append('Preview', 'Reloading live preview...', 'debug');
    this.notifyListeners();
    setTimeout(() => {
      this.status = 'running';
      this.notifyListeners();
    }, 250);
  }

  public notifyFileChanged(file: FileNode, files: FileNode[]): void {
    if (!this.autoReloadEnabled) return;

    const isWebFile =
      file.name.endsWith('.html') ||
      file.name.endsWith('.css') ||
      file.name.endsWith('.js') ||
      file.name.endsWith('.ts') ||
      file.name.endsWith('.tsx') ||
      file.name.endsWith('.jsx');

    if (!isWebFile) return;

    if (this.autoReloadTimeout) {
      clearTimeout(this.autoReloadTimeout);
    }

    this.autoReloadTimeout = setTimeout(() => {
      outputService.append('Preview', `File changed: ${file.name}. Triggering auto-reload...`, 'debug');
      this.reload();
    }, 400);
  }

  public openExternal(): void {
    if (this.currentURL.startsWith('http')) {
      window.open(this.currentURL, '_blank');
      outputService.append('Preview', `Opening external browser at ${this.currentURL}`, 'info');
    } else {
      // Create temporary blob URL to open in external tab
      outputService.append('Preview', 'Opening static sandbox in standalone window.', 'info');
      const blob = new Blob([this.currentHtml], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    }
  }

  // --- Getters & Setters ---

  private currentHtml: string = '';

  public updateHtml(html: string) {
    this.currentHtml = html;
  }

  public getStatus(): PreviewStatus {
    return this.status;
  }

  public setStatus(s: PreviewStatus) {
    this.status = s;
    this.notifyListeners();
  }

  public getURL(): string {
    return this.currentURL;
  }

  public setURL(url: string) {
    this.currentURL = url;
    this.notifyListeners();
  }

  public getViewportPreset(): DevicePreset {
    return this.viewportPreset;
  }

  public setViewport(preset: DevicePreset, customWidth?: string, customHeight?: string): void {
    this.viewportPreset = preset;
    if (preset === 'custom' && customWidth && customHeight) {
      this.customDimensions = { width: customWidth, height: customHeight };
    }
    this.notifyListeners();
  }

  public getDimensions(): { width: string; height: string; label: string } {
    if (this.viewportPreset === 'custom') {
      return {
        width: this.customDimensions.width,
        height: this.customDimensions.height,
        label: `Custom (${this.customDimensions.width}×${this.customDimensions.height})`
      };
    }
    return DEVICE_DIMENSIONS[this.viewportPreset];
  }

  public getZoom(): number {
    return this.zoomLevel;
  }

  public setZoom(zoom: number): void {
    this.zoomLevel = Math.max(25, Math.min(200, zoom));
    this.notifyListeners();
  }

  public getAutoReload(): boolean {
    return this.autoReloadEnabled;
  }

  public setAutoReload(enabled: boolean): void {
    this.autoReloadEnabled = enabled;
    outputService.append('Preview', `Auto-reload ${enabled ? 'enabled' : 'paused'}.`, 'debug');
    this.notifyListeners();
  }

  public getError(): PreviewError | null {
    return this.currentError;
  }

  public clearError(): void {
    this.currentError = null;
    this.status = 'running';
    this.notifyListeners();
  }

  public getInspectedElement(): InspectedElement | null {
    return this.lastInspectedElement;
  }

  public clearInspectedElement(): void {
    this.lastInspectedElement = null;
    this.notifyListeners();
  }

  public isInspector(): boolean {
    return this.isInspectorActive;
  }

  public setInspector(active: boolean): void {
    this.isInspectorActive = active;
    this.notifyListeners();
  }
}

export const previewService = PreviewService.getInstance();
