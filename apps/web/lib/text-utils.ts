export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function decodeBasicHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"'
  };

  return value
    .replace(/&#(\d+);/g, (_match, codePoint: string) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16))
    )
    .replace(/&([a-z]+);/gi, (match, entity: string) => namedEntities[entity.toLowerCase()] ?? match);
}

export function formatTaxonomyName(value: string) {
  return decodeBasicHtmlEntities(value).replace(/\s+/g, ' ').trim();
}

export function formatTagName(value: string) {
  const cleaned = formatTaxonomyName(value).replace(/^#+/, '').trim();
  const separatedWords = cleaned.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const words =
    separatedWords.length > 1
      ? separatedWords
      : (cleaned.match(/[A-Z]+(?=[A-Z][a-z]|[0-9]|$)|[A-Z]?[a-z]+|[0-9]+/g) ?? separatedWords);

  return words.map(formatTagWord).join('') || 'Tag';
}

export function taxonomyIdentityKey(value: string) {
  return formatTaxonomyName(value)
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function firstSentence(value: string) {
  const match = value.trim().match(/^.*?[.!?](?:\s|$)/);
  return (match?.[0] ?? value.trim()).trim();
}

export function summarizeText(value: string, maxWords = 18) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(' ');
  }

  return `${words.slice(0, maxWords).join(' ')}...`;
}

export function splitSentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function formatTagWord(word: string) {
  const acronym = KNOWN_TAG_ACRONYMS[word.toLowerCase()];
  if (acronym) {
    return acronym;
  }

  if (/^[A-Z0-9]{2,5}$/.test(word)) {
    return word;
  }

  return word[0]?.toUpperCase() + word.slice(1);
}

const KNOWN_TAG_ACRONYMS: Record<string, string> = {
  ai: 'AI',
  api: 'API',
  apis: 'APIs',
  ats: 'ATS',
  aws: 'AWS',
  cicd: 'CICD',
  cio: 'CIO',
  css: 'CSS',
  csiro: 'CSIRO',
  dlt: 'DLT',
  html: 'HTML',
  ict: 'ICT',
  ide: 'IDE',
  iot: 'IoT',
  llm: 'LLM',
  llms: 'LLMs',
  mlops: 'MLOps',
  mphil: 'MPhil',
  nb: 'NB',
  nggp: 'NGGP',
  php: 'PHP',
  qut: 'QUT',
  rag: 'RAG',
  saas: 'SaaS',
  soc: 'SOC',
  sql: 'SQL',
  sre: 'SRE',
  sso: 'SSO',
  xml: 'XML',
  xes: 'XES'
};
