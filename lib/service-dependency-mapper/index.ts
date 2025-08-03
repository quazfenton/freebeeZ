// Service Dependency Mapping System for FreebeeZ
// Maps and manages dependencies between different services

export interface ServiceDependency {
  id: string;
  sourceServiceId: string;
  targetServiceId: string;
  dependencyType: DependencyType;
  isRequired: boolean;
  description: string;
  setupOrder: number; // Lower numbers should be set up first
  validationRules?: ValidationRule[];
  createdAt: Date;
  updatedAt: Date;
}

export enum DependencyType {
  AUTHENTICATION = 'authentication', // Service A needs Service B for auth
  DATA_SOURCE = 'data_source',       // Service A gets data from Service B
  NOTIFICATION = 'notification',     // Service A sends notifications via Service B
  STORAGE = 'storage',               // Service A stores data in Service B
  COMPUTE = 'compute',               // Service A uses Service B for processing
  PROXY = 'proxy',                   // Service A routes through Service B
  MONITORING = 'monitoring',         // Service A is monitored by Service B
  BACKUP = 'backup',                 // Service A is backed up to Service B
  CDN = 'cdn',                       // Service A uses Service B for content delivery
  EMAIL = 'email',                   // Service A uses Service B for email
  SMS = 'sms',                       // Service A uses Service B for SMS
  PAYMENT = 'payment',               // Service A uses Service B for payments
  ANALYTICS = 'analytics'            // Service A sends analytics to Service B
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validationType: 'api_call' | 'credential_check' | 'connectivity_test' | 'custom_script';
  endpoint?: string;
  expectedResponse?: any;
  customScript?: string;
  timeout: number;
}

export interface DependencyGraph {
  services: ServiceNode[];
  dependencies: ServiceDependency[];
  setupOrder: string[]; // Service IDs in setup order
  criticalPath: string[]; // Services that if failed, break the most dependencies
}

export interface ServiceNode {
  id: string;
  name: string;
  category: string;
  status: ServiceStatus;
  dependencies: string[]; // Service IDs this service depends on
  dependents: string[]; // Service IDs that depend on this service
  setupPriority: number;
  isCore: boolean; // Core services are critical for the system
  lastHealthCheck: Date;
  healthScore: number; // 0-100
}

export enum ServiceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEGRADED = 'degraded',
  FAILED = 'failed',
  MAINTENANCE = 'maintenance',
  UNKNOWN = 'unknown'
}

export interface SetupPlan {
  id: string;
  name: string;
  services: string[];
  steps: SetupStep[];
  estimatedDuration: number; // in minutes
  prerequisites: string[];
  createdAt: Date;
}

export interface SetupStep {
  id: string;
  serviceId: string;
  stepType: 'register' | 'configure' | 'validate' | 'integrate';
  description: string;
  dependencies: string[]; // Step IDs that must complete first
  estimatedDuration: number;
  automationScript?: string;
  manualInstructions?: string;
  validationRules: ValidationRule[];
}

export interface DependencyImpactAnalysis {
  serviceId: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
  cascadeEffects: CascadeEffect[];
  mitigationStrategies: string[];
  alternativeServices: string[];
}

export interface CascadeEffect {
  serviceId: string;
  effectType: 'degraded' | 'failed' | 'unavailable';
  probability: number; // 0-1
  description: string;
}

export class ServiceDependencyMapper {
  private dependencies: Map<string, ServiceDependency> = new Map();
  private services: Map<string, ServiceNode> = new Map();
  private dependencyGraph: DependencyGraph | null = null;
  private lastGraphUpdate: Date = new Date(0);

  constructor() {
    this.initializeCommonDependencies();
  }

  private initializeCommonDependencies(): void {
    // Email service dependencies
    this.addDependency({
      id: 'protonmail-temp-email',
      sourceServiceId: 'protonmail',
      targetServiceId: 'temp-mail',
      dependencyType: DependencyType.EMAIL,
      isRequired: false,
      description: 'ProtonMail can use temporary email for initial registration',
      setupOrder: 1
    });

    // Cloud storage dependencies
    this.addDependency({
      id: 'netlify-github',
      sourceServiceId: 'netlify',
      targetServiceId: 'github',
      dependencyType: DependencyType.DATA_SOURCE,
      isRequired: true,
      description: 'Netlify deploys from GitHub repositories',
      setupOrder: 2
    });

    // Database dependencies
    this.addDependency({
      id: 'vercel-planetscale',
      sourceServiceId: 'vercel',
      targetServiceId: 'planetscale',
      dependencyType: DependencyType.STORAGE,
      isRequired: false,
      description: 'Vercel can use PlanetScale for database storage',
      setupOrder: 3
    });

    // Authentication dependencies
    this.addDependency({
      id: 'supabase-github-auth',
      sourceServiceId: 'supabase',
      targetServiceId: 'github',
      dependencyType: DependencyType.AUTHENTICATION,
      isRequired: false,
      description: 'Supabase can use GitHub for OAuth authentication',
      setupOrder: 2
    });

    // Monitoring dependencies
    this.addDependency({
      id: 'railway-github',
      sourceServiceId: 'railway',
      targetServiceId: 'github',
      dependencyType: DependencyType.DATA_SOURCE,
      isRequired: true,
      description: 'Railway deploys from GitHub repositories',
      setupOrder: 2
    });

    // AI service dependencies
    this.addDependency({
      id: 'huggingface-github',
      sourceServiceId: 'huggingface',
      targetServiceId: 'github',
      dependencyType: DependencyType.DATA_SOURCE,
      isRequired: false,
      description: 'Hugging Face can sync models from GitHub',
      setupOrder: 2
    });
  }

