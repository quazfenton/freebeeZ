" a web app that serves as a a central hub / singular frontend for users connecting to a multitude of free services and abstracting away tedious  multi-account signups /interconnectivity and linking of utilities/ acct rotation,lim& management. extended capabilities in advanced crawling, automated registrations and associated email accountt creation, advanced newer methods of  maneuvering + captcha  or standby/notifications if stuck needing user input,   puppeteer etc. consistent profiles, rotation & storage, crawling/scraping/ppuppeteer etc. and browser use tools 


# FreebeeZ - Free Service Automation Hub

FreebeeZ is a comprehensive web application that serves as a central hub for connecting to and managing multiple free services. It abstracts away tedious multi-account signups, interconnectivity, and account management through advanced automation, crawling, and browser manipulation techniques.

## 🚀 Features

### Core Functionality
- **Centralized Service Management**: Single dashboard for all your free service accounts
- **Automated Registration**: Automatically register for new services using browser automation
- **Credential Management**: Secure storage and rotation of service credentials
- **Service Monitoring**: Track usage limits and service health
- **Profile Management**: Consistent user profiles across services

### Advanced Automation
- **Browser Automation**: Puppeteer-based automation with stealth capabilities
- **CAPTCHA Solving**: Integration with 2captcha, anticaptcha, and AI-based solvers
- **Email Management**: Temporary email services for account verification
- **Profile Rotation**: Multiple user profiles with realistic fingerprints
- **Proxy Support**: IP rotation and residential proxy integration

### Supported Services
- **Email**: ProtonMail, Tutanota, Gmail alternatives
- **Cloud Storage**: MEGA, pCloud, Google Drive alternatives
- **Web Hosting**: Netlify, Vercel, GitHub Pages
- **Databases**: PlanetScale, Supabase, MongoDB Atlas
- **AI/ML**: Hugging Face, OpenAI alternatives
- **Developer Tools**: GitHub, Railway, Heroku alternatives

## 🛠 Installation

### Prerequisites
- Node.js 18+ and npm/pnpm
- Python 3.8+ with pip
- Chrome/Chromium browser

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/freebeeZ.git
   cd freebeeZ
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   playwright install chromium
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and settings
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# CAPTCHA Solving (optional but recommended)
NEXT_PUBLIC_2CAPTCHA_KEY=your_2captcha_api_key
NEXT_PUBLIC_ANTICAPTCHA_KEY=your_anticaptcha_api_key

# Browserbase Integration (optional)
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_ENDPOINT=https://api.browserbase.com # Optional, default endpoint

# Encryption for credential storage
ENCRYPTION_KEY=your_secure_32_character_key

