// India & Kerala Search Panel
//
// Three modes over one backend: Web results, an image gallery, and an
// AI-generated answer grounded in retrieved sources (RAG) with citations.
// No model training is involved - the UI only calls the server search API.
import React, { useState } from 'react';
import { Search, Image as ImageIcon, Sparkles, ExternalLink, MapPin, ShieldCheck, Loader2 } from 'lucide-react';

export interface SearchPanelProps {
  apiBase?: string;
  /** Optional initial query. */
  initialQuery?: string;
}

type Mode = 'web' | 'images' | 'answer';
type Region = 'all' | 'kerala' | 'india';

interface WebResult {
  title: string;
  url: string;
  description: string;
  source: string;
  age: string | null;
}

interface ImageResult {
  title: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  sourceUrl: string | null;
}

interface Citation {
  index: number;
  title: string;
  url: string;
  source: string;
  snippet: string;
}

interface SearchLinks {
  web: string;
  images: string;
}

interface SearchResponse {
  query: string;
  resolvedQuery: string;
  type: string;
  provider: string;
  region: string;
  district?: string;
  official: boolean;
  web?: WebResult[];
  images?: ImageResult[];
  links: SearchLinks;
  notice?: string;
}

interface AnswerResponse {
  question: string;
  resolvedQuery: string;
  region: string;
  district?: string;
  official: boolean;
  provider: string;
  answer: {
    answer: string;
    citations: Citation[];
    provider: string;
    grounded: boolean;
    notice?: string;
  };
  web: WebResult[];
  links: SearchLinks;
  notice?: string;
}

const KERALA_DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki',
  'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod',
];

export function SearchPanel({ apiBase = '', initialQuery = '' }: SearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<Mode>('web');
  const [region, setRegion] = useState<Region>('kerala');
  const [district, setDistrict] = useState('');
  const [official, setOfficial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchResponse | null>(null);
  const [answer, setAnswer] = useState<AnswerResponse | null>(null);

  const runSearch = async (overrideMode?: Mode) => {
    const activeMode = overrideMode ?? mode;
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearch(null);
    setAnswer(null);

    try {
      if (activeMode === 'answer') {
        const res = await fetch(`${apiBase}/api/search/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: query, district: district || undefined, official }),
        });
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        setAnswer((await res.json()) as AnswerResponse);
      } else {
        const params = new URLSearchParams({ q: query, type: activeMode });
        if (district) params.set('district', district);
        if (official) params.set('official', 'true');
        const res = await fetch(`${apiBase}/api/search?${params.toString()}`);
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        setSearch((await res.json()) as SearchResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const links = answer?.links ?? search?.links;
  const notice = answer?.notice ?? search?.notice;

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-5 h-5 text-orange-400" />
        <h2 className="text-lg font-semibold">India &amp; Kerala Search</h2>
      </div>

      {/* Query bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Ask about Kerala, a district, tourism, schemes, culture…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <button
          onClick={() => runSearch()}
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-sm flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {/* Mode + filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          <TabButton active={mode === 'web'} onClick={() => setMode('web')} icon={<Search className="w-3.5 h-3.5" />} label="Web" />
          <TabButton active={mode === 'images'} onClick={() => setMode('images')} icon={<ImageIcon className="w-3.5 h-3.5" />} label="Images" />
          <TabButton active={mode === 'answer'} onClick={() => setMode('answer')} icon={<Sparkles className="w-3.5 h-3.5" />} label="AI Answer" />
        </div>

        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as Region)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5"
          title="Region focus"
        >
          <option value="kerala">Kerala</option>
          <option value="india">India</option>
          <option value="all">All</option>
        </select>

        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5"
          title="Kerala district"
        >
          <option value="">Any district</option>
          {KERALA_DISTRICTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer">
          <input type="checkbox" checked={official} onChange={(e) => setOfficial(e.target.checked)} className="accent-orange-500" />
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Official sources
        </label>
      </div>

      {notice && (
        <div className="mb-3 p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-lg text-xs text-amber-200">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-3 p-2.5 bg-red-900/20 border border-red-700 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* AI Answer */}
      {answer && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Answer grounded in {answer.answer.citations.length} source(s)</span>
            <span className="font-mono">· {answer.answer.provider}</span>
            {answer.district && <span className="text-orange-400">· {answer.district}</span>}
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{answer.answer.answer}</p>

          {answer.answer.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700 space-y-1.5">
              <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Sources</div>
              {answer.answer.citations.map((c) => (
                <a
                  key={c.index}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-xs text-gray-300 hover:text-white"
                >
                  <span className="shrink-0 text-orange-400 font-mono">[{c.index}]</span>
                  <span className="truncate">{c.title}</span>
                  <span className="text-gray-500 shrink-0">{c.source}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Web results */}
      {search?.web && search.web.length > 0 && (
        <div className="space-y-2">
          {search.web.map((r, i) => (
            <a
              key={`${r.url}-${i}`}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-orange-500/60"
            >
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <span className="truncate">{r.source || hostOf(r.url)}</span>
                {r.age && <span>· {r.age}</span>}
              </div>
              <div className="font-medium text-sm text-blue-300">{r.title}</div>
              <p className="text-xs text-gray-400 mt-1 line-clamp-3">{r.description}</p>
            </a>
          ))}
        </div>
      )}

      {/* Image results */}
      {search?.images && search.images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {search.images.map((img, i) => (
            <a
              key={`${img.imageUrl}-${i}`}
              href={img.sourceUrl || img.imageUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg overflow-hidden border border-gray-700 bg-gray-800"
            >
              <div className="aspect-video bg-gray-900 flex items-center justify-center overflow-hidden">
                {img.thumbnailUrl || img.imageUrl ? (
                  <img
                    src={img.thumbnailUrl || img.imageUrl || ''}
                    alt={img.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-600" />
                )}
              </div>
              <div className="p-2 text-[11px] text-gray-300 truncate">{img.title}</div>
            </a>
          ))}
        </div>
      )}

      {search && search.type === 'images' && (search.images?.length ?? 0) === 0 && (
        <div className="text-sm text-gray-500">No image results returned.</div>
      )}

      {/* Zero-key / always-available Google links */}
      {links && (
        <div className="mt-5 flex flex-wrap gap-3 text-xs">
          <a href={links.web} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
            <ExternalLink className="w-3.5 h-3.5" /> Open web search
          </a>
          <a href={links.images} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
            <ExternalLink className="w-3.5 h-3.5" /> Open image search
          </a>
        </div>
      )}

      {!search && !answer && !loading && !error && (
        <div className="mt-6 text-sm text-gray-500">
          Search India &amp; Kerala topics with real sources. Pick a district for local results, or ask for an
          AI answer grounded in the retrieved pages.
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 ${active ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
    >
      {icon}
      {label}
    </button>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}