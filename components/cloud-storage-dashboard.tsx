'use client';

import React, { useState, useEffect } from 'react';
import { UnifiedFile } from '../lib/cloud-storage-aggregator';
import { toast } from 'sonner'; // Assuming toast notifications are used

interface StorageProvider {
  name: string;
  used: number;
  total: number;
  available: number;
}

interface UploadResult {
  success: boolean;
  provider: string;
  fileId: string;
  url?: string;
}

interface SearchFileResult {
  success: boolean;
  files: UnifiedFile[];
}

interface QuotaResult {
  success: boolean;
  quotas: { [provider: string]: StorageProvider };
}

interface RebalanceResult {
  success: boolean;
  results: any[];
}

interface CloudStorageDashboardProps {
  onFileSelect?: (file: UnifiedFile) => void;
}

const CloudStorageDashboard: React.FC<CloudStorageDashboardProps> = ({ onFileSelect }) => {
  const [providers, setProviders] = useState<StorageProvider[]>([]);
  const [files, setFiles] = useState<UnifiedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<UnifiedFile | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'providers' | 'backup'>('files');
  const [backupProviders, setBackupProviders] = useState<string[]>([]);

  useEffect(() => {
    refreshData();
  }, [searchQuery]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Fetch quota data from API
      const quotaResponse = await fetch(`/api/cloud-storage?action=quota`);
      const quotaData: QuotaResult = await quotaResponse.json();
      
      if (quotaData.success) {
        setProviders(Object.values(quotaData.quotas));
      }

      // Fetch files from API
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const filesResponse = await fetch(`/api/cloud-storage?action=files${searchParam}`);
      const filesData: SearchFileResult = await filesResponse.json();
      
      if (filesData.success) {
        setFiles(filesData.files);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);

    try {
      const response = await fetch(`/api/cloud-storage?action=upload`, {
        method: 'POST',
        body: formData,
      });

      const result: { success: boolean; result: UploadResult } = await response.json();

      if (result.success) {
        setUploadProgress(100);
        toast.success(`File uploaded to ${result.result.provider}`);
        setTimeout(() => {
          refreshData();
          setIsUploading(false);
          setShowUploadModal(false);
        }, 1000);
      } else {
        console.error('Upload failed:', result);
        toast.error('Upload failed');
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload error');
      setIsUploading(false);
    }
  };

  const handleFileClick = (file: UnifiedFile) => {
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
    setShowFileDetails(true);
  };

  const handleDownload = async (fileId: string, provider: string) => {
    try {
      // This would typically initiate a download
      toast.info(`Download initiated for file from ${provider}`, { 
        description: `File ID: ${fileId}` 
      });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    }
  };

  const handleDelete = async (fileId: string, provider: string) => {
    if (!window.confirm(`Are you sure you want to delete this file from ${provider}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/cloud-storage/file/${fileId}?provider=${provider}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('File deleted successfully');
        refreshData();
      } else {
        toast.error('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Delete failed');
    }
  };

  const handleRebalance = async () => {
    try {
      const response = await fetch(`/api/cloud-storage?action=rebalance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const result: RebalanceResult = await response.json();

      if (result.success) {
        toast.success('Storage rebalanced successfully');
        refreshData();
      } else {
        toast.error('Rebalance failed');
      }
    } catch (error) {
      console.error('Rebalance error:', error);
      toast.error('Rebalance failed');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProviderIcon = (provider: string): string => {
    switch (provider.toLowerCase()) {
      case 'dropbox':
        return '📦';
      case 'googledrive':
      case 'google drive':
        return '☁️';
      case 'mega':
        return '💎';
      default:
        return '📁';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Frankenstein Cloud Storage</h1>
      
      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'files'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('files')}
        >
          Files
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
            activeTab === 'backup'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('backup')}
        >
          Backup & Rebalance
        </button>
      </div>

      {activeTab === 'files' && (
        <div className="space-y-6">
          {/* Storage Quotas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providers.map((provider) => {
              const usedPercentage = provider.total > 0 ? (provider.used / provider.total) * 100 : 0;
              const isNearLimit = usedPercentage > 80;
              
              return (
                <div key={provider.name} className={`p-4 rounded-lg shadow ${isNearLimit ? 'bg-red-50 border border-red-200' : 'bg-white'}`}>
                  <div className="flex items-center mb-2">
                    <span className="text-xl mr-2">{getProviderIcon(provider.name)}</span>
                    <h3 className="font-semibold">{provider.name}</h3>
                  </div>
                  <div className="mb-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${isNearLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, usedPercentage)}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatBytes(provider.used)} / {formatBytes(provider.total)}
                    {isNearLimit && ' ⚠️ Near limit!'}
                  </p>
                </div>
              );
            })}
          </div>
          
          {/* Search and Upload */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-grow">
              <input
                type="text"
                placeholder="Search files across all providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
            >
              Upload File
            </button>
          </div>
          
          {/* Files List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Providers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modified</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Loading files...
                      </td>
                    </tr>
                  ) : files.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        {searchQuery ? `No files found matching "${searchQuery}"` : 'No files found. Upload some files to get started.'}
                      </td>
                    </tr>
                  ) : (
                    files.map((file) => (
                      <tr 
                        key={file.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${selectedFile?.id === file.id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-lg mr-3">📄</span>
                            <div className="text-sm font-medium text-gray-900">{file.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatBytes(file.size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {file.providers.map(provider => (
                              <span 
                                key={provider} 
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {getProviderIcon(provider)} {provider}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.modified.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => handleDownload(file.id.split(':')[1], file.providers[0])}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Download
                          </button>
                          <button 
                            onClick={() => handleFileClick(file)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Details
                          </button>
                          <button 
                            onClick={() => handleDelete(file.id.split(':')[1], file.providers[0])}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providers.map((provider) => {
              const usedPercentage = provider.total > 0 ? (provider.used / provider.total) * 100 : 0;
              const isNearLimit = usedPercentage > 80;
              
              return (
                <div key={provider.name} className="p-6 rounded-lg shadow bg-white">
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-3">{getProviderIcon(provider.name)}</span>
                    <h3 className="text-xl font-semibold">{provider.name}</h3>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Usage</span>
                      <span>{formatBytes(provider.used)} / {formatBytes(provider.total)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${isNearLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, usedPercentage)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Available:</span>
                    <span>{formatBytes(provider.available)}</span>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <button className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">
                      Manage
                    </button>
                    <button className="text-xs bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded">
                      Settings
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="p-6 rounded-lg shadow bg-white">
            <h3 className="text-xl font-semibold mb-4">Backup & Rebalance Options</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Providers for Backup
                </label>
                <div className="flex flex-wrap gap-2">
                  {providers.map(provider => (
                    <label key={provider.name} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        checked={backupProviders.includes(provider.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBackupProviders([...backupProviders, provider.name]);
                          } else {
                            setBackupProviders(backupProviders.filter(p => p !== provider.name));
                          }
                        }}
                      />
                      <span className="ml-2">{provider.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={handleRebalance}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition-colors"
                >
                  Rebalance Storage
                </button>
                
                <button 
                  className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors"
                >
                  Run Backup Now
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6 rounded-lg shadow bg-white">
            <h3 className="text-xl font-semibold mb-4">Automatic Backup Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Backup Frequency
                </label>
                <select className="w-full p-2 border border-gray-300 rounded-md">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rebalance Threshold (%)
                </label>
                <input
                  type="number"
                  min="50"
                  max="95"
                  defaultValue="80"
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Upload File</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select file to upload
              </label>
              <input
                type="file"
                className="w-full p-2 border border-gray-300 rounded-md"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload to specific provider (optional)
              </label>
              <select className="w-full p-2 border border-gray-300 rounded-md">
                <option value="">Auto-select best provider</option>
                {providers.map(provider => (
                  <option key={provider.name} value={provider.name}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            
            {isUploading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">Uploading file...</p>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={() => document.querySelector('input[type="file"]')?.dispatchEvent(new Event('change', { bubbles: true }))}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Details Modal */}
      {showFileDetails && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">File Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="text-sm font-medium">{selectedFile.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Size</p>
                <p className="text-sm font-medium">{formatBytes(selectedFile.size)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Modified</p>
                <p className="text-sm font-medium">{selectedFile.modified.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">MIME Type</p>
                <p className="text-sm font-medium">{selectedFile.mimeType}</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Available on providers</p>
              <div className="flex flex-wrap gap-2">
                {selectedFile.providers.map(provider => (
                  <span 
                    key={provider} 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {getProviderIcon(provider)} {provider}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">File Locations</p>
              <div className="space-y-2">
                {Object.entries(selectedFile.locations).map(([provider, fileId]) => (
                  <div key={provider} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>{provider}: {fileId.substring(0, 10)}...</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDownload(fileId, provider)}
                        className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded"
                      >
                        Download
                      </button>
                      <button 
                        onClick={() => handleDelete(fileId, provider)}
                        className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowFileDetails(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudStorageDashboard;