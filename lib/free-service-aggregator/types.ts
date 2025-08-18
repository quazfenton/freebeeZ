export type FreeServiceCategory =
  | 'communication'
  | 'web_infrastructure'
  | 'computing_storage'
  | 'ai_ml'
  | 'developer_tools'
  | 'security'
  | 'utilities'
  | 'other'

export interface FreeService {
  id: string
  name: string
  url: string
  description?: string
  category?: FreeServiceCategory
  tags?: string[]
  source: string // where we found it
  lastChecked?: string
}

export interface AggregationSourceConfig {
  id: string
  type: 'github_markdown' | 'web_page' | 'rss'
  url: string
  notes?: string
}

export interface AggregationResult {
  sourceId: string
  added: number
  updated: number
  skipped: number
  total: number
}

