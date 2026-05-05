// Predefined Aggregation Sources for Free Services
import { AggregationSourceConfig } from './types'

export const GITHUB_AWESOME_LISTS: AggregationSourceConfig[] = [
  {
    id: 'free-for-dev',
    type: 'github_markdown',
    url: 'https://github.com/ripienaar/free-for-dev',
    notes: 'Comprehensive list of SaaS, PaaS, IaaS with free tiers for developers',
  },
  {
    id: 'free-for-life',
    type: 'github_markdown',
    url: 'https://github.com/wdhdev/free-for-life',
    notes: 'Services with permanent free tiers (not just trials)',
  },
  {
    id: 'public-apis',
    type: 'github_markdown',
    url: 'https://github.com/public-apis/public-apis',
    notes: 'Collective list of free APIs for software development',
  },
  {
    id: 'free-dev-resources',
    type: 'github_markdown',
    url: 'https://github.com/leogopal/free-dev-resources',
    notes: 'Free developer resources and tools',
  },
  {
    id: 'awesome-selfhosted',
    type: 'github_markdown',
    url: 'https://github.com/awesome-selfhosted/awesome-selfhosted',
    notes: 'Self-hostable applications as alternatives to SaaS',
  },
  {
    id: 'awesome-ai',
    type: 'github_markdown',
    url: 'https://github.com/steven2358/awesome-generative-ai',
    notes: 'Generative AI tools and services',
  },
  {
    id: 'awesome-llm',
    type: 'github_markdown',
    url: 'https://github.com/Hannibal046/Awesome-LLM',
    notes: 'Large Language Model resources',
  },
  {
    id: 'awesome-chatgpt-api',
    type: 'github_markdown',
    url: 'https://github.com/reorx/awesome-chatgpt-api',
    notes: 'ChatGPT API resources and wrappers',
  },
  {
    id: 'awesome-serverless',
    type: 'github_markdown',
    url: 'https://github.com/anaibol/awesome-serverless',
    notes: 'Serverless computing resources',
  },
  {
    id: 'awesome-jamstack',
    type: 'github_markdown',
    url: 'https://github.com/automata/awesome-jamstack',
    notes: 'JAMstack resources and services',
  },
]

export const TOOL_AGGREGATOR_SITES: AggregationSourceConfig[] = [
  {
    id: 'free-for-dev-website',
    type: 'web_page',
    url: 'https://free-for.dev/',
    notes: 'Web frontend for free-for-dev list',
  },
  {
    id: 'devresources',
    type: 'web_page',
    url: 'https://devresourc.es/',
    notes: 'Curated resources for developers',
  },
  {
    id: 'undesign',
    type: 'web_page',
    url: 'https://undesign.learn.uno/',
    notes: 'Free design tools and resources',
  },
]

export const API_DIRECTORIES: AggregationSourceConfig[] = [
  {
    id: 'rapidapi-free',
    type: 'web_page',
    url: 'https://rapidapi.com/collection/list-of-free-apis',
    notes: 'RapidAPI free API collection',
  },
  {
    id: 'api-ninjas',
    type: 'web_page',
    url: 'https://api-ninjas.com/',
    notes: 'Collection of free APIs',
  },
]

export const RSS_FEEDS: AggregationSourceConfig[] = [
  {
    id: 'producthunt-devtools',
    type: 'rss',
    url: 'https://www.producthunt.com/categories/developer-tools.rss',
    notes: 'New developer tools from Product Hunt',
  },
]

export const ALL_SOURCES: AggregationSourceConfig[] = [
  ...GITHUB_AWESOME_LISTS,
  ...TOOL_AGGREGATOR_SITES,
  ...API_DIRECTORIES,
  ...RSS_FEEDS,
]

export function getSourcesByType(type: AggregationSourceConfig['type']): AggregationSourceConfig[] {
  return ALL_SOURCES.filter((s) => s.type === type)
}

export function getSourceById(id: string): AggregationSourceConfig | undefined {
  return ALL_SOURCES.find((s) => s.id === id)
}

export function getPrioritySources(count: number = 5): AggregationSourceConfig[] {
  const priority = ['free-for-dev', 'public-apis', 'free-for-life', 'awesome-selfhosted', 'free-dev-resources']
  return priority.slice(0, count).map((id) => getSourceById(id)).filter((s): s is AggregationSourceConfig => !!s)
}
