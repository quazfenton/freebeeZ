import type { ServiceCredentials } from "../service-integrations"
import crypto from "crypto"

export interface EncryptedCredentials {
  data: string
  iv: string
}

export interface CredentialManager {
  // Core methods
  storeCredentials(serviceId: string, credentials: ServiceCredentials): Promise<boolean>
  getCredentials(serviceId: string): Promise<ServiceCredentials | null>
  deleteCredentials(serviceId: string): Promise<boolean>
  rotateCredentials(serviceId: string): Promise<ServiceCredentials | null>

  // Encryption
  encrypt(data: any): EncryptedCredentials
  decrypt(encryptedData: EncryptedCredentials): any
}

export class LocalCredentialManager implements CredentialManager {
  private encryptionKey: Buffer
  private credentialsStore: Map<string, EncryptedCredentials> = new Map()

  constructor(encryptionKey?: string) {
    // In a real implementation, this would be a secure environment variable
    const key = encryptionKey || process.env.ENCRYPTION_KEY || "default-encryption-key-change-in-production"
    this.encryptionKey = crypto.createHash("sha256").update(String(key)).digest()
  }

  async storeCredentials(serviceId: string, credentials: ServiceCredentials): Promise<boolean> {
    try {
      const encryptedCredentials = this.encrypt(credentials)
      this.credentialsStore.set(serviceId, encryptedCredentials)
      return true
    } catch (error) {
      console.error("Failed to store credentials:", error)
      return false
    }
  }

  async getCredentials(serviceId: string): Promise<ServiceCredentials | null> {
    try {
      const encryptedCredentials = this.credentialsStore.get(serviceId)
      if (!encryptedCredentials) return null

      return this.decrypt(encryptedCredentials)
    } catch (error) {
      console.error("Failed to get credentials:", error)
      return null
    }
  }

  async deleteCredentials(serviceId: string): Promise<boolean> {
    try {
      this.credentialsStore.delete(serviceId)
      return true
    } catch (error) {
      console.error("Failed to delete credentials:", error)
      return false
    }
  }

  async rotateCredentials(serviceId: string): Promise<ServiceCredentials | null> {
    // This would be implemented to work with the specific service to rotate credentials
    // For demonstration, we'll generate new mock credentials.
    // In a real application, this would involve calling the service's own credential rotation API.
    console.log(`Rotating credentials for service: ${serviceId}`)
    const existingCredentials = await this.getCredentials(serviceId);

    // Simulate generating new credentials (e.g., new API key, refresh token)
    // In a real scenario, you'd interact with the specific service's API here.
    const newCredentials: ServiceCredentials = {
      ...existingCredentials, // Keep existing if not being rotated
      apiKey: `rotated-api-key-${Math.random().toString(36).substring(7)}`,
      token: `rotated-token-${Math.random().toString(36).substring(7)}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Valid for 30 days
    };

    await this.storeCredentials(serviceId, newCredentials);
    return newCredentials;
  }

  encrypt(data: any): EncryptedCredentials {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv("aes-256-cbc", this.encryptionKey, iv)

    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex")
    encrypted += cipher.final("hex")

    return {
      data: encrypted,
      iv: iv.toString("hex"),
    }
  }

  decrypt(encryptedData: EncryptedCredentials): any {
    const iv = Buffer.from(encryptedData.iv, "hex")
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.encryptionKey, iv)

    let decrypted = decipher.update(encryptedData.data, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return JSON.parse(decrypted)
  }
}
