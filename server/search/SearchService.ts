// SearchService - provider-agnostic web + image search for the India & Kerala
// Search feature. Supports Brave Search and Tavily when an API key is present,
// and always provides zero-cost Google search links as a fallback.
import { config } from '../../src/core/Config';
import { createGoogleSearchUrl, prepareSearchQuery, SearchContext } from './QueryRouter';

export type SearchType = 'web' | 'images';
export type SearchProviderName = 'brave' | 'tavily' | 'links';

export interface WebResult {
  title: string;
  url: string;
  description: string;
  source: string;
  age: string | null;
}

export interface ImageResult {
  title: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  sourceUrl: string | null;
}

export interface SearchLinks {
  web: string;
  images: string;
}

export interface SearchResponse {
  query: string;
  resolvedQuery: string;
  type: SearchType;
  provider: SearchProviderName;
  region: SearchContext['region'];
  district?: string;
  official: boolean;
  web?: WebResult[];
  images?: ImageResult[];
  links: SearchLinks;
  notice?: string;
}

export class SearchUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchUnavailableError';
  }
}

const BRAVE_WEB = 'https://api.search.brave.com/res/v1/web/search';
const BRAVE_IMAGES = 'https://api.search.brave.com/res/v1/images/search';
const TAVILY_SEARCH = 'https://api.tavily.com/search';

export class SearchService {
  private readonly braveKey: string;
  private readonly tavilyKey: string;
  private readonly preferred: string;

  constructor(keys?: { brave?: string; tavily?: string; preferred?: string }) {
    this.braveKey = keys?.brave ?? config.getBraveSearchApiKey();
    this.tavilyKey = keys?.tavily ?? config.getTavilyApiKey();
    this.preferred = keys?.preferred ?? config.getSearchProvider();
  }

  /** Which provider will be used, without calling it. */
  activeProvider(): SearchProviderName {
    const wanted = this.preferred.toLowerCase();
    if (wanted === 'brave' && this.braveKey) return 'brave';
    if (wanted === 'tavily' && this.tavilyKey) return 'tavily';
    if (wanted === 'links') return 'links';
    if (this.braveKey) return 'brave';
    if (this.tavilyKey) return 'tavily';
    return 'links';
  }

  async search(
    question: string,
    type: SearchType = 'web',
    options: { district?: string; officialOnly?: boolean; count?: number } = {},
  ): Promise<SearchResponse> {
    const context = prepareSearchQuery(question, {
      district: options.district,
      officialOnly: options.officialOnly,
    });

    // Build the effective query, appending official domain filters when asked.
    let effectiveQuery = context.query;
    if (context.official && context.suggestedDomains.length > 0 && !/\bsite:/.test(effectiveQuery)) {
      // Bias (not restrict) the top official domain; keep it readable for the model.
      effectiveQuery = `${effectiveQuery} (${context.suggestedDomains
        .slice(0, 2)
        .map((d) => `site:${d}`)
        .join(' OR ')})`;
    }

    const links: SearchLinks = {
      web: createGoogleSearchUrl(effectiveQuery, 'web'),
      images: createGoogleSearchUrl(effectiveQuery, 'images'),
    };

    const provider = this.activeProvider();

    if (provider === 'links') {
      return {
        query: question,
        resolvedQuery: effectiveQuery,
        type,
        provider: 'links',
        region: context.region,
        district: context.district,
        official: context.official,
        links,
        notice:
          'No search API key configured. Showing Google search links. Set BRAVE_SEARCH_API_KEY or TAVILY_API_KEY for results inside the app.',
      };
    }

    try {
      if (provider === 'brave') {
        const results =
          type === 'images'
            ? await this.braveImages(effectiveQuery, options.count, context.official)
            : await this.braveWeb(effectiveQuery, options.count, context.official);
        return {
          query: question,
          resolvedQuery: effectiveQuery,
          type,
          provider: 'brave',
          region: context.region,
          district: context.district,
          official: context.official,
          ...results,
          links,
        };
      }

      // Tavily currently returns web results; for images we fall back to links.
      if (type === 'images') {
        return {
          query: question,
          resolvedQuery: effectiveQuery,
          type,
          provider: 'tavily',
          region: context.region,
          district: context.district,
          official: context.official,
          images: [],
          links,
          notice: 'Tavily does not return image results here; open the Google Images link instead.',
        };
      }
      const web = await this.tavilyWeb(effectiveQuery, options.count);
      return {
        query: question,
        resolvedQuery: effectiveQuery,
        type,
        provider: 'tavily',
        region: context.region,
        district: context.district,
        official: context.official,
        web,
        links,
      };
    } catch (error) {
      // Degrade gracefully to links instead of failing the request.
      return {
        query: question,
        resolvedQuery: effectiveQuery,
        type,
        provider: 'links',
        region: context.region,
        district: context.district,
        official: context.official,
        links,
        notice: `Search provider "${provider}" failed (${
          error instanceof Error ? error.message : String(error)
        }). Showing Google search links instead.`,
      };
    }
  }

  private async braveWeb(
    query: string,
    count = 10,
    official = false,
  ): Promise<{ web: WebResult[] }> {
    const url = new URL(BRAVE_WEB);
    url.searchParams.set('q', query);
    url.searchParams.set('country', 'IN');
    url.searchParams.set('search_lang', 'en');
    url.searchParams.set('count', String(Math.min(Math.max(count, 1), 20)));
    if (official) url.searchParams.set('result_filter', 'web');

    const data = await this.braveFetch(url);
    const results: WebResult[] = (data.web?.results ?? []).map((item: any) => ({
      title: item.title ?? 'Untitled result',
      url: item.url ?? '',
      description: item.description ?? '',
      source: item.profile?.long_name ?? item.profile?.name ?? hostOf(item.url) ?? '',
      age: item.age ?? item.page_age ?? null,
    }));
    return { web: results };
  }

  private async braveImages(
    query: string,
    count = 10,
    official = false,
  ): Promise<{ images: ImageResult[] }> {
    const url = new URL(BRAVE_IMAGES);
    url.searchParams.set('q', query);
    url.searchParams.set('country', 'IN');
    url.searchParams.set('search_lang', 'en');
    url.searchParams.set('count', String(Math.min(Math.max(count, 1), 20)));
    url.searchParams.set('safesearch', 'strict');
    if (official) url.searchParams.set('result_filter', 'images');

    const data = await this.braveFetch(url);
    const images: ImageResult[] = (data.results ?? []).map((item: any) => ({
      title: item.title ?? 'Image result',
      imageUrl: item.properties?.url ?? item.thumbnail?.src ?? null,
      thumbnailUrl: item.thumbnail?.src ?? null,
      sourceUrl: item.url ?? item.source ?? null,
    }));
    return { images };
  }

  private async braveFetch(url: URL): Promise<any> {
    const response = await fetch(url.toString(), {
      headers: {
        'X-Subscription-Token': this.braveKey,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new SearchUnavailableError(`Brave returned ${response.status}`);
    }
    return response.json();
  }

  private async tavilyWeb(query: string, count = 10): Promise<WebResult[]> {
    const response = await fetch(TAVILY_SEARCH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.tavilyKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: Math.min(Math.max(count, 1), 20),
        include_answer: false,
        include_images: false,
        search_depth: 'basic',
      }),
    });
    if (!response.ok) {
      throw new SearchUnavailableError(`Tavily returned ${response.status}`);
    }
    const data = await response.json();
    return (data.results ?? []).map((item: any) => ({
      title: item.title ?? 'Untitled result',
      url: item.url ?? '',
      description: item.content ?? item.snippet ?? '',
      source: hostOf(item.url) ?? '',
      age: item.published_date ?? null,
    }));
  }
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}