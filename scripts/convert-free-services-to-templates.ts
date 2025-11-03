#!/usr/bin/env ts-node
/*
  Script: convert-free-services-to-templates.ts
  Purpose: Convert aggregated FreeService entries to ServiceTemplate skeletons for registration
  Safe: Non-destructive; creates data/generated-templates.json for import by ServiceDiscoveryEngine
*/

import path from 'path';
import fs from 'fs';
import { FreeService } from '../lib/free-service-aggregator/types';
import { ServiceTemplate, ServiceCategory } from '../lib/service-discovery';

// Mapping from FreeServiceCategory to ServiceCategory
const CATEGORY_MAPPING: Record<string, ServiceCategory> = {
  'communication': ServiceCategory.COMMUNICATION,
  'web_infrastructure': ServiceCategory.WEB_INFRASTRUCTURE,
  'computing_storage': ServiceCategory.COMPUTING_STORAGE,
  'ai_ml': ServiceCategory.AI_ML,
  'developer_tools': ServiceCategory.DEVELOPER_TOOLS,
  'security': ServiceCategory.SECURITY,
  'utilities': ServiceCategory.UTILITIES,
  'other': ServiceCategory.UTILITIES
};

// Heuristic function to determine service category from tags/description
function inferCategory(service: FreeService): ServiceCategory {
  const description = (service.description || '').toLowerCase();
  const tags = (service.tags || []).map(tag => tag.toLowerCase());
  const lowerName = service.name.toLowerCase();

  // Check tags first
  if (tags.includes('email') || tags.includes('communication') || tags.includes('messaging')) {
    return ServiceCategory.COMMUNICATION;
  }
  if (tags.includes('storage') || tags.includes('cloud') || tags.includes('database')) {
    return ServiceCategory.COMPUTING_STORAGE;
  }
  if (tags.includes('ai') || tags.includes('ml') || tags.includes('machine-learning')) {
    return ServiceCategory.AI_ML;
  }
  if (tags.includes('web') || tags.includes('hosting') || tags.includes('vps')) {
    return ServiceCategory.WEB_INFRASTRUCTURE;
  }

  // Check name and description
  if (lowerName.includes('mail') || description.includes('email') || description.includes('messaging')) {
    return ServiceCategory.COMMUNICATION;
  }
  if (lowerName.includes('storage') || lowerName.includes('drive') || 
      description.includes('storage') || description.includes('drive')) {
    return ServiceCategory.COMPUTING_STORAGE;
  }
  if (lowerName.includes('ai') || lowerName.includes('ml') || 
      description.includes('ai') || description.includes('ml') || description.includes('artificial intelligence')) {
    return ServiceCategory.AI_ML;
  }
  if (lowerName.includes('host') || lowerName.includes('web') || 
      description.includes('hosting') || description.includes('website')) {
    return ServiceCategory.WEB_INFRASTRUCTURE;
  }

  // Use the explicit category if available, otherwise default to utilities
  return CATEGORY_MAPPING[service.category || 'other'];
}

// Heuristic function to determine if a service requires email verification
function requiresEmailVerification(service: FreeService): boolean {
  const name = service.name.toLowerCase();
  const description = (service.description || '').toLowerCase();
  
  return name.includes('email') || 
         name.includes('mail') || 
         description.includes('email verification') || 
         description.includes('email confirm') ||
         name.includes('gmail') ||
         name.includes('outlook') ||
         name.includes('yahoo');
}

// Heuristic function to determine if a service requires phone verification
function requiresPhoneVerification(service: FreeService): boolean {
  const name = service.name.toLowerCase();
  const description = (service.description || '').toLowerCase();
  
  return description.includes('phone') || 
         description.includes('sms verification') || 
         description.includes('mobile verification');
}

// Heuristic function to determine if a service likely has CAPTCHA
function likelyHasCaptcha(service: FreeService): 'recaptcha' | 'hcaptcha' | 'cloudflare' | undefined {
  const name = service.name.toLowerCase();
  const description = (service.description || '').toLowerCase();
  
  if (name.includes('google') || description.includes('google')) {
    return 'recaptcha';
  }
  if (name.includes('hcaptcha') || description.includes('hcaptcha')) {
    return 'hcaptcha';
  }
  if (name.includes('cloudflare') || description.includes('cloudflare')) {
    return 'cloudflare';
  }
  
  // Common services that typically have CAPTCHAs
  const captchaServices = [
    'github', 'twitter', 'facebook', 'reddit', 'tiktok', 'discord', 
    'telegram', 'protonmail', 'duckduckgo', 'openai'
  ];
  
  for (const serviceName of captchaServices) {
    if (name.includes(serviceName)) {
      return 'recaptcha'; // Most likely type
    }
  }
  
  return undefined;
}

