import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Database,
  Globe,
  MessageSquare,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Zap,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ServiceCard } from "@/components/service-card"
import { ServiceUsageChart } from "@/components/service-usage-chart"
import { RecentAutomations } from "@/components/recent-automations"
import React, { useEffect, useState } from "react" // Import React hooks

// Import necessary classes and types
import { InMemoryServiceRegistry } from "@/lib/service-registry"
import { LocalCredentialManager } from "@/lib/credential-manager"
import { FreeEmailService, type FreeEmailServiceConfig } from "@/lib/service-integrations/free-email-service"
import { FreeFileStorageService, type FreeFileStorageServiceConfig } from "@/lib/service-integrations/free-file-storage-service"
import { ServiceLimitMonitorAutomation, type ServiceLimitMonitorConfig } from "@/lib/automation/service-limit-monitor"
import { CredentialRotatorAutomation, type CredentialRotatorConfig } from "@/lib/automation/credential-rotator"
import { TriggerType } from "@/lib/automation"
import { InMemoryAutomationRegistry } from "@/lib/automation-registry"
import type { ServiceIntegration } from "@/lib/service-integrations"
import type { Automation } from "@/lib/automation"
import { ServiceCategory } from "@/lib/service-integrations" // Import ServiceCategory
import { FreebeeZOrchestrator, type OrchestrationTask } from "@/lib/orchestrator"