# Email notifications (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Browser settings
HEADLESS_BROWSER=true
MAX_CONCURRENT_BROWSERS=3
```

### CAPTCHA Solving Setup

To enable automatic CAPTCHA solving:

1. **2captcha.com** (Recommended)
   - Sign up at https://2captcha.com
   - Get your API key from the dashboard
   - Add to `.env` as `NEXT_PUBLIC_2CAPTCHA_KEY`

2. **anti-captcha.com** (Alternative)
   - Sign up at https://anti-captcha.com
   - Get your API key
   - Add to `.env` as `NEXT_PUBLIC_ANTICAPTCHA_KEY`

### Browserbase Setup

To enable cloud-based browser automation with Browserbase:

1. **Sign up at Browserbase**: Visit [https://browserbase.com](https://browserbase.com)
2. **Get your API Key**: Find your API key in the Browserbase dashboard.
3. **Add to `.env`**: Set `BROWSERBASE_API_KEY=your_browserbase_api_key`.
4. **(Optional) Custom Endpoint**: If you have a custom Browserbase endpoint, set `BROWSERBASE_ENDPOINT=your_custom_endpoint`.

## 📖 Usage

### Basic Usage

1. **Dashboard Overview**
   - View all connected services
   - Monitor usage and limits
   - Check service health

2. **Auto-Register Services**
   - Click "Auto-Register Services" on the dashboard
   - Select services to register for
   - Monitor progress in the Orchestration tab

3. **Manual Service Addition**
   - Go to Services → Add Service
   - Browse available services by category
   - Follow the connection wizard

### Advanced Features

#### Bulk Registration
```typescript
// Create a bulk registration task
const task = await orchestrator.createBulkRegistrationTask(
  ['protonmail', 'mega', 'netlify'], // Service IDs
  5, // Number of profiles to create
  {
    maxConcurrent: 2,
    retryAttempts: 3,
    delayBetweenTasks: 10000
  }
)
```

#### Custom Profiles
```typescript
// Create a custom user profile
const profile = await orchestrator.createUserProfile('custom-profile')
console.log(profile.credentials.email_variations)
```

#### Service Monitoring
```typescript
// Monitor service usage
const services = await serviceRegistry.getAllServices()
for (const service of services) {
  const usage = await service.getUsage()
  const limits = await service.getLimits()
  console.log(`${service.name}: ${usage.monthlyRequestsUsed}/${limits.monthlyRequests}`)
}
```

## 🏗 Architecture

### Core Components

1. **Service Integration Framework** (`lib/service-integrations/`)
   - Base classes for service connections
   - Credential management
   - Usage tracking

2. **Browser Automation Engine** (`lib/browser-automation/`)
   - Puppeteer-based automation
   - Stealth capabilities
   - Profile management

3. **Service Discovery Engine** (`lib/service-discovery/`)
   - Service templates
   - Registration automation
   - Profile generation

4. **Orchestration System** (`lib/orchestrator/`)
   - Task management
   - Bulk operations
   - Progress tracking

5. **Python Bridge** (`lib/python-bridge/`)
   - Advanced automation scripts
   - Computer vision for CAPTCHA detection
   - Profile generation

### Data Flow

```
User Request → Orchestrator → Service Discovery → Browser Automation → Target Service
     ↓              ↓              ↓                    ↓                ↓
Dashboard ← Task Status ← Registration ← Screenshots ← Success/Failure
```

## 🔧 Development

### Project Structure
```
freebeeZ/
├── app/                    # Next.js app directory
├── components/             # React components
├── lib/                    # Core libraries
│   ├── browser-automation/ # Browser automation
│   ├── service-discovery/  # Service templates
│   ├── orchestrator/       # Task management
│   └── python-bridge/      # Python integration
├── python_scripts/         # Python automation scripts
└── public/                 # Static assets
```

### Adding New Services

1. **Create Service Template**
   ```typescript
   // lib/service-templates/advanced-templates.ts
   {
     id: 'new-service',
     name: 'New Service',
     category: ServiceCategory.COMMUNICATION,
     signupUrl: 'https://newservice.com/signup',
     registrationSteps: [
       // Define registration steps
     ],
     // ... other properties
   }
   ```

2. **Test Registration Flow**
   ```bash
   npm run test:service new-service
   ```

### Custom Automation Scripts

Create Python scripts in `python_scripts/` directory:

```python
#!/usr/bin/env python3
import json
import sys
from playwright.async_api import async_playwright

async def custom_automation():
    # Your custom automation logic
    pass

if __name__ == '__main__':
    # Script entry point
    pass
