import { CloudStorageAggregator, DropboxProvider, GoogleDriveProvider, MEGAProvider } from '../lib/cloud-storage-aggregator';

/**
 * Example usage of the Frankenstein Cloud Storage Aggregator
 * Demonstrates unified search, backup, and rotation across multiple cloud storage providers
 */
async function demonstrateFrankensteinStorage(): Promise<void> {
  console.log('🚀 Initializing Frankenstein Cloud Storage System...');
  
  // Initialize the aggregator
  const aggregator = new CloudStorageAggregator();
  
  // Create provider instances (using placeholders - in real usage, you'd provide actual tokens)
  const dropboxProvider = new DropboxProvider(process.env.DROPBOX_TOKEN);
  const googleDriveProvider = new GoogleDriveProvider(process.env.GOOGLE_DRIVE_TOKEN);
  const megaProvider = new MEGAProvider(process.env.MEGA_SID);
  
  // Register providers with the aggregator
  aggregator.addProvider('dropbox', dropboxProvider);
  aggregator.addProvider('googledrive', googleDriveProvider);
  aggregator.addProvider('mega', megaProvider);
  
  console.log('✅ Providers registered');
  
  try {
    // 1. Get aggregate storage quota across all providers
    console.log('\\n📊 Getting aggregate storage quota...');
    const quotas = await aggregator.getAggregateQuota();
    for (const [provider, quota] of Object.entries(quotas)) {
      const usedGB = (quota.used / (1024 ** 3)).toFixed(2);
      const totalGB = (quota.total / (1024 ** 3)).toFixed(2);
      const availableGB = (quota.available / (1024 ** 3)).toFixed(2);
      console.log(`  ${provider}: ${usedGB}GB / ${totalGB}GB (${availableGB}GB available)`);
    }
    
    // 2. Upload a file with automatic provider selection
    console.log('\\n💾 Uploading file with automatic provider selection...');
    const sampleFile = Buffer.from('This is a sample file for the Frankenstein cloud storage system demonstration.');
    const uploadResult = await aggregator.uploadFile(sampleFile, 'demo-file.txt');
    console.log(`  Uploaded to ${uploadResult.provider}, File ID: ${uploadResult.fileId}`);
    
    // 3. Perform intelligent backup across multiple providers
    console.log('\\n🔄 Performing intelligent backup...');
    const backupResult = await aggregator.backupFileToMultipleProviders(
      sampleFile,
      'demo-file.txt',
      ['dropbox', 'googledrive', 'mega'],
      'space-based'
    );
    console.log('  Backup results:');
    for (const result of backupResult) {
      console.log(`    ${result.provider}: ${result.success ? '✅ Success' : \\`❌ Failed - ${result.error}\\`}`);
    }
    
    // 4. Search for files across all providers
    console.log('\\n🔍 Searching for files...');
    const searchResults = await aggregator.searchFiles('demo');
    console.log(`  Found ${searchResults.length} files matching 'demo':`);
    for (const file of searchResults) {
      console.log(`    ${file.name} (${file.size} bytes) on ${file.providers.join(', ')}`);
    }
    
    // 5. Demonstrate space rebalancing
    console.log('\\n⚖️  Checking for space rebalancing...');
    const rebalanceResults = await aggregator.rebalanceStorage();
    console.log('  Rebalance results:');
    for (const result of rebalanceResults) {
      console.log(`    ${result.provider}: ${result.action} - ${JSON.stringify(result.result)}`);
    }
    
    // 6. List all files across providers
    console.log('\\n📋 Listing all files...');
    const allFiles = await aggregator.listAllFiles();
    console.log(`  Total files found: ${allFiles.length}`);
    for (const file of allFiles.slice(0, 5)) { // Show first 5
      console.log(`    ${file.name} (${file.size} bytes) on ${file.providers.join(', ')}`);
    }
    if (allFiles.length > 5) {
      console.log(`    ... and ${allFiles.length - 5} more files`);
    }
    
    console.log('\\n✨ Frankenstein Cloud Storage demonstration completed!');
  } catch (error) {
    console.error('❌ Error during demonstration:', error);
  }
}

/**
 * Advanced usage example showing backup strategies
 */
async function demonstrateBackupStrategies(): Promise<void> {
  console.log('\\n🛡️  Demonstrating Advanced Backup Strategies...');
  
  const aggregator = new CloudStorageAggregator();
  
  // Add providers (with mock implementations for this example)
  const dropboxProvider = new DropboxProvider('dummy-token');
  const googleDriveProvider = new GoogleDriveProvider('dummy-token');
  const megaProvider = new MEGAProvider('dummy-sid');
  
  aggregator.addProvider('dropbox', dropboxProvider);
  aggregator.addProvider('googledrive', googleDriveProvider);
  aggregator.addProvider('mega', megaProvider);
  
  const fileManager = aggregator['fileManager']; // Access private property for demo
  
  console.log('📦 Creating intelligent backup...');
  
  // Create a larger sample file
  const largeFile = Buffer.from('This is a larger sample file to demonstrate intelligent backup strategies across multiple cloud providers for the Frankenstein storage system.'.repeat(100));
  
  const backupResult = await fileManager.performIntelligentBackup(
    largeFile,
    'important-document.txt',
    'googledrive'
  );
  
  console.log(`  Primary provider: ${backupResult.primaryProvider}`);
  console.log(`  Backup providers: ${backupResult.backupProviders.join(', ')}`);
  console.log(`  Total storage locations: ${backupResult.files.length}`);
  
  for (const fileLocation of backupResult.files) {
    console.log(`    Stored on ${fileLocation.provider}: File ID ${fileLocation.fileId}`);
  }
  
  console.log('✅ Backup strategy demonstration completed!');
}

// Run the examples
if (require.main === module) {
  demonstrateFrankensteinStorage()
    .then(() => demonstrateBackupStrategies())
    .catch(console.error);
}

export { demonstrateFrankensteinStorage, demonstrateBackupStrategies };