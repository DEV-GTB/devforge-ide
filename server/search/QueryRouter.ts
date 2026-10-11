// QueryRouter - makes search India- and Kerala-aware without any AI training.
// It detects Kerala districts, Malayalam signals and India-level topics, adds
// the right geographic context, and can restrict to official domains.

export interface SearchContext {
  /** The query with geographic context / official filters applied. */
  query: string;
  /** Original user query, untouched. */
  original: string;
  country: string;
  region: 'kerala' | 'india' | 'other';
  /** Matched Kerala district, if any. */
  district?: string;
  /** True when the query looks like a request for official sources. */
  official: boolean;
  /** Domains to bias/prepend as site: filters. */
  suggestedDomains: string[];
}

export const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
] as const;

export type KeralaDistrict = (typeof KERALA_DISTRICTS)[number];

/** Common district aliases / alternate spellings seen in queries. */
const DISTRICT_ALIASES: Record<string, KeralaDistrict> = {
  trivandrum: 'Thiruvananthapuram',
  'thiruvananthapuram': 'Thiruvananthapuram',
  calicut: 'Kozhikode',
  kozhikode: 'Kozhikode',
  cochin: 'Ernakulam',
  kochi: 'Ernakulam',
  ernakulam: 'Ernakulam',
  alleppey: 'Alappuzha',
  alappuzha: 'Alappuzha',
  trichur: 'Thrissur',
  thrissur: 'Thrissur',
  palghat: 'Palakkad',
  palakkad: 'Palakkad',
  cannannore: 'Kannur',
  kannur: 'Kannur',
  quilon: 'Kollam',
  kollam: 'Kollam',
  wayanad: 'Wayanad',
  idukki: 'Idukki',
  kottayam: 'Kottayam',
  malappuram: 'Malappuram',
  pathanamthitta: 'Pathanamthitta',
  kasaragod: 'Kasaragod',
};

/** Malayalam-script block is U+0D00-U+0D7F. */
const MALAYALAM_RE = /[\u0D00-\u0D7F]/;

const KERALA_TERMS =
  /\b(kerala|malayali|malayalam|keralite|onam|vishu|thrissur pooram|theyyam|kathakali|mohiniyattam|ksrtc|kochi metro|backwaters|ayurveda)\b/i;

const INDIA_TERMS =
  /\b(india|indian|bharat|new delhi|delhi|mumbai|chennai|bengaluru|bangalore|kolkata|hyderabad|uttar pradesh|maharashtra|tamil nadu|karnataka|andhra|telangana|rajasthan|gujarat|punjab|haryana|bihar|odisha|assam|jharkhand|chhattisgarh|goa|himachal|uttarakhand)\b/i;

const OFFICIAL_HINTS =
  /\b(official|government|govt|department|scheme|portal|application form|apply online|gazette|notification|act|policy|e-services|services)\b/i;

/** Map of topic keywords to trusted official domains. */
const OFFICIAL_DOMAINS: Array<{ match: RegExp; domain: string }> = [
  { match: /\b(kerala|ksrtc|malayalam|district|collectorate|local self)\b/i, domain: 'kerala.gov.in' },
  { match: /\b(tourism|tourist|travel|destination|backwater)\b/i, domain: 'keralatourism.org' },
  { match: /\b(india|nation|central|union|passport|aadhaar|tax)\b/i, domain: 'india.gov.in' },
  { match: /\b(census|population|demographic)\b/i, domain: 'censusindia.gov.in' },
  { match: /\b(education|university|exam|admission|school|college)\b/i, domain: 'education.gov.in' },
];

export interface PrepareOptions {
  /** Force a district context (e.g. from a UI selector). */
  district?: string;
  /** Restrict results to official government domains. */
  officialOnly?: boolean;
}

/**
 * Detect the region/district from free text and enrich the query so the search
 * engine prioritizes relevant India/Kerala sources.
 */
export function prepareSearchQuery(question: string, options: PrepareOptions = {}): SearchContext {
  const original = question.trim();
  const lower = original.toLowerCase();

  // District detection from an explicit selector first, then the text.
  let district: KeralaDistrict | undefined;
  if (options.district) {
    const key = options.district.trim().toLowerCase();
    district = (DISTRICT_ALIASES[key] as KeralaDistrict | undefined) ?? undefined;
  }
  if (!district) {
    for (const [alias, canonical] of Object.entries(DISTRICT_ALIASES)) {
      if (new RegExp(`\\b${alias}\\b`, 'i').test(lower)) {
        district = canonical;
        break;
      }
    }
  }

  const isMalayalam = MALAYALAM_RE.test(original);
  const hasKeralaTerm = KERALA_TERMS.test(original) || isMalayalam;
  const isKerala = hasKeralaTerm || Boolean(district);
  const isIndia = INDIA_TERMS.test(original);
  const official = options.officialOnly || OFFICIAL_HINTS.test(original);

  let enriched = original;
  if (district && !new RegExp(district, 'i').test(original)) {
    enriched = `${original} ${district}`;
  }
  if (isKerala && !/\bkerala\b/i.test(enriched)) {
    enriched = `${enriched} Kerala`;
  } else if (!isKerala && isIndia && !/\bindia\b/i.test(enriched)) {
    enriched = `${enriched} India`;
  } else if (isMalayalam) {
    // Malayalam query about a Malayalam topic without explicit "Kerala".
    enriched = `${enriched} Kerala ഇന്ത്യ`;
  }

  // Suggest official domains when the query looks like it wants official info.
  const suggestedDomains: string[] = [];
  if (official) {
    for (const rule of OFFICIAL_DOMAINS) {
      if (rule.match.test(original) && !suggestedDomains.includes(rule.domain)) {
        suggestedDomains.push(rule.domain);
      }
    }
    if (suggestedDomains.length === 0) {
      suggestedDomains.push(isKerala ? 'kerala.gov.in' : 'india.gov.in');
    }
  }

  return {
    query: enriched.replace(/\s+/g, ' ').trim(),
    original,
    country: isKerala || isIndia ? 'IN' : 'IN',
    region: isKerala ? 'kerala' : isIndia ? 'india' : 'other',
    district,
    official,
    suggestedDomains,
  };
}

/** Normalize a district string to its canonical name, if valid. */
export function canonicalDistrict(value: string): KeralaDistrict | undefined {
  return DISTRICT_ALIASES[value.trim().toLowerCase()];
}

/** Build a zero-key Google search URL (web or image search). */
export function createGoogleSearchUrl(query: string, type: 'web' | 'images' = 'web'): string {
  const params = new URLSearchParams({ q: query });
  if (type === 'images') params.set('tbm', 'isch');
  return `https://www.google.com/search?${params.toString()}`;
}