```

## 🚨 Important Notes

### Legal and Ethical Considerations

- **Terms of Service**: Always respect service terms of service
- **Rate Limiting**: Implement appropriate delays between requests
- **Data Privacy**: Secure handling of user credentials and data
- **Responsible Use**: Use automation responsibly and ethically

### Security Best Practices

- **Credential Encryption**: All credentials are encrypted at rest
- **Secure Communication**: HTTPS for all external communications
- **Access Control**: Implement proper authentication and authorization
- **Regular Updates**: Keep dependencies updated for security

### Performance Optimization

- **Concurrent Limits**: Limit concurrent browser instances
- **Resource Cleanup**: Properly close browser instances
- **Memory Management**: Monitor memory usage during bulk operations
- **Error Handling**: Robust error handling and retry logic

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Add JSDoc comments for public APIs
- Include error handling
- Write tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is provided for educational and research purposes. Users are responsible for complying with all applicable laws and service terms of service. The authors are not responsible for any misuse of this software.

## 🆘 Support

- **Documentation**: Check the `/docs` directory
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join GitHub Discussions for questions
- **Email**: Contact support@freebeeZ.com

## 🗺 Roadmap

- [ ] Mobile app support
- [ ] More service integrations
- [ ] Advanced AI-based automation
- [ ] Team collaboration features
- [ ] API for third-party integrations
- [ ] Self-hosted deployment options

---

**Happy Automating! 🤖✨**



-08/03/25 /*1. AI Quota Prediction Service (lib/ai-quota-predictor/)
Intelligent quota monitoring and prediction
Multi-service support (OpenAI, Anthropic, Hugging Face, etc.)
Usage optimization recommendations
Automatic quota management
2. Service Dependency Mapping System (lib/service-dependency-mapper/)
Intelligent dependency analysis
Setup order optimization
Impact assessment for service changes
Critical service identification
3. Profile Rotation Manager (lib/profile-rotation-manager/)
Advanced user profile management
Intelligent rotation strategies
Behavioral consistency tracking
Multi-pool profile organization
4. Comprehensive Proxy Rotation System (lib/proxy-rotation-system/)
Advanced proxy pool management
Health monitoring and failover
Geographic targeting
Load balancing strategies
Cost optimization
5. Enhanced Python Bridge (lib/python-bridge/)
Process queue management
Retry mechanisms with exponential backoff
Parallel script execution
Enhanced error handling
Service-specific automation methods
6. Enhanced Browserbase Integration (lib/browser-automation/browserbase-adapter.ts)
Cloud-based browser automation
Session management and pooling
Advanced fingerprint spoofing
Usage monitoring and optimization
Failover mechanisms
7. Advanced Python Scripts
Intelligent CAPTCHA Solver: Multi-AI model support with fallback services
Advanced Playwright Automation: Human-like behavior simulation
Service Template Updater: Automated service discovery from GitHub sources
8. System Dashboard (components/system-dashboard.tsx)
Real-time system health monitoring
Performance metrics visualization
Quota usage tracking
Service status overview
9. Enhanced Dashboard Page (app/dashboard/page.tsx)
Comprehensive service management
Quick action buttons
Real-time activity feed
Automation workflow management
🔧 Key Features Added:
Intelligent Automation: AI-powered decision making for service management
Advanced Browser Automation: Cloud-based with Browserbase integration
Robust Error Handling: Comprehensive retry mechanisms and fallbacks
Performance Monitoring: Real-time metrics and health tracking
Service Discovery: Automated template updates from multiple sources
Profile Management: Advanced rotation and consistency tracking
Proxy Management: Intelligent rotation with health monitoring
Dependency Analysis: Smart service interdependency mapping
🛡️ Robustness Improvements:
Error Recovery: Automatic retry with exponential backoff
Health Monitoring: Continuous system health checks
Resource Management: Intelligent quota and usage optimization
Failover Systems: Automatic fallback to alternative services
Process Management: Queue-based execution with concurrency limits
📊 Enhanced Monitoring:
Real-time Dashboards: Comprehensive system overview
Performance Metrics: Success rates, response times, error tracking
Usage Analytics: Quota monitoring and prediction
Service Health: Continuous monitoring with alerts
The system is now production-ready with enterprise-level features including intelligent automation, comprehensive monitoring, robust error handling, and scalable architecture. All components are properly integrated and work together to provide a seamless experience for managing free services at scale. */