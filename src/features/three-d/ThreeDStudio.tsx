import React, { useState } from 'react';
import {
  Sparkles,
  Boxes,
  Cuboid,
  Brain,
  Play,
  Loader2,
  Copy,
  Check,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import { ThreeViewer, ViewerPayload, ViewerVoxel } from './ThreeViewer';

type StudioTab = 'scene' | 'mesh' | 'voxel' | 'train';

const SHAPES = ['sphere', 'cube', 'torus', 'pyramid', 'tree', 'heart', 'ring', 'castle', 'car', 'star'];

const XOR_PRESET = JSON.stringify(
  {
    task: 'regress',
    name: 'xor-gate',
    hidden: [6],
    epochs: 1500,
    lr: 0.35,
    examples: [
      { input: [0, 0], output: [0] },
      { input: [0, 1], output: [1] },
      { input: [1, 0], output: [1] },
      { input: [1, 1], output: [0] },
    ],
  },
  null,
  2
);

export function ThreeDStudio() {
  const [tab, setTab] = useState<StudioTab>('scene');
  const [viewer, setViewer] = useState<ViewerPayload>({ mode: 'empty' });
  const [status, setStatus] = useState<string>('');

  const tabs: Array<{ id: StudioTab; label: string; icon: React.ElementType }> = [
    { id: 'scene', label: 'AI Scene', icon: Sparkles },
    { id: 'mesh', label: 'Mesh', icon: ImageIcon },
    { id: 'voxel', label: 'Voxel', icon: Cuboid },
    { id: 'train', label: 'Train', icon: Brain },
  ];

  return (
    <div className="flex flex-col h-full bg-[#18181b] text-zinc-200">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#27272a] shrink-0">
        <Boxes className="w-3.5 h-3.5 text-fuchsia-400" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">3D Studio</span>
      </div>

      <div className="flex border-b border-[#27272a] shrink-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition ${
              tab === id ? 'text-white border-b-2 border-fuchsia-500 bg-fuchsia-500/10' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-[220px] border-b border-[#27272a]">
          <ThreeViewer payload={viewer} />
        </div>

        <div className="p-2.5 overflow-y-auto max-h-[46%] shrink-0">
          {tab === 'scene' && <SceneTab setViewer={setViewer} setStatus={setStatus} />}
          {tab === 'mesh' && <MeshTab setViewer={setViewer} setStatus={setStatus} />}
          {tab === 'voxel' && <VoxelTab setViewer={setViewer} setStatus={setStatus} />}
          {tab === 'train' && <TrainTab setStatus={setStatus} />}
        </div>

        {status && (
          <div className="px-2.5 pb-2 text-[10px] font-mono text-zinc-400 truncate" title={status}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

interface TabProps {
  setViewer: (payload: ViewerPayload) => void;
  setStatus: (value: string) => void;
}

function SceneTab({ setViewer, setStatus }: TabProps) {
  const [prompt, setPrompt] = useState('A low-poly floating island with crystals');
  const [style, setStyle] = useState('modern stylized');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setStatus('Generating scene…');
    try {
      const res = await fetch('/api/3d/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Scene failed (${res.status})`);
      setCode(data.code);
      setViewer({ mode: 'scene', code: data.code });
      setStatus(`Scene ready · ${data.mode === 'local' ? 'offline engine' : 'cloud AI'}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Scene generation failed');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-2">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        placeholder="Describe a 3D scene…"
        className="w-full bg-[#121214] border border-[#27272a] rounded px-2 py-1.5 text-xs resize-none focus:outline-hidden focus:border-fuchsia-500"
      />
      <div className="flex gap-2">
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="flex-1 bg-[#121214] border border-[#27272a] rounded px-2 py-1.5 text-xs"
        >
          {['modern stylized', 'low poly', 'neon cyberpunk', 'pastel soft', 'realistic materials', 'wireframe technical'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white rounded text-xs font-medium"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Generate
        </button>
      </div>
      {code && (
        <div className="relative">
          <button onClick={copy} className="absolute top-1.5 right-1.5 p-1 bg-zinc-800/80 hover:bg-zinc-700 rounded text-zinc-300" title="Copy code">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <pre className="max-h-40 overflow-auto bg-black/60 border border-zinc-800 rounded p-2 text-[10px] text-emerald-300 whitespace-pre">
            {code}
          </pre>
        </div>
      )}
    </div>
  );
}

function MeshTab({ setViewer, setStatus }: TabProps) {
  const [prompt, setPrompt] = useState('a stylized treasure chest');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  const generate = async () => {
    setLoading(true);
    setStatus('Requesting 3D mesh…');
    setNote('');
    try {
      const res = await fetch('/api/3d/mesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image: image || undefined }),
      });
      const data = await res.json();
      if (data.success && (data.glb || data.modelUrl)) {
        setViewer({ mode: 'mesh', glb: data.glb, modelUrl: data.modelUrl });
        setStatus('Mesh loaded from hosted 3D model');
      } else if (data.fallback?.obj) {
        setViewer({ mode: 'mesh', obj: data.fallback.obj });
        setNote(data.message || 'Hosted 3D model not configured — showing procedural fallback.');
        setStatus('Procedural fallback mesh');
      } else {
        setNote(data.error || 'Mesh generation unavailable.');
        setStatus('Mesh generation unavailable');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Mesh request failed');
    } finally {
      setLoading(false);
    }
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        placeholder="Describe the object to model…"
        className="w-full bg-[#121214] border border-[#27272a] rounded px-2 py-1.5 text-xs resize-none focus:outline-hidden focus:border-fuchsia-500"
      />
      <div className="flex items-center gap-2">
        <label className="flex-1 cursor-pointer text-[11px] text-zinc-400 bg-[#121214] border border-dashed border-[#3f3f46] rounded px-2 py-1.5 hover:border-fuchsia-500 truncate">
          {image ? 'Image attached ✓' : 'Attach reference image (optional)'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        <button
          onClick={generate}
          disabled={loading || (!prompt.trim() && !image)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white rounded text-xs font-medium"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Generate
        </button>
      </div>
      {note && <p className="text-[10px] text-amber-300/90 leading-snug">{note}</p>}
      <p className="text-[10px] text-zinc-500 leading-snug">
        Real mesh generation activates automatically once <span className="font-mono text-zinc-400">THREED_HF_ENDPOINT</span> is configured on the server.
      </p>
    </div>
  );
}

function VoxelTab({ setViewer, setStatus }: TabProps) {
  const [prompt, setPrompt] = useState('');
  const [shape, setShape] = useState('sphere');
  const [size, setSize] = useState(16);
  const [loading, setLoading] = useState(false);
  const [obj, setObj] = useState('');

  const generate = async () => {
    setLoading(true);
    setStatus('Building voxels…');
    try {
      const res = await fetch('/api/3d/voxel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt || undefined, shape, size }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Voxel failed (${res.status})`);
      setViewer({ mode: 'voxel', voxels: data.voxels as ViewerVoxel[], size: data.size });
      setObj(data.obj);
      setStatus(`${data.shape} · ${data.voxels.length} voxels · ${data.triangleCount} tris (${data.decidedBy})`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Voxel generation failed');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([obj], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devforge-voxel-${shape}.obj`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Optional: describe shape (e.g. 'a small tree')"
        className="w-full bg-[#121214] border border-[#27272a] rounded px-2 py-1.5 text-xs focus:outline-hidden focus:border-fuchsia-500"
      />
      <div className="flex items-center gap-2">
        <select value={shape} onChange={(e) => setShape(e.target.value)} className="flex-1 bg-[#121214] border border-[#27272a] rounded px-2 py-1.5 text-xs">
          {SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="text-[11px] text-zinc-400 flex items-center gap-1.5">
          size
          <input type="range" min={6} max={28} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-20" />
          <span className="font-mono text-zinc-300 w-5 text-right">{size}</span>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={generate}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white rounded text-xs font-medium"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cuboid className="w-3.5 h-3.5" />}
          Build Voxels
        </button>
        <button
          onClick={download}
          disabled={!obj}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          OBJ
        </button>
      </div>
    </div>
  );
}

interface TrainResult {
  id: string;
  name: string;
  task: string;
  sizes: number[];
  classes?: string[];
  summary: { epochs: number; loss: number; accuracy: number; samples: number };
}

function TrainTab({ setStatus }: { setStatus: (value: string) => void }) {
  const [config, setConfig] = useState(XOR_PRESET);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrainResult | null>(null);
  const [predictInput, setPredictInput] = useState('[0, 1]');
  const [prediction, setPrediction] = useState('');

  const train = async () => {
    setLoading(true);
    setStatus('Training model…');
    try {
      const parsed = JSON.parse(config);
      const res = await fetch('/api/3d/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Training failed (${res.status})`);
      setResult(data);
      setStatus(`Trained "${data.name}" · loss ${data.summary.loss} · acc ${(data.summary.accuracy * 100).toFixed(0)}%`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Training failed');
    } finally {
      setLoading(false);
    }
  };

  const predict = async () => {
    if (!result) return;
    try {
      const input = JSON.parse(predictInput);
      const res = await fetch(`/api/3d/train/${result.id}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Predict failed');
      setPrediction(
        data.predictedLabel !== undefined
          ? `${data.predictedLabel} (${(data.confidence * 100).toFixed(0)}%)`
          : data.output.map((n: number) => n.toFixed(3)).join(', ')
      );
    } catch (error) {
      setPrediction(error instanceof Error ? error.message : 'Predict failed');
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-zinc-500 leading-snug">
        Trains a real neural network (gradient descent) in-process — no GPU, no database. Edit the JSON config and train.
      </p>
      <textarea
        value={config}
        onChange={(e) => setConfig(e.target.value)}
        rows={7}
        spellCheck={false}
        className="w-full bg-black/50 border border-[#27272a] rounded px-2 py-1.5 text-[10px] font-mono resize-y focus:outline-hidden focus:border-fuchsia-500"
      />
      <button
        onClick={train}
        disabled={loading}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white rounded text-xs font-medium"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
        Train Model
      </button>

      {result && (
        <div className="bg-[#121214] border border-[#27272a] rounded p-2 space-y-2">
          <div className="text-[11px] text-zinc-300">
            <span className="font-semibold">{result.name}</span> · layers [{result.sizes.join(' → ')}]
          </div>
          <div className="grid grid-cols-3 gap-1 text-center">
            {[
              ['loss', result.summary.loss],
              ['accuracy', `${(result.summary.accuracy * 100).toFixed(0)}%`],
              ['samples', result.summary.samples],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-black/40 rounded py-1">
                <div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
                <div className="text-xs font-mono text-emerald-300">{value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={predictInput}
              onChange={(e) => setPredictInput(e.target.value)}
              className="flex-1 bg-black/40 border border-[#27272a] rounded px-2 py-1 text-[11px] font-mono"
              placeholder="[0, 1]"
            />
            <button onClick={predict} className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px]">Predict</button>
          </div>
          {prediction && <div className="text-[11px] font-mono text-fuchsia-300">→ {prediction}</div>}
        </div>
      )}
    </div>
  );
}