// Generate skeleton registration steps based on service name and category
function generateRegistrationSteps(service: FreeService): any[] {
  const steps = [
    {
      type: 'navigate',
      value: service.url,
      timeout: 30000
    }
  ];

  const name = service.name.toLowerCase();

  // Add steps based on service type
  if (name.includes('email') || name.includes('mail') || name.includes('gmail')) {
    // Email service registration steps
    steps.push(
      { type: 'fillForm', selector: 'input[name="email"], input[type="email"], #email, #username', value: '{{profile.email}}' },
      { type: 'fillForm', selector: 'input[name="password"], #password', value: '{{profile.password}}' },
      { type: 'fillForm', selector: 'input[name="confirm-password"], #confirm-password', value: '{{profile.password}}' },
      { type: 'click', selector: 'button[type="submit"], .submit, #submit' }
    );
  } else if (name.includes('github')) {
    steps.push(
      { type: 'fillForm', selector: 'input[name="user[login]"], #login_field', value: '{{profile.username}}' },
      { type: 'fillForm', selector: 'input[name="user[email]"], #email_field', value: '{{profile.email}}' },
      { type: 'fillForm', selector: 'input[name="user[password]"], #password', value: '{{profile.password}}' },
      { type: 'click', selector: 'button[type="submit"]' },
      { type: 'verifyEmail' }
    );
  } else if (name.includes('proton') && name.includes('mail')) {
    steps.push(
      { type: 'fillForm', selector: 'input[name="username"], #username', value: '{{profile.username}}' },
      { type: 'fillForm', selector: 'input[name="password"], #password', value: '{{profile.password}}' },
      { type: 'fillForm', selector: 'input[name="passwordConfirm"], #passwordConfirm', value: '{{profile.password}}' },
      { type: 'click', selector: 'button[type="submit"]' }
    );
  } else {
    // Generic registration steps
    steps.push(
      { type: 'fillForm', selector: 'input[name="email"], input[type="email"], #email', value: '{{profile.email}}' },
      { type: 'fillForm', selector: 'input[name="username"], #username', value: '{{profile.username}}' },
      { type: 'fillForm', selector: 'input[name="password"], #password', value: '{{profile.password}}' },
      { type: 'fillForm', selector: 'input[name="confirm-password"], #confirm-password', value: '{{profile.password}}' },
      { type: 'click', selector: 'button[type="submit"], .signup, .register' }
    );
  }

  // Add CAPTCHA solving if likely
  const captchaType = likelyHasCaptcha(service);
  if (captchaType) {
    steps.push({
      type: 'solveCaptcha',
      captchaType
    });
  }

  // Add email verification if required
  if (requiresEmailVerification(service)) {
    steps.push({
      type: 'verifyEmail'
    });
  }

  // Final screenshot
  steps.push({
    type: 'screenshot'
  });

  return steps;
}

function generateCredentialExtraction(service: FreeService): any {
  const name = service.name.toLowerCase();

  if (name.includes('email') || name.includes('mail')) {
    return {
      usernameSelector: 'input[name="email"], input[type="email"], #email, #username',
      passwordSelector: 'input[name="password"], #password',
      customExtractor: `async (page) => {
        // Extract email credentials after login
        const email = await page.$eval('input[name="email"], #email', el => el.value);
        const password = '{{profile.password}}'; // Password would need to be stored securely
        
        return { 
          username: email,
          password: password,
          email: email
        };
      }`
    };
  }

  // Generic extraction
  return {
    usernameSelector: 'input[name="username"], input[name="email"], #username, #email',
    passwordSelector: 'input[name="password"], #password',
    customExtractor: `async (page) => {
      // Generic credential extraction after service registration
      return { 
        username: '{{profile.username}}',
        password: '{{profile.password}}',
        email: '{{profile.email}}',
        apiKey: 'extracted_post_registration' // Would require post-registration API key generation
      };
    }`
  };
}

function generateServiceLimits(service: FreeService): any {
  const name = service.name.toLowerCase();
  const description = (service.description || '').toLowerCase();

  // Default limits
  let limits: any = {
    monthlyRequests: 10000,
    storageLimit: 500 * 1024 * 1024, // 500MB default
    bandwidthLimit: 1024 * 1024 * 1024 // 1GB default
  };

  // Adjust based on service type
  if (name.includes('storage') || name.includes('drive') || name.includes('file')) {
    limits.storageLimit = 10 * 1024 * 1024 * 1024; // 10GB for storage
    limits.bandwidthLimit = 10 * 1024 * 1024 * 1024; // 10GB
  } else if (name.includes('ai') || name.includes('ml') || name.includes('openai')) {
    limits.monthlyRequests = 1000; // AI services often have lower limits
    limits.features = ['API Access', 'Model Training', 'Inference'];
  } else if (name.includes('email') || name.includes('mail')) {
    limits.monthlyRequests = 1000; // Email API limits
    limits.storageLimit = 1024 * 1024 * 1024; // 1GB mailbox
  } else if (name.includes('host') || name.includes('web') || name.includes('vercel') || name.includes('netlify')) {
    limits.monthlyRequests = 100000;
    limits.bandwidthLimit = 100 * 1024 * 1024 * 1024; // 100GB for web hosting
    limits.features = ['Static Hosting', 'CDN', 'Serverless Functions'];
  }

  return limits;
}

function generateServiceFeatures(service: FreeService): string[] {
  const features: string[] = [];
  const name = service.name.toLowerCase();
  const description = (service.description || '').toLowerCase();
  const tags = service.tags || [];

  // Add features based on tags
  if (tags.includes('api')) features.push('API Access');
  if (tags.includes('storage')) features.push('Cloud Storage');
  if (tags.includes('email')) features.push('Email Service');
  if (tags.includes('hosting')) features.push('Web Hosting');
  if (tags.includes('ai') || tags.includes('ml')) features.push('AI/ML Capabilities');
  if (tags.includes('database')) features.push('Database Service');
  if (tags.includes('authentication')) features.push('Authentication Service');

  // Add features based on name
  if (name.includes('github') || name.includes('gitlab')) {
    features.push('Git Repository', 'Code Hosting', 'CI/CD');
  } else if (name.includes('netlify') || name.includes('vercel')) {
    features.push('Static Site Hosting', 'Serverless Functions', 'CDN');
  } else if (name.includes('supabase') || name.includes('planetscale')) {
    features.push('Database Service', 'Authentication', 'Realtime');
  } else if (name.includes('proton') && name.includes('mail')) {
    features.push('Encrypted Email', 'Calendar', 'VPN');
  } else if (name.includes('openai') || name.includes('anthropic')) {
    features.push('AI Models', 'Text Generation', 'API Access');
  } else if (name.includes('mega') || name.includes('pcloud')) {
    features.push('Cloud Storage', 'File Sync', 'Encryption');
  }

  if (features.length === 0) {
    features.push('Account Registration', 'Web Service');
  }

  // Remove duplicates
  return Array.from(new Set(features));
}

export async function convertToServiceTemplates(freeServices: FreeService[]): Promise<ServiceTemplate[]> {
  const templates: ServiceTemplate[] = [];

  for (const service of freeServices) {
    try {
      // Skip services with no usable URL
      if (!service.url || !service.url.startsWith('http')) {
        console.warn(`Skipping service ${service.name} with invalid URL: ${service.url}`);
        continue;
      }

      const template: ServiceTemplate = {
        id: service.id,
        name: service.name,
        category: inferCategory(service),
        baseUrl: service.url,
        signupUrl: service.url, // Often the same, but may need manual adjustment
        loginUrl: service.url.replace(/\/(signup|register|create)/i, '/login'), // Heuristic
        registrationSteps: generateRegistrationSteps(service),
        credentialExtraction: generateCredentialExtraction(service),
        limits: generateServiceLimits(service),
        features: generateServiceFeatures(service),
        requiresEmailVerification: requiresEmailVerification(service),
        requiresPhoneVerification: requiresPhoneVerification(service),
        captchaType: likelyHasCaptcha(service),
        description: service.description || `Automatically generated template for ${service.name}. Requires manual review and adjustment.`
      };

      templates.push(template);
    } catch (error) {
      console.error(`Error converting service ${service.name}:`, error);
    }
  }

  return templates;
}

async function main() {
  const catalogPath = path.join(process.cwd(), 'data', 'free-services.json');
  const templatesPath = path.join(process.cwd(), 'data', 'generated-templates.json');

  console.log('Loading free services from', catalogPath);
  
  let freeServices: FreeService[] = [];
  try {
    const rawData = await fs.promises.readFile(catalogPath, 'utf8');
    freeServices = JSON.parse(rawData) as FreeService[];
  } catch (error) {
    console.error('Failed to load free services:', error);
    console.log('Ensure you run update-free-services.ts first to populate data/free-services.json');
    process.exit(1);
  }

  console.log(`Loaded ${freeServices.length} free services, converting to templates...`);

  const templates = await convertToServiceTemplates(freeServices);

  console.log(`Generated ${templates.length} service templates`);

  // Write templates to file
  await fs.promises.mkdir(path.dirname(templatesPath), { recursive: true });
  const sortedTemplates = templates.sort((a, b) => a.name.localeCompare(b.name));
  await fs.promises.writeFile(templatesPath, JSON.stringify(sortedTemplates, null, 2), 'utf8');

  console.log(`Wrote generated templates to ${templatesPath}`);

  // Print summary
  const categories = new Map<ServiceCategory, number>();
  templates.forEach(t => {
    const count = categories.get(t.category) || 0;
    categories.set(t.category, count + 1);
  });

  console.log('\nGenerated Templates by Category:');
  for (const [category, count] of categories) {
    console.log(`- ${category}: ${count} services`);
  }

  // Show a few examples
  console.log('\nExample templates (first 3):');
  for (let i = 0; i < Math.min(3, templates.length); i++) {
    console.log(`- ${templates[i].name} (${templates[i].category}): ${templates[i].features.length} features, requires${templates[i].requiresEmailVerification ? ' email' : ''}${templates[i].requiresPhoneVerification ? ' phone' : ''} verification`);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
}