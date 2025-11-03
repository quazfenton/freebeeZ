import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { HardDrive, Cloud, Upload, Download, Settings, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface FrankensteinServiceCardProps {
  status?: 'connected' | 'disconnected' | 'warning' | 'error';
  totalUsed?: number;
  totalSpace?: number;
  connectedProviders?: number;
  totalProviders?: number;
}

export function FrankensteinServiceCard({
  status = 'disconnected',
  totalUsed = 0,
  totalSpace = 50, // 50GB total from all providers
  connectedProviders = 0,
  totalProviders = 3
}: FrankensteinServiceCardProps) {
  const usagePercent = totalSpace > 0 ? (totalUsed / totalSpace) * 100 : 0;
  
  const statusColors = {
    connected: 'bg-green-100 text-green-800',
    disconnected: 'bg-gray-100 text-gray-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  };
  
  const statusIcons = {
    connected: <CheckCircle className="h-5 w-5 text-green-500" />,
    disconnected: <Cloud className="h-5 w-5 text-gray-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    error: <AlertTriangle className="h-5 w-5 text-red-500" />
  };

  return (
    <Card className="h-full transition-all hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {statusIcons[status]}
          Frankenstein Cloud Storage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Storage Usage</span>
            <span>{totalUsed.toFixed(1)}GB / {totalSpace.toFixed(1)}GB</span>
          </div>
          <Progress value={usagePercent} className="w-full" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Providers:</span>
          <Badge variant="secondary">{connectedProviders}/{totalProviders} connected</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Unified storage from multiple cloud providers with intelligent backup and space management
        </p>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex w-full space-x-2">
          <Link href="/cloud-storage" className="flex-1">
            <Button 
              variant={status === 'connected' ? "outline" : "default"} 
              className="w-full"
            >
              {status === 'connected' ? 'Manage' : 'Connect'}
            </Button>
          </Link>
          <Link href="/cloud-storage#settings">
            <Button 
              variant="outline" 
              size="icon"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="secondary" className="text-xs">Storage</Badge>
          <Badge variant="secondary" className="text-xs">Backup</Badge>
          <Badge variant="secondary" className="text-xs">Multi-Cloud</Badge>
        </div>
      </CardFooter>
    </Card>
  );
}