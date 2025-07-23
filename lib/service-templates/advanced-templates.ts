// Advanced Service Templates for Real Free Services
import { ServiceTemplate, ServiceCategory, RegistrationStep, UserProfile } from '../service-discovery'

export const ADVANCED_SERVICE_TEMPLATES: ServiceTemplate[] = [
  // Email Services
  {
    id: 'protonmail',
    name: 'ProtonMail',
    category: ServiceCategory.COMMUNICATION,
    baseUrl: 'https://protonmail.com',
    signupUrl: 'https://account.proton.me/signup',
    loginUrl: 'https://account.proton.me/login',
    registrationSteps: [
      {
        type: 'navigate'
      },
      {
        type: 'fillForm',
        selector: 'input[name="username"]',
        value: (profile: UserProfile) => profile.username
      },
      {
        type: 'fillForm',
        selector: 'input[name="password"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'fillForm',
        selector: 'input[name="passwordConfirm"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'solveCaptcha'
      },
      {
        type: 'click',
        selector: 'button[type="submit"]'
      },
      {
        type: 'wait',
        timeout: 5000
      }
    ],
    credentialExtraction: {
      usernameSelector: 'input[name="username"]',
      passwordSelector: 'input[name="password"]'
    },
    limits: {
      monthlyRequests: 1000,
      storageLimit: 500 * 1024 * 1024 // 500MB
    },
    features: ['Email', 'Calendar', 'Drive', 'VPN'],
    requiresEmailVerification: false,
    requiresPhoneVerification: false,
    captchaType: 'recaptcha'
  },

  {
    id: 'tutanota',
    name: 'Tutanota',
    category: ServiceCategory.COMMUNICATION,
    baseUrl: 'https://tutanota.com',
    signupUrl: 'https://mail.tutanota.com/signup',
    loginUrl: 'https://mail.tutanota.com/login',
    registrationSteps: [
      {
        type: 'navigate'
      },
      {
        type: 'fillForm',
        selector: 'input[data-label="mailAddress"]',
        value: (profile: UserProfile) => profile.username
      },
      {
        type: 'fillForm',
        selector: 'input[data-label="password"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'fillForm',
        selector: 'input[data-label="passwordRepeat"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'click',
        selector: 'button[title="Create account"]'
      }
    ],
    credentialExtraction: {
      usernameSelector: 'input[data-label="mailAddress"]',
      passwordSelector: 'input[data-label="password"]'
    },
    limits: {
      monthlyRequests: 500,
      storageLimit: 1024 * 1024 * 1024 // 1GB
    },
    features: ['Email', 'Calendar', 'Contacts'],
    requiresEmailVerification: false,
    requiresPhoneVerification: false
  },

  // Cloud Storage Services
  {
    id: 'mega',
    name: 'MEGA',
    category: ServiceCategory.COMPUTING_STORAGE,
    baseUrl: 'https://mega.nz',
    signupUrl: 'https://mega.nz/register',
    loginUrl: 'https://mega.nz/login',
    registrationSteps: [
      {
        type: 'navigate'
      },
      {
        type: 'fillForm',
        selector: 'input[name="register-name"]',
        value: (profile: UserProfile) => `${profile.firstName} ${profile.lastName}`
      },
      {
        type: 'fillForm',
        selector: 'input[name="register-email"]',
        value: (profile: UserProfile) => profile.email
      },
      {
        type: 'fillForm',
        selector: 'input[name="register-password"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'fillForm',
        selector: 'input[name="register-password2"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'click',
        selector: '.register-button'
      },
      {
        type: 'verifyEmail'
      }
    ],
    credentialExtraction: {
      usernameSelector: 'input[name="register-email"]',
      passwordSelector: 'input[name="register-password"]'
    },
    limits: {
      storageLimit: 20 * 1024 * 1024 * 1024, // 20GB
      bandwidthLimit: 5 * 1024 * 1024 * 1024 // 5GB transfer
    },
    features: ['Cloud Storage', 'File Sharing', 'Sync', 'Chat'],
    requiresEmailVerification: true,
    requiresPhoneVerification: false
  },

  {
    id: 'pcloud',
    name: 'pCloud',
    category: ServiceCategory.COMPUTING_STORAGE,
    baseUrl: 'https://www.pcloud.com',
    signupUrl: 'https://www.pcloud.com/register',
    loginUrl: 'https://www.pcloud.com/login',
    registrationSteps: [
      {
        type: 'navigate'
      },
      {
        type: 'fillForm',
        selector: 'input[name="email"]',
        value: (profile: UserProfile) => profile.email
      },
      {
        type: 'fillForm',
        selector: 'input[name="password"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'click',
        selector: 'input[type="checkbox"]' // Terms agreement
      },
      {
        type: 'solveCaptcha'
      },
      {
        type: 'click',
        selector: 'button[type="submit"]'
      }
    ],
    credentialExtraction: {
      usernameSelector: 'input[name="email"]',
      passwordSelector: 'input[name="password"]'
    },
    limits: {
      storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
      bandwidthLimit: 500 * 1024 * 1024 // 500MB daily
    },
    features: ['Cloud Storage', 'File Sharing', 'Backup'],
    requiresEmailVerification: true,
    requiresPhoneVerification: false,
    captchaType: 'recaptcha'
  },

  // Web Hosting Services
  {
    id: 'netlify',
    name: 'Netlify',
    category: ServiceCategory.WEB_INFRASTRUCTURE,
    baseUrl: 'https://www.netlify.com',
    signupUrl: 'https://app.netlify.com/signup',
    loginUrl: 'https://app.netlify.com/login',
    registrationSteps: [
      {
        type: 'navigate'
      },
      {
        type: 'fillForm',
        selector: 'input[name="email"]',
        value: (profile: UserProfile) => profile.email
      },
      {
        type: 'fillForm',
        selector: 'input[name="password"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'click',
        selector: 'button[type="submit"]'
      },
      {
        type: 'verifyEmail'
      }
    ],
    credentialExtraction: {
      usernameSelector: 'input[name="email"]',
      passwordSelector: 'input[name="password"]'
    },
    limits: {
      monthlyRequests: 100000,
      bandwidthLimit: 100 * 1024 * 1024 * 1024, // 100GB
      buildMinutes: 300
    },
    features: ['Static Hosting', 'Serverless Functions', 'Forms', 'Analytics'],
    requiresEmailVerification: true,
    requiresPhoneVerification: false
  },

  {
    id: 'vercel',
    name: 'Vercel',
    category: ServiceCategory.WEB_INFRASTRUCTURE,
    baseUrl: 'https://vercel.com',
    signupUrl: 'https://vercel.com/signup',
    loginUrl: 'https://vercel.com/login',
    registrationSteps: [
      {
        type: 'navigate'
      },
      {
        type: 'click',
        selector: 'button[data-testid="continue-with-email"]'
      },
      {
        type: 'fillForm',
        selector: 'input[name="email"]',
        value: (profile: UserProfile) => profile.email
      },
      {
        type: 'click',
        selector: 'button[type="submit"]'
      },
      {
        type: 'verifyEmail'
      }
    ],
    credentialExtraction: {
      usernameSelector: 'input[name="email"]'
    },
    limits: {
      monthlyRequests: 100000,
      bandwidthLimit: 100 * 1024 * 1024 * 1024, // 100GB
      buildMinutes: 6000
    },
    features: ['Static Hosting', 'Serverless Functions', 'Edge Network'],
    requiresEmailVerification: true,
    requiresPhoneVerification: false
  },

  // Database Services
  {
    id: 'planetscale',
    name: 'PlanetScale',
    category: ServiceCategory.COMPUTING_STORAGE,
    baseUrl: 'https://planetscale.com',
    signupUrl: 'https://auth.planetscale.com/sign-up',
    loginUrl: 'https://auth.planetscale.com/sign-in',
    registrationSteps: [
      {
        type: 'navigate'
      },
      {
        type: 'fillForm',
        selector: 'input[name="email"]',
        value: (profile: UserProfile) => profile.email
      },
      {
        type: 'fillForm',
        selector: 'input[name="password"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'fillForm',
        selector: 'input[name="name"]',
        value: (profile: UserProfile) => `${profile.firstName} ${profile.lastName}`
      },
      {
        type: 'click',
        selector: 'button[type="submit"]'
      }
    ],
    credentialExtraction: {
      usernameSelector: 'input[name="email"]',
      passwordSelector: 'input[name="password"]'
    },
    limits: {
      storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
      monthlyRequests: 1000000000 // 1B row reads
    },
    features: ['MySQL Database', 'Branching', 'Scaling'],
    requiresEmailVerification: true,
    requiresPhoneVerification: false
  },

  {
    id: 'supabase',
    name: 'Supabase',
    category: ServiceCategory.COMPUTING_STORAGE,
    baseUrl: 'https://supabase.com',
    signupUrl: 'https://app.supabase.com/sign-up',
    loginUrl: 'https://app.supabase.com/sign-in',
    registrationSteps: [
      {
        type: 'navigate'
      },
      {
        type: 'fillForm',
        selector: 'input[name="email"]',
        value: (profile: UserProfile) => profile.email
      },
      {
        type: 'fillForm',
        selector: 'input[name="password"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'click',
        selector: 'button[type="submit"]'
      },
      {
        type: 'verifyEmail'
      }
    ],
    credentialExtraction: {
      usernameSelector: 'input[name="email"]',
      passwordSelector: 'input[name="password"]'
    },
    limits: {
      storageLimit: 500 * 1024 * 1024, // 500MB
      monthlyRequests: 50000,
      bandwidthLimit: 2 * 1024 * 1024 * 1024 // 2GB
    },
    features: ['PostgreSQL Database', 'Authentication', 'Storage', 'Edge Functions'],
    requiresEmailVerification: true,
    requiresPhoneVerification: false
  },

  // AI/ML Services
  {
    id: 'huggingface',
    name: 'Hugging Face',
    category: ServiceCategory.AI_ML,
    baseUrl: 'https://huggingface.co',
    signupUrl: 'https://huggingface.co/join',
    loginUrl: 'https://huggingface.co/login',
    registrationSteps: [
      {
        type: 'navigate'
      },
      {
        type: 'fillForm',
        selector: 'input[name="username"]',
        value: (profile: UserProfile) => profile.username
      },
      {
        type: 'fillForm',
        selector: 'input[name="email"]',
        value: (profile: UserProfile) => profile.email
      },
      {
        type: 'fillForm',
        selector: 'input[name="password"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'click',
        selector: 'button[type="submit"]'
      }
    ],
    credentialExtraction: {
      usernameSelector: 'input[name="username"]',
      passwordSelector: 'input[name="password"]'
    },
    limits: {
      monthlyRequests: 30000,
      storageLimit: 1024 * 1024 * 1024 // 1GB
    },
    features: ['Model Hosting', 'Datasets', 'Spaces', 'Inference API'],
    requiresEmailVerification: true,
    requiresPhoneVerification: false
  },

  // Developer Tools
  {
    id: 'github',
    name: 'GitHub',
    category: ServiceCategory.DEVELOPER_TOOLS,
    baseUrl: 'https://github.com',
    signupUrl: 'https://github.com/signup',
    loginUrl: 'https://github.com/login',
    registrationSteps: [
      {
        type: 'navigate'
      },
      {
        type: 'fillForm',
        selector: 'input[name="user[login]"]',
        value: (profile: UserProfile) => profile.username
      },
      {
        type: 'fillForm',
        selector: 'input[name="user[email]"]',
        value: (profile: UserProfile) => profile.email
      },
      {
        type: 'fillForm',
        selector: 'input[name="user[password]"]',
        value: (profile: UserProfile) => profile.password
      },
      {
        type: 'click',
        selector: 'input[name="opt_in"]' // Marketing emails
      },
      {
        type: 'solveCaptcha'
      },
      {
        type: 'click',
        selector: 'button[type="submit"]'
      },
      {
        type: 'verifyEmail'
      }
    ],
    credentialExtraction: {
      usernameSelector: 'input[name="user[login]"]',
      passwordSelector: 'input[name="user[password]"]'
    },
    limits: {
      storageLimit: 1024 * 1024 * 1024, // 1GB
      monthlyRequests: 5000 // API requests
    },
    features: ['Git Repositories', 'Actions', 'Pages', 'Packages'],
    requiresEmailVerification: true,
    requiresPhoneVerification: false,
    captchaType: 'hcaptcha'
  },

  {
    id: 'railway',
    name: 'Railway',
    category: ServiceCategory.COMPUTING_STORAGE,
    baseUrl: 'https://railway.app',
    signupUrl: 'https://railway.app/login',
    loginUrl: 'https://railway.app/login',
    registrationSteps: [
      {
        type: 'navigate'
      },
      {
        type: 'click',
        selector: 'button[data-testid="github-login"]' // GitHub OAuth
      },
      // Note: This would require GitHub account first
      {
        type: 'custom',
        customHandler: async (page: any, profile: UserProfile) => {
          // Handle GitHub OAuth flow
          await page.waitForNavigation()
        }
      }
    ],
    credentialExtraction: {
      customExtractor: async (page: any) => {
        // Extract from Railway dashboard after OAuth
        return {
          provider: 'github_oauth',
          railway_token: 'extracted_from_dashboard'
        }
      }
    },
    limits: {
      monthlyRequests: 500000,
      executionTime: 500 * 60 * 60, // 500 hours
      storageLimit: 1024 * 1024 * 1024 // 1GB
    },
    features: ['App Hosting', 'Databases', 'Cron Jobs'],
    requiresEmailVerification: false,
    requiresPhoneVerification: false
  }
]

// Helper function to get templates by category
export function getTemplatesByCategory(category: ServiceCategory): ServiceTemplate[] {
  return ADVANCED_SERVICE_TEMPLATES.filter(template => template.category === category)
}

// Helper function to get template by ID
export function getTemplateById(id: string): ServiceTemplate | undefined {
  return ADVANCED_SERVICE_TEMPLATES.find(template => template.id === id)
}

// Helper function to get all template IDs
export function getAllTemplateIds(): string[] {
  return ADVANCED_SERVICE_TEMPLATES.map(template => template.id)
}

// Helper function to get templates that don't require phone verification
export function getTemplatesWithoutPhoneVerification(): ServiceTemplate[] {
  return ADVANCED_SERVICE_TEMPLATES.filter(template => !template.requiresPhoneVerification)
}

// Helper function to get templates by features
export function getTemplatesByFeature(feature: string): ServiceTemplate[] {
  return ADVANCED_SERVICE_TEMPLATES.filter(template => 
    template.features.some(f => f.toLowerCase().includes(feature.toLowerCase()))
  )
}