export default function DashboardPage() {
  // State for managing services and automations
  const [serviceRegistry] = useState<InMemoryServiceRegistry>(() => new InMemoryServiceRegistry());
  const [automationRegistry] = useState<InMemoryAutomationRegistry>(() => new InMemoryAutomationRegistry());
  const [credentialManager] = useState<LocalCredentialManager>(() => new LocalCredentialManager());
  const [orchestrator] = useState<FreebeeZOrchestrator>(() => new FreebeeZOrchestrator());
  const [services, setServices] = useState<ServiceIntegration[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [orchestrationTasks, setOrchestrationTasks] = useState<OrchestrationTask[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize the orchestrator first
        await orchestrator.initialize({
          // Add your API keys here if available
          // twoCaptchaKey: process.env.NEXT_PUBLIC_2CAPTCHA_KEY,
          // antiCaptchaKey: process.env.NEXT_PUBLIC_ANTICAPTCHA_KEY,
        });

        // --- Service Setup ---
        const emailServiceConfig: FreeEmailServiceConfig = {
          id: "free-email-1",
          name: "Free Email Service",
          description: "A basic free email service provider.",
          category: ServiceCategory.COMMUNICATION,
          credentials: { apiKey: "dummy-email-api-key" },
          limits: { monthlyRequests: 10000 },
          usage: { monthlyRequestsUsed: 5000 },
          isActive: true,
          settings: {},
        };
        const storageServiceConfig: FreeFileStorageServiceConfig = {
          id: "free-storage-1",
          name: "Free File Storage",
          description: "A basic free file storage service.",
          category: ServiceCategory.COMPUTING_STORAGE,
          credentials: { accessKeyId: "dummy-storage-key", secretAccessKey: "dummy-storage-secret" },
          limits: { storageLimit: 5 * 1024 * 1024 * 1024 }, // 5GB
          usage: { storageUsed: 2 * 1024 * 1024 * 1024 }, // 2GB
          isActive: true,
          settings: {},
        };

        const emailService = new FreeEmailService(emailServiceConfig);
        const storageService = new FreeFileStorageService(storageServiceConfig);

        await serviceRegistry.registerService(emailService);
        await serviceRegistry.registerService(storageService);
        setServices([emailService, storageService]);

        // --- Automation Setup ---
        const limitMonitorConfig: ServiceLimitMonitorConfig = {
          id: "limit-monitor-1",
          name: "Monthly Limit Monitor",
          description: "Monitors monthly request limits for key services.",
          type: "limit_monitor",
          servicesToMonitor: ["free-email-1", "free-storage-1"],
          monitorThresholdPercent: 85,
          trigger: { type: TriggerType.SCHEDULE, schedule: { type: "hourly" } },
          actions: [], // Placeholder for actions like sending notifications
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const credentialRotatorConfig: CredentialRotatorConfig = {
          id: "credential-rotator-1",
          name: "Daily Credential Rotation",
          description: "Rotates credentials for critical services daily.",
          type: "credential_rotator",
          servicesToRotate: ["free-email-1", "free-storage-1"],
          trigger: { type: TriggerType.SCHEDULE, schedule: { type: "daily" } },
          actions: [], // Placeholder for actions like logging rotation
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Pass the actual service instances to the automations
        const limitMonitorAutomation = new ServiceLimitMonitorAutomation(limitMonitorConfig, [emailService, storageService], serviceRegistry, credentialManager);
        const credentialRotatorAutomation = new CredentialRotatorAutomation(credentialRotatorConfig, [emailService, storageService], serviceRegistry, credentialManager);

        await automationRegistry.registerAutomation(limitMonitorAutomation);
        await automationRegistry.registerAutomation(credentialRotatorAutomation);
        setAutomations([limitMonitorAutomation, credentialRotatorAutomation]);

        // Get orchestration tasks
        setOrchestrationTasks(orchestrator.getAllTasks());
        setIsInitialized(true);

      } catch (error) {
        console.error('Failed to initialize FreebeeZ:', error);
      }
    };

    initializeApp();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Function to create auto-registration task
  const handleAutoRegister = async () => {
    try {
      const availableServices = await orchestrator.discoverServices();
      const serviceIds = availableServices.slice(0, 3).map(s => s.id); // Take first 3 services
      
      const task = await orchestrator.createAutoRegistrationTask(serviceIds, {
        maxConcurrent: 2,
        retryAttempts: 3,
        delayBetweenTasks: 5000
      });
      
      setOrchestrationTasks(orchestrator.getAllTasks());
      console.log('Auto-registration task created:', task.id);
    } catch (error) {
      console.error('Failed to create auto-registration task:', error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <DashboardShell>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleAutoRegister} disabled={!isInitialized}>
              <Zap className="mr-2 h-4 w-4" />
              Auto-Register Services
            </Button>
            <Link href="/services/add">
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </Link>
          </div>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="automations">Automations</TabsTrigger>
            <TabsTrigger value="orchestration">Orchestration</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Services</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{services.length}</div> {/* Dynamically show count */}
                  <p className="text-xs text-muted-foreground">+2 from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Automations</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{automations.filter(a => a.isRunning()).length}</div> {/* Dynamically show count */}
                  <p className="text-xs text-muted-foreground">+3 from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Service Health</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">98%</div>
                  <p className="text-xs text-muted-foreground">1 service with issues</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saved Credentials</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">Across 12 services</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Service Usage</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ServiceUsageChart />
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Automations</CardTitle>
                  <CardDescription>Your recent service automations and their status</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentAutomations />
                </CardContent>
              </Card>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-4">Service Categories</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link href="/services/communication" className="block">
                  <Card className="h-full transition-all hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Communication
                      </CardTitle>
                      <CardDescription>VOIP, SIP, and messaging services</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center">
                      <div className="text-2xl font-bold">3</div>
                      <Button variant="ghost" size="sm">
                        View <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/services/web" className="block">
                  <Card className="h-full transition-all hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Web Infrastructure
                      </CardTitle>
                      <CardDescription>Domains, hosting, and deployment</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center">
                      <div className="text-2xl font-bold">4</div>
                      <Button variant="ghost" size="sm">
                        View <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/services/compute" className="block">
                  <Card className="h-full transition-all hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Computing & Storage
                      </CardTitle>
                      <CardDescription>Compute, databases, and storage</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center">
                      <div className="text-2xl font-bold">2</div>
                      <Button variant="ghost" size="sm">
                        View <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-4">Service Alerts</h2>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-500">
                    <AlertCircle className="h-5 w-5" />
                    Service Limit Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <p className="font-medium">Free Hosting Service A</p>
                        <p className="text-sm text-muted-foreground">Approaching 90% of monthly bandwidth limit</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Free AI Inference Provider B</p>
                        <p className="text-sm text-muted-foreground">5 API calls remaining for this month</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="services" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">Your Services</h2>
              <Link href="/services/add">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => ( // Dynamically render services
                <ServiceCard
                  key={service.id}
                  title={service.name}
                  category={service.category}
                  icon={<MessageSquare className="h-5 w-5" />} // Placeholder icon, would need mapping
                  status={service.config.isActive ? "active" : "inactive"} // Basic status mapping
                  usagePercent={service.config.usage.monthlyRequestsUsed ? (service.config.usage.monthlyRequestsUsed / (service.config.limits.monthlyRequests || 1)) * 100 : 0} // Example usage calculation
                  lastUsed={service.config.lastUsed ? service.config.lastUsed.toLocaleTimeString() : "N/A"}
                />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="automations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">Your Automations</h2>
              <Link href="/automations/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Automation
                </Button>
              </Link>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Active Automations</CardTitle>
                <CardDescription>Your currently active service automations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {automations.map((automation) => ( // Dynamically render automations
                    <div key={automation.id} className="flex items-center justify-between border-b pb-4">
                      <div>
                        <p className="font-medium">{automation.name}</p>
                        <p className="text-sm text-muted-foreground">{automation.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex h-2 w-2 rounded-full ${automation.isRunning() ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs">{automation.isRunning() ? "Running" : "Stopped"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Usage Overview</CardTitle>
                <CardDescription>Monitor your usage across all connected services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">Communication Services</h3>
                      <span className="text-sm text-muted-foreground">3/3 services active</span>
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Free VOIP Service</span>
                          <span>45%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: "45%" }}></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Free SIP Provider</span>
                          <span>22%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: "22%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">Web Infrastructure</h3>
                      <span className="text-sm text-muted-foreground">3/4 services active</span>
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Free Subdomain Service</span>
                          <span>10%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: "10%" }}></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Static Hosting Platform</span>
                          <span>90%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-amber-500" style={{ width: "90%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">AI & ML Services</h3>
                      <span className="text-sm text-muted-foreground">2/2 services active</span>
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Free AI Inference API</span>
                          <span>95%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-red-500" style={{ width: "95%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="orchestration" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">Orchestration Tasks</h2>
              <div className="flex gap-2">
                <Button onClick={handleAutoRegister} disabled={!isInitialized}>
                  <Zap className="mr-2 h-4 w-4" />
                  Auto-Register Services
                </Button>
                <Button variant="outline" onClick={async () => {
                  const task = await orchestrator.createBulkRegistrationTask(['protonmail', 'mega'], 2);
                  setOrchestrationTasks(orchestrator.getAllTasks());
                }}>
                  <Database className="mr-2 h-4 w-4" />
                  Bulk Register
                </Button>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orchestrationTasks.filter(t => t.status === 'running').length}</div>
                  <p className="text-xs text-muted-foreground">Currently processing</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orchestrationTasks.filter(t => t.status === 'completed').length}</div>
                  <p className="text-xs text-muted-foreground">Successfully finished</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {orchestrationTasks.length > 0 
                      ? Math.round((orchestrationTasks.filter(t => t.status === 'completed').length / orchestrationTasks.length) * 100)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Task completion rate</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Orchestration Tasks</CardTitle>
                <CardDescription>Monitor your automated service registration and management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orchestrationTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No orchestration tasks yet</p>
                      <p className="text-sm">Click "Auto-Register Services" to get started</p>
                    </div>
                  ) : (
                    orchestrationTasks.slice(0, 10).map((task) => (
                      <div key={task.id} className="flex items-center justify-between border-b pb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{task.name}</p>
                            <div className={`flex h-2 w-2 rounded-full ${
                              task.status === 'running' ? 'bg-blue-500' :
                              task.status === 'completed' ? 'bg-green-500' :
                              task.status === 'failed' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {task.type.replace('_', ' ').toUpperCase()} • {task.services.length} services
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="text-xs text-muted-foreground">
                              Progress: {task.progress}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Results: {task.results.filter(r => r.success).length}/{task.results.length} successful
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs capitalize px-2 py-1 rounded-full bg-muted">
                            {task.status}
                          </span>
                          {task.status === 'running' && (
                            <Button variant="outline" size="sm" onClick={() => orchestrator.pauseTask(task.id)}>
                              Pause
                            </Button>
                          )}
                          {task.status === 'paused' && (
                            <Button variant="outline" size="sm" onClick={() => orchestrator.resumeTask(task.id)}>
                              Resume
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Services for Auto-Registration</CardTitle>
                <CardDescription>Services that can be automatically registered</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-5 w-5" />
                      <h3 className="font-medium">ProtonMail</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Secure email service with 500MB free storage
                    </p>
                    <Button size="sm" className="w-full" onClick={async () => {
                      const task = await orchestrator.createAutoRegistrationTask(['protonmail']);
                      setOrchestrationTasks(orchestrator.getAllTasks());
                    }}>
                      Auto-Register
                    </Button>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-5 w-5" />
                      <h3 className="font-medium">MEGA</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Cloud storage with 20GB free space
                    </p>
                    <Button size="sm" className="w-full" onClick={async () => {
                      const task = await orchestrator.createAutoRegistrationTask(['mega']);
                      setOrchestrationTasks(orchestrator.getAllTasks());
                    }}>
                      Auto-Register
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-5 w-5" />
                      <h3 className="font-medium">Multiple Services</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Register multiple services at once
                    </p>
                    <Button size="sm" className="w-full" onClick={handleAutoRegister}>
                      Bulk Register
                    </Button>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DashboardShell>
    </div>
  )
}
