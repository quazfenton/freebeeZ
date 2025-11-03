'use client';

import { useEffect, useState } from 'react';
import CloudStorageDashboard from '@/components/cloud-storage-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Download, 
  Search, 
  HardDrive, 
  RotateCcw, 
  Settings,
  File,
  Folder
} from 'lucide-react';

export default function CloudStoragePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [providers, setProviders] = useState([
    { id: 'dropbox', name: 'Dropbox', connected: false, quota: { used: 0, total: 15360 } }, // 15GB in MB
    { id: 'googledrive', name: 'Google Drive', connected: false, quota: { used: 0, total: 15360 } }, // 15GB in MB
    { id: 'mega', name: 'MEGA', connected: false, quota: { used: 0, total: 20480 } } // 20GB in MB
  ]);
  const [connectionData, setConnectionData] = useState({
    dropboxToken: '',
    googleDriveToken: '',
    megaSID: ''
  });
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectProvider = async (providerId: string) => {
    setIsConnecting(true);
    
    // Simulate connecting to provider
    setTimeout(() => {
      setProviders(prev => 
        prev.map(p => 
          p.id === providerId ? { ...p, connected: true } : p
        )
      );
      setIsConnecting(false);
    }, 1500);
  };

  const handleDisconnectProvider = (providerId: string) => {
    setProviders(prev => 
      prev.map(p => 
        p.id === providerId ? { ...p, connected: false } : p
      )
    );
  };

  const allConnected = providers.every(p => p.connected);
  const totalUsed = providers.reduce((sum, p) => sum + p.quota.used, 0);
  const totalAvailable = providers.reduce((sum, p) => sum + (p.quota.total - p.quota.used), 0);
  const totalSpace = providers.reduce((sum, p) => sum + p.quota.total, 0);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Frankenstein Cloud Storage</h1>
        <p className="text-muted-foreground mt-2">
          Unified storage from multiple providers with intelligent backup and space management
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage Providers
              </CardTitle>
              <CardDescription>
                Connect your cloud storage accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{provider.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {provider.connected 
                          ? `${(provider.quota.used / 1024).toFixed(2)}GB / ${(provider.quota.total / 1024).toFixed(2)}GB` 
                          : 'Not connected'}
                      </p>
                    </div>
                    {provider.connected ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDisconnectProvider(provider.id)}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleConnectProvider(provider.id)}
                        disabled={isConnecting}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total Used</span>
                    <span>{(totalUsed / 1024).toFixed(2)} GB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, (totalUsed / totalSpace) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{(totalAvailable / 1024).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Available (GB)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{(totalSpace / 1024).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Total (GB)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button size="sm" variant="outline">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Rebalance
                </Button>
                <Button size="sm" variant="outline">
                  <Search className="h-4 w-4 mr-1" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-2">
              <Button
                variant={activeTab === 'dashboard' ? 'default' : 'outline'}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant={activeTab === 'files' ? 'default' : 'outline'}
                onClick={() => setActiveTab('files')}
              >
                Files
              </Button>
              <Button
                variant={activeTab === 'backup' ? 'default' : 'outline'}
                onClick={() => setActiveTab('backup')}
              >
                Backup
              </Button>
              <Button
                variant={activeTab === 'settings' ? 'default' : 'outline'}
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
            
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Storage Overview</CardTitle>
                  <CardDescription>
                    Aggregate view of all connected storage providers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {providers.map((provider) => (
                      <div 
                        key={provider.id} 
                        className={`p-4 rounded-lg border ${
                          provider.connected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          <HardDrive className="h-5 w-5 mr-2 text-blue-500" />
                          <h3 className="font-semibold">{provider.name}</h3>
                          {provider.connected && (
                            <Badge variant="secondary" className="ml-2">Connected</Badge>
                          )}
                        </div>
                        <div className="mb-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                provider.quota.used / provider.quota.total > 0.8 
                                  ? 'bg-red-500' 
                                  : 'bg-blue-500'
                              }`}
                              style={{ 
                                width: `${Math.min(100, (provider.quota.used / provider.quota.total) * 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          {provider.connected 
                            ? `${(provider.quota.used / 1024).toFixed(1)}GB / ${(provider.quota.total / 1024).toFixed(1)}GB` 
                            : 'Not connected'}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Connected Providers</h3>
                    <div className="flex flex-wrap gap-2">
                      {providers
                        .filter(p => p.connected)
                        .map(provider => (
                          <Badge key={provider.id} variant="outline">
                            {provider.name}
                          </Badge>
                        ))}
                    </div>
                    {!allConnected && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Connect all providers to maximize your unified storage space.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <File className="h-4 w-4 mr-2 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm">document.pdf uploaded to Google Drive</p>
                        <p className="text-xs text-muted-foreground">2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Folder className="h-4 w-4 mr-2 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm">Backup completed successfully</p>
                        <p className="text-xs text-muted-foreground">1 hour ago</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <RotateCcw className="h-4 w-4 mr-2 text-purple-500" />
                      <div className="flex-1">
                        <p className="text-sm">Rebalanced files from Dropbox to MEGA</p>
                        <p className="text-xs text-muted-foreground">3 hours ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'files' && (
            <div>
              <div className="flex items-center mb-4">
                <Input 
                  placeholder="Search all connected storage..." 
                  className="max-w-sm mr-2"
                />
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Unified File Browser</CardTitle>
                  <CardDescription>
                    Browse and manage files across all connected providers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CloudStorageDashboard />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Backup Strategy</CardTitle>
                  <CardDescription>
                    Configure how and where your files are backed up
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Backup Strategy</Label>
                      <Select>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="space-based">Space-Based (default)</SelectItem>
                          <SelectItem value="all-providers">All Providers</SelectItem>
                          <SelectItem value="rotate">Rotate Between Providers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Primary Provider</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {providers.filter(p => p.connected).map(provider => (
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
                            {providers.filter(p => p.connected).map(provider => (
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
                            {providers.filter(p => p.connected).map(provider => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button>Save Backup Configuration</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Backup Status</CardTitle>
                  <CardDescription>
                    Overview of your current backup jobs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Documents Backup</p>
                        <p className="text-sm text-muted-foreground">Automatic, daily</p>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Photos Backup</p>
                        <p className="text-sm text-muted-foreground">Automatic, weekly</p>
                      </div>
                      <Badge variant="outline">Paused</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Provider Settings</CardTitle>
                  <CardDescription>
                    Manage API tokens and connection details for each provider
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-2">Dropbox</h3>
                      <div className="space-y-2">
                        <Label>Access Token</Label>
                        <Input 
                          type="password" 
                          placeholder="Enter Dropbox API token" 
                          value={connectionData.dropboxToken}
                          onChange={(e) => setConnectionData({...connectionData, dropboxToken: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Google Drive</h3>
                      <div className="space-y-2">
                        <Label>Access Token</Label>
                        <Input 
                          type="password" 
                          placeholder="Enter Google Drive API token" 
                          value={connectionData.googleDriveToken}
                          onChange={(e) => setConnectionData({...connectionData, googleDriveToken: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">MEGA</h3>
                      <div className="space-y-2">
                        <Label>Session ID</Label>
                        <Input 
                          type="password" 
                          placeholder="Enter MEGA session ID" 
                          value={connectionData.megaSID}
                          onChange={(e) => setConnectionData({...connectionData, megaSID: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <Button>Save Settings</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Rebalancing Settings</CardTitle>
                  <CardDescription>
                    Configure when and how storage is rebalanced
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Enable Automatic Rebalancing</Label>
                      <Button variant="outline" size="sm">Enable</Button>
                    </div>
                    
                    <div>
                      <Label>Rebalance Threshold</Label>
                      <Select>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select threshold" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="80">80% full</SelectItem>
                          <SelectItem value="85">85% full</SelectItem>
                          <SelectItem value="90">90% full</SelectItem>
                          <SelectItem value="95">95% full</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Rebalance Frequency</Label>
                      <Select>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}