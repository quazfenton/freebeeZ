# Project Notes and Integration Plan (FreebeeZ)

These notes document current modules, states, flows, and a plan to add programmatic acquisition of many free services/APIs and tool integrations. This will be refined iteratively.

1) High-level architecture discovered
- UI (Next.js App Router)
  - app/automations/*: pages to list and create automations
  - app/services/*: pages to list and add services
  - components/*: dashboard, usage chart, orchestration manager, UI primitives
- Orchestration backend (TypeScript library in lib/)
  - lib/orchestrator: FreebeeZOrchestrator manages tasks, queue, notifications, workflows
  - lib/service-discovery: Defines ServiceTemplate + steps for registration and autoRegisterService that delegates to BrowserAutomationEngine
  - lib/browser-automation: Engine (details truncated here) that executes AutomationTask (navigate, type, click, wait, screenshot, custom)
  - lib/service-integrations: BaseServiceIntegration + concrete services (FreeEmailService, FreeFileStorageService) and Advanced services (GitHub, Netlify, Vercel, Railway) using axios
  - lib/service-templates: ADVANCED_SERVICE_TEMPLATES with example templates (ProtonMail, Tutanota, MEGA, pCloud, … truncated)
  - lib/automation: Automation framework (types, BaseAutomation), plus automations like CredentialRotator and ServiceLimitMonitor
  - lib/automation-registry, lib/service-registry: in-memory registries for automations and services
  - Rotation and limits
    - lib/profile-rotation-manager, lib/proxy-rotation-system
    - lib/automation/service-limit-monitor
  - CAPTCHA and Email
    - lib/captcha-solver, lib/email-manager (contents truncated, but orchestrator wires them)
  - Python bridge
    - lib/python-bridge, python_scripts/* (playwright automation, captcha solver, profile generator, etc.)
  - AI/analysis utilities
    - lib/ai-quota-predictor, lib/service-dependency-mapper, lib/stagehand

Key types
- ServiceTemplate: describes registration flows (steps, selectors), limits, features
- ServiceIntegration: runtime connector for a service (connect(), executeAction(), getUsage(), rotateCredentials())
- OrchestrationTask: queued jobs for auto registration, bulk registration, rotations, Stagehand workflows

2) Current flows
- Discover services → ServiceDiscoveryEngine.initializeServiceTemplates() loads ADVANCED_SERVICE_TEMPLATES.
- Create UserProfile (faker + BrowserProfile from automation engine)
- Build registration steps based on template → AutomationEngine.executeTask
- On success → extractCredentials (basic placeholder) → push results; credentials stored via LocalCredentialManager (wired in orchestrator)
- Orchestrator processes task queue with auto/bulk registration, rotates profiles/proxies, can run Stagehand workflows via PythonBridge

3) Gaps relative to requested capability
- No automated ingestion of “free services / APIs” from GitHub lists or tool aggregator sites
- No standardized schema/persistence for an aggregated catalog (outside of ADVANCED_SERVICE_TEMPLATES)
- Limited HTML/Markdown scraping utilities in-repo (axios is present, but no cheerio/BeautifulSoup binding in TS)
- Credential storage, proxy/profile pools exist, but multi-account “rotation to respect rate limits” is partly scaffolded (good foundation)
- No user credential/cookie vault for manual logins with persistence exposed via UI (likely in-progress)

4) Plan to add “programmatic acquisition” and modular integration
A. Aggregated catalog layer
- New data schema FreeService for normalized entries: id, name, url, category, tags, description, source, lastChecked
- New module lib/free-service-aggregator with pluggable sources:
  - GitHub lists: fetch markdown, parse link lines into FreeService items (initial regex-based parser, later upgrade to cheerio/markdown-it)
  - RSS/Atom feeds: basic RSS fetch with naive item extraction; can be replaced with a robust parser later
  - Simple web pages: minimal HTTP + anchor extraction (placeholder; recommend cheerio)
- De-duplication and normalization
- Output: data/free-services.json (persisted catalog)

B. Registry bridge
- A helper to convert FreeService entries into ServiceTemplate stubs (for discovery) or ServiceIntegration placeholders where feasible
- Start with marking entries as discovery candidates that require manual template authoring, and auto-generate a seed template skeleton for rapid editing

C. Scripted ingestion/update
- scripts/update-free-services.ts: pulls from configured sources, updates data/free-services.json, prints summary
- Future: cron/queue integration (Bull/Celery equivalent), UI “Refresh catalog” button calling API route

D. Integration with existing discovery/registration
- Import selected FreeService entries into ServiceDiscoveryEngine by generating ServiceTemplate skeletons placed in data/generated-templates.json and loaded at startup in addition to ADVANCED_SERVICE_TEMPLATES
- Skeleton includes sane defaults and TODO selectors for human refinement; later augmented by browser recording/Stagehand workflows

E. Optional future adapters
- HTML parsing with cheerio
- GitHub search API queries for curated “awesome” lists
- Firecrawl or MCP servers for crawling (when available in deployment environment)
- Email/IMAP harvesting for verification emails
- Webhooks and SSE for update notifications

5) Security and compliance considerations
- Respect robots.txt and ToS of target sites; keep a per-source policy field
- Rate limiting and proxy rotation using existing ProxyRotationSystem
- Secrets managed via env vars; never log secrets; integrate LocalCredentialManager or external secret manager
- Manual fallback paths for CAPTCHAs; notification plumbing already present in orchestrator

6) Minimal viable implementation (in this commit)
- New module: lib/free-service-aggregator/* (sources + aggregator)
- Data file: data/free-services.json (created/updated by script)
- Script: scripts/update-free-services.ts
- Non-breaking: no edits to existing modules; new functionality is opt-in and ready to be wired into ServiceDiscoveryEngine in a follow-up

7) Next steps after this
- Wire generated templates into ServiceDiscoveryEngine.initializeServiceTemplates() (load data/generated-templates.json if present)
- Add UI page to browse aggregated catalog and select entries to “generate template” or “attempt API integration”
- Add cheerio to improve parsers; add robust RSS parser
- Extend Python side to assist with selector discovery and heuristic step generation for skeleton templates