  addDependency(dependency: Omit<ServiceDependency, 'createdAt' | 'updatedAt'>): void {
    const fullDependency: ServiceDependency = {
      ...dependency,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dependencies.set(dependency.id, fullDependency);
    this.invalidateGraph();
  }

  removeDependency(dependencyId: string): boolean {
    const removed = this.dependencies.delete(dependencyId);
    if (removed) {
      this.invalidateGraph();
    }
    return removed;
  }

  addService(service: Omit<ServiceNode, 'dependencies' | 'dependents' | 'lastHealthCheck'>): void {
    const fullService: ServiceNode = {
      ...service,
      dependencies: [],
      dependents: [],
      lastHealthCheck: new Date()
    };

    this.services.set(service.id, fullService);
    this.invalidateGraph();
  }

  updateServiceStatus(serviceId: string, status: ServiceStatus, healthScore?: number): void {
    const service = this.services.get(serviceId);
    if (service) {
      service.status = status;
      service.lastHealthCheck = new Date();
      if (healthScore !== undefined) {
        service.healthScore = healthScore;
      }
    }
  }

  private invalidateGraph(): void {
    this.dependencyGraph = null;
  }

  buildDependencyGraph(): DependencyGraph {
    if (this.dependencyGraph && Date.now() - this.lastGraphUpdate.getTime() < 60000) {
      return this.dependencyGraph;
    }

    const services = Array.from(this.services.values());
    const dependencies = Array.from(this.dependencies.values());

    // Update service dependencies and dependents
    services.forEach(service => {
      service.dependencies = dependencies
        .filter(dep => dep.sourceServiceId === service.id)
        .map(dep => dep.targetServiceId);
      
      service.dependents = dependencies
        .filter(dep => dep.targetServiceId === service.id)
        .map(dep => dep.sourceServiceId);
    });

    // Calculate setup order using topological sort
    const setupOrder = this.calculateSetupOrder(services, dependencies);

    // Find critical path
    const criticalPath = this.findCriticalPath(services, dependencies);

    this.dependencyGraph = {
      services,
      dependencies,
      setupOrder,
      criticalPath
    };

    this.lastGraphUpdate = new Date();
    return this.dependencyGraph;
  }

  private calculateSetupOrder(services: ServiceNode[], dependencies: ServiceDependency[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize graph
    services.forEach(service => {
      graph.set(service.id, []);
      inDegree.set(service.id, 0);
    });

    // Build adjacency list and calculate in-degrees
    dependencies.forEach(dep => {
      if (dep.isRequired) {
        const dependents = graph.get(dep.targetServiceId) || [];
        dependents.push(dep.sourceServiceId);
        graph.set(dep.targetServiceId, dependents);
        
        inDegree.set(dep.sourceServiceId, (inDegree.get(dep.sourceServiceId) || 0) + 1);
      }
    });

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];

    // Find all nodes with no incoming edges
    inDegree.forEach((degree, serviceId) => {
      if (degree === 0) {
        queue.push(serviceId);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const dependents = graph.get(current) || [];
      dependents.forEach(dependent => {
        const newDegree = (inDegree.get(dependent) || 0) - 1;
        inDegree.set(dependent, newDegree);
        
        if (newDegree === 0) {
          queue.push(dependent);
        }
      });
    }

    // If result doesn't include all services, there's a circular dependency
    if (result.length !== services.length) {
      console.warn('Circular dependency detected in service graph');
      // Return services sorted by setup priority as fallback
      return services
        .sort((a, b) => a.setupPriority - b.setupPriority)
        .map(s => s.id);
    }

    return result;
  }

  private findCriticalPath(services: ServiceNode[], dependencies: ServiceDependency[]): string[] {
    // Services with the most dependents are most critical
    const dependentCounts = new Map<string, number>();

    services.forEach(service => {
      dependentCounts.set(service.id, service.dependents.length);
    });

    return Array.from(dependentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(5, services.length))
      .map(([serviceId]) => serviceId);
  }

  generateSetupPlan(serviceIds: string[]): SetupPlan {
    const graph = this.buildDependencyGraph();
    const relevantServices = serviceIds.filter(id => this.services.has(id));
    
    // Get all dependencies for the requested services
    const allRequiredServices = new Set<string>();
    const queue = [...relevantServices];
    
    while (queue.length > 0) {
      const serviceId = queue.shift()!;
      if (allRequiredServices.has(serviceId)) continue;
      
      allRequiredServices.add(serviceId);
      
      const service = this.services.get(serviceId);
      if (service) {
        service.dependencies.forEach(depId => {
          const dependency = Array.from(this.dependencies.values())
            .find(d => d.sourceServiceId === serviceId && d.targetServiceId === depId);
          
          if (dependency?.isRequired && !allRequiredServices.has(depId)) {
            queue.push(depId);
          }
        });
      }
    }

    // Order services according to dependency graph
    const orderedServices = graph.setupOrder.filter(id => allRequiredServices.has(id));
    
    // Generate setup steps
    const steps: SetupStep[] = [];
    let totalDuration = 0;

    orderedServices.forEach((serviceId, index) => {
      const service = this.services.get(serviceId);
      if (!service) return;

      const stepDuration = this.estimateSetupDuration(serviceId);
      totalDuration += stepDuration;

      steps.push({
        id: `step_${index + 1}_${serviceId}`,
        serviceId,
        stepType: 'register',
        description: `Register and configure ${service.name}`,
        dependencies: index > 0 ? [`step_${index}_${orderedServices[index - 1]}`] : [],
        estimatedDuration: stepDuration,
        validationRules: this.getValidationRules(serviceId)
      });
    });

    return {
      id: `setup_${Date.now()}`,
      name: `Setup plan for ${serviceIds.length} services`,
      services: orderedServices,
      steps,
      estimatedDuration: totalDuration,
      prerequisites: this.getPrerequisites(orderedServices),
      createdAt: new Date()
    };
  }

  private estimateSetupDuration(serviceId: string): number {
    // Base duration estimates in minutes
    const baseDurations: Record<string, number> = {
      'github': 5,
      'gmail': 10,
      'protonmail': 15,
      'netlify': 8,
      'vercel': 10,
      'railway': 12,
      'supabase': 15,
      'planetscale': 10,
      'mongodb-atlas': 12,
      'huggingface': 8,
      'openai': 5
    };

    return baseDurations[serviceId] || 10;
  }

  private getValidationRules(serviceId: string): ValidationRule[] {
    const commonRules: ValidationRule[] = [
      {
        id: `${serviceId}_connectivity`,
        name: 'Connectivity Test',
        description: 'Test basic connectivity to service',
        validationType: 'connectivity_test',
        timeout: 10000
      }
    ];

    // Service-specific validation rules
    const serviceSpecificRules: Record<string, ValidationRule[]> = {
      'github': [
        {
          id: 'github_api_access',
          name: 'GitHub API Access',
          description: 'Verify GitHub API access with token',
          validationType: 'api_call',
          endpoint: 'https://api.github.com/user',
          timeout: 5000
        }
      ],
      'netlify': [
        {
          id: 'netlify_sites_access',
          name: 'Netlify Sites Access',
          description: 'Verify access to Netlify sites API',
          validationType: 'api_call',
          endpoint: 'https://api.netlify.com/api/v1/sites',
          timeout: 5000
        }
      ]
    };

    return [...commonRules, ...(serviceSpecificRules[serviceId] || [])];
  }

  private getPrerequisites(serviceIds: string[]): string[] {
    const prerequisites: string[] = [];
    
    if (serviceIds.includes('github')) {
      prerequisites.push('GitHub account with 2FA enabled');
    }
    
    if (serviceIds.some(id => ['netlify', 'vercel', 'railway'].includes(id))) {
      prerequisites.push('Git repository for deployment');
    }
    
    if (serviceIds.some(id => ['openai', 'anthropic'].includes(id))) {
      prerequisites.push('Valid payment method for AI services');
    }

    return prerequisites;
  }

  analyzeDependencyImpact(serviceId: string): DependencyImpactAnalysis {
    const graph = this.buildDependencyGraph();
    const service = this.services.get(serviceId);
    
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    const affectedServices = this.findAffectedServices(serviceId, graph);
    const cascadeEffects = this.calculateCascadeEffects(serviceId, affectedServices);
    const impactLevel = this.calculateImpactLevel(affectedServices, cascadeEffects);
    const mitigationStrategies = this.generateMitigationStrategies(serviceId, affectedServices);
    const alternativeServices = this.findAlternativeServices(serviceId);

    return {
      serviceId,
      impactLevel,
      affectedServices,
      cascadeEffects,
      mitigationStrategies,
      alternativeServices
    };
  }

  private findAffectedServices(serviceId: string, graph: DependencyGraph): string[] {
    const affected = new Set<string>();
    const queue = [serviceId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const service = graph.services.find(s => s.id === current);
      
      if (service) {
        service.dependents.forEach(dependent => {
          if (!affected.has(dependent)) {
            affected.add(dependent);
            queue.push(dependent);
          }
        });
      }
    }

    return Array.from(affected);
  }

  private calculateCascadeEffects(serviceId: string, affectedServices: string[]): CascadeEffect[] {
    const effects: CascadeEffect[] = [];

    affectedServices.forEach(affectedId => {
      const service = this.services.get(affectedId);
      if (!service) return;

      const dependency = Array.from(this.dependencies.values())
        .find(d => d.sourceServiceId === affectedId && d.targetServiceId === serviceId);

      if (dependency) {
        let effectType: 'degraded' | 'failed' | 'unavailable';
        let probability: number;

        if (dependency.isRequired) {
          effectType = 'failed';
          probability = 0.9;
        } else {
          effectType = 'degraded';
          probability = 0.6;
        }

        effects.push({
          serviceId: affectedId,
          effectType,
          probability,
          description: `${service.name} will be ${effectType} due to ${dependency.dependencyType} dependency`
        });
      }
    });

    return effects;
  }

  private calculateImpactLevel(affectedServices: string[], cascadeEffects: CascadeEffect[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalFailures = cascadeEffects.filter(e => e.effectType === 'failed' && e.probability > 0.8).length;
    const totalAffected = affectedServices.length;

    if (criticalFailures > 3 || totalAffected > 10) {
      return 'critical';
    } else if (criticalFailures > 1 || totalAffected > 5) {
      return 'high';
    } else if (criticalFailures > 0 || totalAffected > 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private generateMitigationStrategies(serviceId: string, affectedServices: string[]): string[] {
    const strategies: string[] = [];

    strategies.push(`Implement health monitoring for ${serviceId}`);
    strategies.push('Set up automated failover mechanisms');
    
    if (affectedServices.length > 0) {
      strategies.push('Configure graceful degradation for dependent services');
      strategies.push('Implement circuit breaker pattern');
    }

    strategies.push('Create incident response playbook');
    strategies.push('Set up alerting for service dependencies');

    return strategies;
  }

  private findAlternativeServices(serviceId: string): string[] {
    // This would be enhanced with a comprehensive service alternatives database
    const alternatives: Record<string, string[]> = {
      'github': ['gitlab', 'bitbucket', 'codeberg'],
      'netlify': ['vercel', 'railway', 'render'],
      'vercel': ['netlify', 'railway', 'render'],
      'planetscale': ['supabase', 'mongodb-atlas', 'cockroachdb'],
      'supabase': ['firebase', 'planetscale', 'mongodb-atlas'],
      'openai': ['anthropic', 'google-gemini', 'cohere'],
      'anthropic': ['openai', 'google-gemini', 'cohere']
    };

    return alternatives[serviceId] || [];
  }

  getDependenciesByType(type: DependencyType): ServiceDependency[] {
    return Array.from(this.dependencies.values())
      .filter(dep => dep.dependencyType === type);
  }

  getServicesByCategory(category: string): ServiceNode[] {
    return Array.from(this.services.values())
      .filter(service => service.category === category);
  }

  getCriticalServices(): ServiceNode[] {
    const graph = this.buildDependencyGraph();
    return graph.services.filter(service => 
      service.isCore || graph.criticalPath.includes(service.id)
    );
  }

  validateDependency(dependencyId: string): Promise<boolean> {
    const dependency = this.dependencies.get(dependencyId);
    if (!dependency) {
      return Promise.resolve(false);
    }

    // This would implement actual validation logic
    // For now, return a mock validation
    return Promise.resolve(true);
  }

  async validateAllDependencies(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const [id] of this.dependencies) {
      const isValid = await this.validateDependency(id);
      results.set(id, isValid);
    }

    return results;
  }

  exportGraph(): DependencyGraph {
    return this.buildDependencyGraph();
  }

  importGraph(graph: DependencyGraph): void {
    this.services.clear();
    this.dependencies.clear();

    graph.services.forEach(service => {
      this.services.set(service.id, service);
    });

    graph.dependencies.forEach(dependency => {
      this.dependencies.set(dependency.id, dependency);
    });

    this.invalidateGraph();
  }
}