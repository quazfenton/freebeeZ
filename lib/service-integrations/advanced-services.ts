// Advanced Service Integrations for Real Free Services
import { BaseServiceIntegration, ServiceCategory, ServiceConfig, ServiceCredentials, ServiceUsage, ServiceLimits } from './index'
import axios from 'axios'

// GitHub Integration
export interface GitHubServiceConfig extends ServiceConfig {
  repositoryLimit: number
  collaboratorLimit: number
}

export class GitHubService extends BaseServiceIntegration {
  private apiClient: any

  constructor(config: GitHubServiceConfig) {
    super({
      ...config,
      category: ServiceCategory.DEVELOPER_TOOLS
    })
  }

  async connect(credentials: ServiceCredentials): Promise<boolean> {
    try {
      this.apiClient = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
          'Authorization': `token ${credentials.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      // Test connection
      const response = await this.apiClient.get('/user')
      if (response.status === 200) {
        this.connected = true
        this.config.isActive = true
        this.config.credentials = credentials
        return true
      }
      return false
    } catch (error) {
      console.error('GitHub connection failed:', error)
      return false
    }
  }

  async disconnect(): Promise<boolean> {
    this.connected = false
    this.config.isActive = false
    this.apiClient = null
    return true
  }

  async executeAction(action: string, params: Record<string, any>): Promise<any> {
    if (!this.connected || !this.apiClient) {
      throw new Error('Not connected to GitHub')
    }

    switch (action) {
      case 'createRepository':
        return await this.createRepository(params)
      case 'listRepositories':
        return await this.listRepositories()
      case 'createGist':
        return await this.createGist(params)
      case 'deployToPages':
        return await this.deployToPages(params)
      default:
        throw new Error(`Unsupported action: ${action}`)
    }
  }

  private async createRepository(params: any): Promise<any> {
    const response = await this.apiClient.post('/user/repos', {
      name: params.name,
      description: params.description,
      private: params.private || false,
      auto_init: true
    })
    return response.data
  }

  private async listRepositories(): Promise<any> {
    const response = await this.apiClient.get('/user/repos')
    return response.data
  }

  private async createGist(params: any): Promise<any> {
    const response = await this.apiClient.post('/gists', {
      description: params.description,
      public: params.public || false,
      files: params.files
    })
    return response.data
  }

  private async deployToPages(params: any): Promise<any> {
    const response = await this.apiClient.post(`/repos/${params.owner}/${params.repo}/pages`, {
      source: {
        branch: params.branch || 'main',
        path: params.path || '/'
      }
    })
    return response.data
  }

  async rotateCredentials(): Promise<ServiceCredentials> {
    // GitHub tokens don't auto-rotate, user needs to generate new ones
    throw new Error('GitHub tokens must be manually rotated in GitHub settings')
  }
}

// Netlify Integration
export interface NetlifyServiceConfig extends ServiceConfig {
  sitesLimit: number
  buildMinutesLimit: number
}

export class NetlifyService extends BaseServiceIntegration {
  private apiClient: any

  constructor(config: NetlifyServiceConfig) {
    super({
      ...config,
      category: ServiceCategory.WEB_INFRASTRUCTURE
    })
  }

  async connect(credentials: ServiceCredentials): Promise<boolean> {
    try {
      this.apiClient = axios.create({
        baseURL: 'https://api.netlify.com/api/v1',
        headers: {
          'Authorization': `Bearer ${credentials.token}`
        }
      })

      // Test connection
      const response = await this.apiClient.get('/user')
      if (response.status === 200) {
        this.connected = true
        this.config.isActive = true
        this.config.credentials = credentials
        return true
      }
      return false
    } catch (error) {
      console.error('Netlify connection failed:', error)
      return false
    }
  }

  async disconnect(): Promise<boolean> {
    this.connected = false
    this.config.isActive = false
    this.apiClient = null
    return true
  }

  async executeAction(action: string, params: Record<string, any>): Promise<any> {
    if (!this.connected || !this.apiClient) {
      throw new Error('Not connected to Netlify')
    }

    switch (action) {
      case 'createSite':
        return await this.createSite(params)
      case 'deploySite':
        return await this.deploySite(params)
      case 'listSites':
        return await this.listSites()
      case 'updateDomain':
        return await this.updateDomain(params)
      default:
        throw new Error(`Unsupported action: ${action}`)
    }
  }

  private async createSite(params: any): Promise<any> {
    const response = await this.apiClient.post('/sites', {
      name: params.name,
      custom_domain: params.domain
    })
    return response.data
  }

  private async deploySite(params: any): Promise<any> {
    const response = await this.apiClient.post(`/sites/${params.siteId}/deploys`, {
      files: params.files,
      draft: params.draft || false
    })
    return response.data
  }

  private async listSites(): Promise<any> {
    const response = await this.apiClient.get('/sites')
    return response.data
  }

  private async updateDomain(params: any): Promise<any> {
    const response = await this.apiClient.put(`/sites/${params.siteId}`, {
      custom_domain: params.domain
    })
    return response.data
  }

  async rotateCredentials(): Promise<ServiceCredentials> {
    // Netlify tokens don't auto-rotate
    throw new Error('Netlify tokens must be manually rotated in Netlify settings')
  }
}

// Vercel Integration
export interface VercelServiceConfig extends ServiceConfig {
  projectsLimit: number
  deploymentLimit: number
}

export class VercelService extends BaseServiceIntegration {
  private apiClient: any

  constructor(config: VercelServiceConfig) {
    super({
      ...config,
      category: ServiceCategory.WEB_INFRASTRUCTURE
    })
  }

  async connect(credentials: ServiceCredentials): Promise<boolean> {
    try {
      this.apiClient = axios.create({
        baseURL: 'https://api.vercel.com',
        headers: {
          'Authorization': `Bearer ${credentials.token}`
        }
      })

      // Test connection
      const response = await this.apiClient.get('/v2/user')
      if (response.status === 200) {
        this.connected = true
        this.config.isActive = true
        this.config.credentials = credentials
        return true
      }
      return false
    } catch (error) {
      console.error('Vercel connection failed:', error)
      return false
    }
  }

  async disconnect(): Promise<boolean> {
    this.connected = false
    this.config.isActive = false
    this.apiClient = null
    return true
  }

  async executeAction(action: string, params: Record<string, any>): Promise<any> {
    if (!this.connected || !this.apiClient) {
      throw new Error('Not connected to Vercel')
    }

    switch (action) {
      case 'createProject':
        return await this.createProject(params)
      case 'deployProject':
        return await this.deployProject(params)
      case 'listProjects':
        return await this.listProjects()
      case 'addDomain':
        return await this.addDomain(params)
      default:
        throw new Error(`Unsupported action: ${action}`)
    }
  }

  private async createProject(params: any): Promise<any> {
    const response = await this.apiClient.post('/v9/projects', {
      name: params.name,
      gitRepository: params.gitRepository
    })
    return response.data
  }

  private async deployProject(params: any): Promise<any> {
    const response = await this.apiClient.post('/v13/deployments', {
      name: params.name,
      files: params.files,
      projectSettings: params.settings
    })
    return response.data
  }

  private async listProjects(): Promise<any> {
    const response = await this.apiClient.get('/v9/projects')
    return response.data
  }

  private async addDomain(params: any): Promise<any> {
    const response = await this.apiClient.post(`/v9/projects/${params.projectId}/domains`, {
      name: params.domain
    })
    return response.data
  }

  async rotateCredentials(): Promise<ServiceCredentials> {
    throw new Error('Vercel tokens must be manually rotated in Vercel settings')
  }
}

// Railway Integration
export interface RailwayServiceConfig extends ServiceConfig {
  projectsLimit: number
  executionTimeLimit: number
}

export class RailwayService extends BaseServiceIntegration {
  private apiClient: any

  constructor(config: RailwayServiceConfig) {
    super({
      ...config,
      category: ServiceCategory.COMPUTING_STORAGE
    })
  }

  async connect(credentials: ServiceCredentials): Promise<boolean> {
    try {
      this.apiClient = axios.create({
        baseURL: 'https://backboard.railway.app/graphql',
        headers: {
          'Authorization': `Bearer ${credentials.token}`,
          'Content-Type': 'application/json'
        }
      })

      // Test connection with a simple query
      const response = await this.apiClient.post('', {
        query: 'query { me { id name email } }'
      })

      if (response.status === 200 && response.data.data?.me) {
        this.connected = true
        this.config.isActive = true
        this.config.credentials = credentials
        return true
      }
      return false
    } catch (error) {
      console.error('Railway connection failed:', error)
      return false
    }
  }

  async disconnect(): Promise<boolean> {
    this.connected = false
    this.config.isActive = false
    this.apiClient = null
    return true
  }

  async executeAction(action: string, params: Record<string, any>): Promise<any> {
    if (!this.connected || !this.apiClient) {
      throw new Error('Not connected to Railway')
    }

    switch (action) {
      case 'createProject':
        return await this.createProject(params)
      case 'deployService':
        return await this.deployService(params)
      case 'listProjects':
        return await this.listProjects()
      case 'addDatabase':
        return await this.addDatabase(params)
      default:
        throw new Error(`Unsupported action: ${action}`)
    }
  }

  private async createProject(params: any): Promise<any> {
    const mutation = `
      mutation projectCreate($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          id
          name
        }
      }
    `
    const response = await this.apiClient.post('', {
      query: mutation,
      variables: {
        input: {
          name: params.name,
          description: params.description
        }
      }
    })
    return response.data.data.projectCreate
  }

  private async deployService(params: any): Promise<any> {
    const mutation = `
      mutation serviceCreate($input: ServiceCreateInput!) {
        serviceCreate(input: $input) {
          id
          name
        }
      }
    `
    const response = await this.apiClient.post('', {
      query: mutation,
      variables: {
        input: {
          projectId: params.projectId,
          source: params.source
        }
      }
    })
    return response.data.data.serviceCreate
  }

  private async listProjects(): Promise<any> {
    const query = `
      query {
        projects {
          edges {
            node {
              id
              name
              description
            }
          }
        }
      }
    `
    const response = await this.apiClient.post('', { query })
    return response.data.data.projects.edges.map((edge: any) => edge.node)
  }

  private async addDatabase(params: any): Promise<any> {
    const mutation = `
      mutation pluginCreate($input: PluginCreateInput!) {
        pluginCreate(input: $input) {
          id
          name
        }
      }
    `
    const response = await this.apiClient.post('', {
      query: mutation,
      variables: {
        input: {
          projectId: params.projectId,
          type: params.databaseType || 'postgresql'
        }
      }
    })
    return response.data.data.pluginCreate
  }

  async rotateCredentials(): Promise<ServiceCredentials> {
    throw new Error('Railway tokens must be manually rotated in Railway settings')
  }
}