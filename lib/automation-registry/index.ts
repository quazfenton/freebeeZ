import type { Automation, AutomationConfig, AutomationType } from "../automation"

export interface AutomationRegistry {
  // Registration
  registerAutomation(automation: Automation): Promise<boolean>
  unregisterAutomation(automationId: string): Promise<boolean>

  // Retrieval
  getAutomation(automationId: string): Promise<Automation | null>
  getAutomationsByType(type: AutomationType): Promise<Automation[]>
  getAllAutomations(): Promise<Automation[]>

  // Filtering
  findAutomations(filter: Partial<AutomationConfig>): Promise<Automation[]>

  // Status
  isAutomationRegistered(automationId: string): Promise<boolean>
}

export class InMemoryAutomationRegistry implements AutomationRegistry {
  private automations: Map<string, Automation> = new Map()

  async registerAutomation(automation: Automation): Promise<boolean> {
    try {
      this.automations.set(automation.id, automation)
      return true
    } catch (error) {
      console.error("Failed to register automation:", error)
      return false
    }
  }

  async unregisterAutomation(automationId: string): Promise<boolean> {
    try {
      return this.automations.delete(automationId)
    } catch (error) {
      console.error("Failed to unregister automation:", error)
      return false
    }
  }

  async getAutomation(automationId: string): Promise<Automation | null> {
    return this.automations.get(automationId) || null
  }

  async getAutomationsByType(type: AutomationType): Promise<Automation[]> {
    return Array.from(this.automations.values()).filter((automation) => automation.type === type)
  }

  async getAllAutomations(): Promise<Automation[]> {
    return Array.from(this.automations.values())
  }

  async findAutomations(filter: Partial<AutomationConfig>): Promise<Automation[]> {
    return Array.from(this.automations.values()).filter((automation) => {
      // Simple filtering logic - can be expanded as needed
      for (const [key, value] of Object.entries(filter)) {
        if ((automation as any)[key] !== value) {
          return false
        }
      }
      return true
    })
  }

  async isAutomationRegistered(automationId: string): Promise<boolean> {
    return this.automations.has(automationId)
  }
}
