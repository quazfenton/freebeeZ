'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Cloud, 
  Upload, 
  Download, 
  RotateCcw, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  File,
  Folder,
  Play,
  Pause,
  Trash,
  Plus,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';

interface StorageProviderConfig {
  id: string;
  name: string;
  connected: boolean;
  used: number;
  total: number;
  token?: string;
  status: 'idle' | 'connected' | 'error';
}

interface FrankensteinAutomationProps {
  onStatusChange?: (status: string) => void;
}

export function FrankensteinStorageAutomation({ onStatusChange }: FrankensteinAutomationProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [providers, setProviders] = useState<StorageProviderConfig[]>([
    { 
      id: 'dropbox',
      name: 'Dropbox', 
      connected: false, 
      used: 0, 
      total: 15360, // 15GB in MB 
      status: 'idle'
    },
    { 
      id: 'googledrive',
      name: 'Google Drive', 
      connected: false, 
      used: 0, 
      total: 15360, // 15GB in MB
      status: 'idle'
    },
    { 
      id: 'mega',
      name: 'MEGA', 
      connected: false, 
      used: 0, 
      total: 20480, // 20GB in MB
      status: 'idle'
    }
  ]);
  const [backupStrategy, setBackupStrategy] = useState('space-based');
  const [rebalancingThreshold, setRebalancingThreshold] = useState(80);
  const [activeTab, setActiveTab] = useState('config');
  const [newProvider, setNewProvider] = useState({ name: '', token: '' });
  const [tasks, setTasks] = useState([
    { id: '1', name: 'Daily Backup', schedule: 'Every day at 2:00 AM', enabled: true },
    { id: '2', name: 'Weekly Rebalance', schedule: 'Every Sunday at 3:00 AM', enabled: true },
    { id: '3', name: 'Low Storage Alert', schedule: 'When any provider > 90%', enabled: true }
  ]);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  const connectProvider = async (id: string, token: string) => {
    try {
      // In a real implementation, this would connect to the provider
      // For now, simulate the connection
      setProviders(prev => 
        prev.map(p => 
          p.id === id ? { ...p, connected: true, token, status: 'connected' } : p
        )
      );
      
      toast.success(`${providers.find(p => p.id === id)?.name} connected successfully!`);
    } catch (error) {
      setProviders(prev => 
        prev.map(p => 
          p.id === id ? { ...p, connected: false, status: 'error' } : p
        )
      );
      toast.error(`Failed to connect ${providers.find(p => p.id === id)?.name}`);
    }
  };

  const disconnectProvider = async (id: string) => {
    try {
      setProviders(prev => 
        prev.map(p => 
          p.id === id ? { ...p, connected: false, token: undefined, status: 'idle' } : p
        )
      );
      toast.info(`${providers.find(p => p.id === id)?.name} disconnected`);
    } catch (error) {
      toast.error('Failed to disconnect provider');
    }
  };

  const startAutomation = async () => {
    if (!providers.some(p => p.connected)) {
      toast.error('Please connect at least one provider before starting automation');
      setStatus('error');
      return;
    }

    setIsRunning(true);
    setStatus('running');
    setProgress(0);

    try {
      // Simulate the Frankenstein storage automation process
      for (let i = 0; i <= 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setProgress((i / 10) * 100);
      }

      setStatus('completed');
      toast.success('Automation completed successfully!');
    } catch (error) {
      setStatus('error');
      toast.error('Automation failed');
    } finally {
      setIsRunning(false);
    }
  };

  const runRebalancing = async () => {
    if (!providers.some(p => p.connected)) {
      toast.error('Please connect at least one provider before rebalancing');
      setStatus('error');
      return;
    }

    setIsRunning(true);
    setStatus('running');
    setProgress(0);

    try {
      // Simulate rebalancing process
      for (let i = 0; i <= 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress((i / 15) * 100);
      }

      setStatus('completed');
      toast.success('Storage rebalancing completed successfully!');
    } catch (error) {
      setStatus('error');
      toast.error('Rebalancing failed');
    } finally {
      setIsRunning(false);
    }
  };

  const addProvider = () => {
    if (!newProvider.name.trim() || !newProvider.token.trim()) {
      toast.error('Please provide both name and token');
      return;
    }

    const newProviderObj: StorageProviderConfig = {
      id: newProvider.name.toLowerCase().replace(/\s+/g, '-'),
      name: newProvider.name,
      connected: false,
      used: 0,
      total: 10240, // 10GB default
      status: 'idle'
    };

    setProviders([...providers, newProviderObj]);
    setNewProvider({ name: '', token: '' });
    toast.success(`${newProvider.name} added to providers list`);
  };

  const removeProvider = (id: string) => {
    setProviders(providers.filter(p => p.id !== id));
    toast.info('Provider removed');
  };

  const totalUsed = providers.reduce((sum, p) => sum + p.used, 0);
  const totalAvailable = providers.reduce((sum, p) => sum + (p.total - p.used), 0);
  const totalSpace = providers.reduce((sum, p) => sum + p.total, 0);
  const connectedProviders = providers.filter(p => p.connected).length;

  return (
    <div className="space-y-6">
      {/* Automation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Frankenstein Cloud Storage Automation
          </CardTitle>
          <CardDescription>
            Unified storage automation across multiple providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              onClick={startAutomation} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Automation
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={runRebalancing} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Rebalance Storage
            </Button>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  progress === 100 ? 'bg-green-500' : 
                  status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {status !== 'idle' && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
              {status === 'running' && (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm">Automation running...</span>
                </>
              )}
              {status === 'completed' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Automation completed successfully!</span>
                </>
              )}
              {status === 'error' && (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Error occurred during automation</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for configuration */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'config'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('config')}
        >
          Configuration
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'providers'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('providers')}
        >
          Providers
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'tasks'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('tasks')}
        >
          Automation Tasks
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'dashboard'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('dashboard')}
        >
          Storage Dashboard
        </button>
      </div>

      {activeTab === 'config' && (
        <Card>
          <CardHeader>
            <CardTitle>Automation Configuration</CardTitle>
            <CardDescription>
              Configure how the Frankenstein storage system operates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Backup Strategy</Label>
                  <Select value={backupStrategy} onValueChange={setBackupStrategy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="space-based">Space-Based (Default)</SelectItem>
                      <SelectItem value="all-providers">All Providers</SelectItem>
                      <SelectItem value="rotate">Rotate Between Providers</SelectItem>
                      <SelectItem value="priority">Priority-Based</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How files are distributed across connected providers
                  </p>
                </div>

                <div>
                  <Label>Rebalancing Threshold (%)</Label>
                  <Input
                    type="number"
                    min="50"
                    max="95"
                    value={rebalancingThreshold}
                    onChange={(e) => setRebalancingThreshold(Number(e.target.value))}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    When a provider reaches this percentage, files will be moved to other providers
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Primary Provider</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers
                        .filter(p => p.connected)
                        .map(provider => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Secondary Provider</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers
                        .filter(p => p.connected)
                        .map(provider => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tertiary Provider</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers
                        .filter(p => p.connected)
                        .map(provider => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2">Connected Providers</h3>
              <div className="flex flex-wrap gap-2">
                {providers
                  .filter(p => p.connected)
                  .map(provider => (
                    <Badge key={provider.id} variant="secondary" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {provider.name}
                    </Badge>
                  ))}
                {connectedProviders === 0 && (
                  <p className="text-sm text-muted-foreground">No providers connected yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'providers' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Provider</CardTitle>
              <CardDescription>
                Connect additional cloud storage providers to your Frankenstein system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Provider name (e.g. OneDrive, iCloud)"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({...newProvider, name: e.target.value})}
                  className="flex-1"
                />
                <Input
                  type="password"
                  placeholder="API Token/Key"
                  value={newProvider.token}
                  onChange={(e) => setNewProvider({...newProvider, token: e.target.value})}
                  className="flex-1"
                />
                <Button onClick={addProvider} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connected Providers</CardTitle>
              <CardDescription>
                Manage your connected cloud storage providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <HardDrive className="h-5 w-5 text-blue-500" />
                      <div>
                        <h3 className="font-medium">{provider.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {provider.connected 
                            ? `${(provider.used / 1024).toFixed(2)}GB / ${(provider.total / 1024).toFixed(2)}GB` 
                            : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {provider.connected ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Connected
                        </Badge>
                      ) : (
                        <>
                          <Input
                            type="password"
                            placeholder="API Token"
                            className="w-40"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                connectProvider(provider.id, (e.target as HTMLInputElement).value);
                              }
                            }}
                          />
                          <Button 
                            size="sm" 
                            onClick={() => {
                              const input = document.querySelector(`input[placeholder="API Token"][value=""]`) as HTMLInputElement;
                              if (input) connectProvider(provider.id, input.value);
                            }}
                          >
                            Connect
                          </Button>
                        </>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => disconnectProvider(provider.id)}
                      >
                        Disconnect
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => removeProvider(provider.id)}
                        className="text-red-500"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'tasks' && (
        <Card>
          <CardHeader>
            <CardTitle>Automation Tasks</CardTitle>
            <CardDescription>
              Schedule and manage automated storage tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{task.name}</h3>
                    <p className="text-sm text-muted-foreground">{task.schedule}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant={task.enabled ? "default" : "outline"}
                      onClick={() => setTasks(tasks.map(t => 
                        t.id === task.id ? {...t, enabled: !t.enabled} : t
                      ))}
                    >
                      {task.enabled ? 'Active' : 'Inactive'}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 flex justify-end">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'dashboard' && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Dashboard</CardTitle>
            <CardDescription>
              Overview of your unified storage space
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <File className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium">Total Used</h3>
                </div>
                <p className="text-2xl font-bold">{(totalUsed / 1024).toFixed(2)} GB</p>
                <p className="text-xs text-muted-foreground">
                  of {(totalSpace / 1024).toFixed(2)} GB
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Folder className="h-5 w-5 text-green-500" />
                  <h3 className="font-medium">Available</h3>
                </div>
                <p className="text-2xl font-bold">{(totalAvailable / 1024).toFixed(2)} GB</p>
                <p className="text-xs text-muted-foreground">
                  Free space across providers
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  <h3 className="font-medium">Providers</h3>
                </div>
                <p className="text-2xl font-bold">{connectedProviders}/{providers.length}</p>
                <p className="text-xs text-muted-foreground">
                  Connected services
                </p>
              </div>
            </div>
            
            {/* Provider usage bars */}
            <div className="space-y-3">
              {providers.map((provider) => {
                const usagePercent = provider.total > 0 ? (provider.used / provider.total) * 100 : 0;
                return (
                  <div key={provider.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{provider.name}</span>
                      <span>
                        {(provider.used / 1024).toFixed(2)}GB / {(provider.total / 1024).toFixed(2)}GB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          usagePercent > 90 
                            ? 'bg-red-500' 
                            : usagePercent > 75 
                              ? 'bg-yellow-500' 
                              : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, usagePercent)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium mb-2">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Bulk Download
                </Button>
                <Button variant="outline" size="sm">
                  <Trash className="h-4 w-4 mr-2" />
                  Cleanup
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}