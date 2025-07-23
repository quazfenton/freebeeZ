import type { ServiceCategory, ServiceConfig, ServiceIntegration } from "../service-integrations"

export interface ServiceRegistry {
  // Registration
  registerService(service: ServiceIntegration): Promise<boolean>
  unregisterService(serviceId: string): Promise<boolean>

  // Retrieval
  getService(serviceId: string): Promise<ServiceIntegration | null>
  getServicesByCategory(category: ServiceCategory): Promise<ServiceIntegration[]>
  getAllServices(): Promise<ServiceIntegration[]>

  // Filtering
  findServices(filter: Partial<ServiceConfig>): Promise<ServiceIntegration[]>

  // Status
  isServiceRegistered(serviceId: string): Promise<boolean>
}

export class InMemoryServiceRegistry implements ServiceRegistry {
  private services: Map<string, ServiceIntegration> = new Map()

  async registerService(service: ServiceIntegration): Promise<boolean> {
    try {
      this.services.set(service.id, service)
      return true
    } catch (error) {
      console.error("Failed to register service:", error)
      return false
    }
  }

  async unregisterService(serviceId: string): Promise<boolean> {
    try {
      return this.services.delete(serviceId)
    } catch (error) {
      console.error("Failed to unregister service:", error)
      return false
    }
  }

  async getService(serviceId: string): Promise<ServiceIntegration | null> {
    return this.services.get(serviceId) || null
  }

  async getServicesByCategory(category: ServiceCategory): Promise<ServiceIntegration[]> {
    return Array.from(this.services.values()).filter((service) => service.category === category)
  }

  async getAllServices(): Promise<ServiceIntegration[]> {
    return Array.from(this.services.values())
  }

  async findServices(filter: Partial<ServiceConfig>): Promise<ServiceIntegration[]> {
    return Array.from(this.services.values()).filter((service) => {
      // Simple filtering logic - can be expanded as needed
      for (const [key, value] of Object.entries(filter)) {
        if ((service as any)[key] !== value) {
          return false
        }
      }
      return true
    })
  }

  async isServiceRegistered(serviceId: string): Promise<boolean> {
    return this.services.has(serviceId)
  }
}
