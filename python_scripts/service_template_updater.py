#!/usr/bin/env python3
"""
Service Template Updater for FreebeeZ
Automatically discovers and updates service templates from various sources
"""

import json
import sys
import requests
import time
import re
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlparse
import logging
from bs4 import BeautifulSoup
import yaml

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ServiceTemplateUpdater:
    def __init__(self):
        self.sources = [
            {
                'name': 'free-for-life',
                'url': 'https://raw.githubusercontent.com/wdhdev/free-for-life/main/README.md',
                'type': 'github_markdown'
            },
            {
                'name': 'free-dev-resources',
                'url': 'https://raw.githubusercontent.com/leogopal/free-dev-resources/main/README.md',
                'type': 'github_markdown'
            },
            {
                'name': 'free-tier-list',
                'url': 'https://raw.githubusercontent.com/alexmanno/free-tier-list/main/README.md',
                'type': 'github_markdown'
            },
            {
                'name': 'awesome-free-services',
                'url': 'https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md',
                'type': 'github_markdown'
            }
        ]
        
        self.service_categories = {
            'email': ['email', 'mail', 'smtp', 'messaging'],
            'storage': ['storage', 'cloud', 'file', 'backup', 'cdn'],
            'hosting': ['hosting', 'deploy', 'server', 'vps', 'paas'],
            'database': ['database', 'db', 'sql', 'nosql', 'redis', 'mongo'],
            'ai': ['ai', 'ml', 'machine learning', 'nlp', 'vision', 'gpt'],
            'analytics': ['analytics', 'tracking', 'metrics', 'monitoring'],
            'auth': ['auth', 'authentication', 'oauth', 'sso', 'identity'],
            'api': ['api', 'rest', 'graphql', 'webhook'],
            'communication': ['chat', 'video', 'voice', 'sms', 'notification'],
            'development': ['git', 'ci/cd', 'testing', 'debugging', 'ide']
        }
        
        self.existing_services = set()
        self.discovered_services = []
        
    def fetch_source_content(self, source):
        """Fetch content from a source URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.get(source['url'], headers=headers, timeout=30)
            response.raise_for_status()
            
            logger.info(f"Fetched content from {source['name']}: {len(response.text)} characters")
            return response.text
            
        except Exception as e:
            logger.error(f"Failed to fetch {source['name']}: {e}")
            return None
    
    def parse_github_markdown(self, content, source_name):
        """Parse GitHub markdown content to extract service information"""
        services = []
        
        try:
            lines = content.split('\n')
            current_category = 'general'
            
            for line in lines:
                line = line.strip()
                
                # Detect category headers
                if line.startswith('#') and not line.startswith('####'):
                    category_match = self.extract_category_from_header(line)
                    if category_match:
                        current_category = category_match
                    continue
                
                # Extract service links
                service_info = self.extract_service_from_line(line, current_category, source_name)
                if service_info:
                    services.append(service_info)
            
            logger.info(f"Parsed {len(services)} services from {source_name}")
            return services
            
        except Exception as e:
            logger.error(f"Failed to parse markdown from {source_name}: {e}")
            return []
    
    def extract_category_from_header(self, header_line):
        """Extract category from markdown header"""
        header_text = re.sub(r'^#+\s*', '', header_line).lower()
        
        # Map header text to our categories
        for category, keywords in self.service_categories.items():
            if any(keyword in header_text for keyword in keywords):
                return category
        
        # Return cleaned header as category if no match
        return re.sub(r'[^a-z0-9]', '_', header_text)
    
    def extract_service_from_line(self, line, category, source):
        """Extract service information from a markdown line"""
        # Look for markdown links: [Service Name](URL)
        link_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
        matches = re.findall(link_pattern, line)
        
        for name, url in matches:
            # Clean up the name and URL
            name = name.strip()
            url = url.strip()
            
            # Skip if it's not a proper service URL
            if not self.is_valid_service_url(url):
                continue
            
            # Extract additional information from the line
            description = self.extract_description_from_line(line, name)
            
            # Determine service type and features
            service_type = self.determine_service_type(name, description, url)
            features = self.extract_features_from_description(description)
            
            service_info = {
                'id': self.generate_service_id(name, url),
                'name': name,
                'url': url,
                'category': category,
                'type': service_type,
                'description': description,
                'features': features,
                'source': source,
                'discovered_at': datetime.now().isoformat(),
                'signup_url': self.guess_signup_url(url),
                'pricing_model': self.guess_pricing_model(description),
                'registration_difficulty': self.estimate_registration_difficulty(name, description),
                'requires_verification': self.check_verification_requirements(description),
                'api_available': self.check_api_availability(description, url)
            }
            
            return service_info
        
        return None
    
    def is_valid_service_url(self, url):
        """Check if URL is a valid service URL"""
        try:
            parsed = urlparse(url)
            
            # Must have a valid domain
            if not parsed.netloc:
                return False
            
            # Skip certain types of URLs
            skip_patterns = [
                'github.com',
                'wikipedia.org',
                'docs.',
                'blog.',
                'news.',
                'reddit.com',
                'stackoverflow.com'
            ]
            
            for pattern in skip_patterns:
                if pattern in url.lower():
                    return False
            
            return True
            
        except:
            return False
    
    def extract_description_from_line(self, line, service_name):
        """Extract description from the markdown line"""
        # Remove the link part
        line_without_link = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', '', line)
        
        # Clean up and extract description
        description = line_without_link.strip(' -•*')
        
        # Remove list markers
        description = re.sub(r'^[\s\-\*\+\d\.]+', '', description).strip()
        
        return description if description else f"{service_name} service"
    
    def determine_service_type(self, name, description, url):
        """Determine the type of service based on name, description, and URL"""
        text_to_analyze = f"{name} {description} {url}".lower()
        
        type_patterns = {
            'email': ['email', 'mail', 'smtp', 'inbox'],
            'storage': ['storage', 'cloud', 'file', 'backup', 's3', 'blob'],
            'hosting': ['hosting', 'deploy', 'server', 'heroku', 'netlify', 'vercel'],
            'database': ['database', 'db', 'sql', 'mongo', 'redis', 'postgres'],
            'ai': ['ai', 'gpt', 'openai', 'ml', 'vision', 'nlp'],
            'api': ['api', 'rest', 'graphql', 'endpoint'],
            'auth': ['auth', 'oauth', 'sso', 'login', 'identity'],
            'monitoring': ['monitor', 'analytics', 'tracking', 'metrics'],
            'communication': ['chat', 'sms', 'notification', 'messaging']
        }
        
        for service_type, patterns in type_patterns.items():
            if any(pattern in text_to_analyze for pattern in patterns):
                return service_type
        
        return 'general'
    
    def extract_features_from_description(self, description):
        """Extract features from service description"""
        features = []
        
        feature_patterns = {
            'free_tier': ['free', 'no cost', 'gratis'],
            'api_access': ['api', 'rest', 'graphql', 'webhook'],
            'unlimited': ['unlimited', 'no limit'],
            'open_source': ['open source', 'opensource', 'github'],
            'no_signup': ['no signup', 'no registration', 'anonymous'],
            'temporary': ['temporary', 'temp', 'disposable'],
            'secure': ['secure', 'encrypted', 'privacy', 'ssl'],
            'real_time': ['real-time', 'realtime', 'live'],
            'mobile_app': ['mobile', 'app', 'ios', 'android'],
            'integrations': ['integration', 'webhook', 'zapier']
        }
        
        description_lower = description.lower()
        
        for feature, patterns in feature_patterns.items():
            if any(pattern in description_lower for pattern in patterns):
                features.append(feature)
        
        return features
    
    def generate_service_id(self, name, url):
        """Generate a unique service ID"""
        # Use domain name as base
        try:
            domain = urlparse(url).netloc.lower()
            domain = re.sub(r'^www\.', '', domain)
            domain = re.sub(r'[^a-z0-9]', '_', domain)
            return domain
        except:
            # Fallback to name-based ID
            return re.sub(r'[^a-z0-9]', '_', name.lower())
    
    def guess_signup_url(self, base_url):
        """Guess the signup URL for a service"""
        common_signup_paths = [
            '/signup',
            '/register',
            '/sign-up',
            '/join',
            '/create-account',
            '/get-started'
        ]
        
        # Try to construct signup URL
        for path in common_signup_paths:
            signup_url = urljoin(base_url, path)
            # In a real implementation, we might test these URLs
            return signup_url
        
        return base_url
    
    def guess_pricing_model(self, description):
        """Guess pricing model from description"""
        description_lower = description.lower()
        
        if any(word in description_lower for word in ['free', 'no cost', 'gratis']):
            if any(word in description_lower for word in ['forever', 'always', 'unlimited']):
                return 'free_forever'
            elif any(word in description_lower for word in ['trial', 'days', 'months']):
                return 'free_trial'
            else:
                return 'freemium'
        elif any(word in description_lower for word in ['paid', 'subscription', 'premium']):
            return 'paid'
        else:
            return 'unknown'
    
    def estimate_registration_difficulty(self, name, description):
        """Estimate how difficult registration might be"""
        difficulty_factors = {
            'easy': ['no signup', 'anonymous', 'instant', 'one-click'],
            'medium': ['email', 'verification', 'confirm'],
            'hard': ['phone', 'credit card', 'identity', 'kyc', 'approval']
        }
        
        text = f"{name} {description}".lower()
        
        for difficulty, patterns in difficulty_factors.items():
            if any(pattern in text for pattern in patterns):
                return difficulty
        
        return 'medium'  # Default assumption
    
    def check_verification_requirements(self, description):
        """Check if service requires verification"""
        verification_keywords = [
            'verification', 'verify', 'confirm', 'phone', 'sms',
            'identity', 'document', 'kyc', 'approval'
        ]
        
        return any(keyword in description.lower() for keyword in verification_keywords)
    
    def check_api_availability(self, description, url):
        """Check if service has API availability"""
        api_indicators = [
            'api', 'rest', 'graphql', 'webhook', 'sdk',
            'developer', 'integration', 'programmatic'
        ]
        
        text = f"{description} {url}".lower()
        return any(indicator in text for indicator in api_indicators)
    
    def deduplicate_services(self, services):
        """Remove duplicate services"""
        seen_ids = set()
        unique_services = []
        
        for service in services:
            if service['id'] not in seen_ids:
                seen_ids.add(service['id'])
                unique_services.append(service)
            else:
                # Merge information from duplicate
                existing = next(s for s in unique_services if s['id'] == service['id'])
                existing['sources'] = existing.get('sources', [existing['source']])
                if service['source'] not in existing['sources']:
                    existing['sources'].append(service['source'])
        
        return unique_services
    
    def enrich_service_data(self, service):
        """Enrich service data with additional information"""
        try:
            # Try to fetch additional data from the service website
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.get(service['url'], headers=headers, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Extract title
                title = soup.find('title')
                if title and not service.get('title'):
                    service['title'] = title.get_text().strip()
                
                # Extract meta description
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                if meta_desc and not service.get('meta_description'):
                    service['meta_description'] = meta_desc.get('content', '').strip()
                
                # Look for pricing information
                pricing_keywords = ['pricing', 'plans', 'cost', 'free', 'premium']
                pricing_links = []
                for link in soup.find_all('a', href=True):
                    link_text = link.get_text().lower()
                    if any(keyword in link_text for keyword in pricing_keywords):
                        pricing_links.append({
                            'text': link.get_text().strip(),
                            'url': urljoin(service['url'], link['href'])
                        })
                
                if pricing_links:
                    service['pricing_links'] = pricing_links[:3]  # Keep top 3
                
                # Look for API documentation
                api_keywords = ['api', 'developer', 'docs', 'documentation']
                api_links = []
                for link in soup.find_all('a', href=True):
                    link_text = link.get_text().lower()
                    if any(keyword in link_text for keyword in api_keywords):
                        api_links.append({
                            'text': link.get_text().strip(),
                            'url': urljoin(service['url'], link['href'])
                        })
                
                if api_links:
                    service['api_links'] = api_links[:3]
                
                service['enriched'] = True
                service['enriched_at'] = datetime.now().isoformat()
                
        except Exception as e:
            logger.warning(f"Failed to enrich {service['name']}: {e}")
            service['enriched'] = False
        
        return service
    
    def generate_registration_template(self, service):
        """Generate a registration template for the service"""
        template = {
            'service_id': service['id'],
            'name': service['name'],
            'signup_url': service['signup_url'],
            'steps': []
        }
        
        # Basic registration steps based on service type and difficulty
        if service['registration_difficulty'] == 'easy':
            template['steps'] = [
                {
                    'type': 'navigate',
                    'url': service['signup_url'],
                    'description': f'Navigate to {service["name"]} signup page'
                },
                {
                    'type': 'click',
                    'selector': 'button[type="submit"], .signup-btn, .register-btn',
                    'description': 'Click signup button'
                }
            ]
        else:
            template['steps'] = [
                {
                    'type': 'navigate',
                    'url': service['signup_url'],
                    'description': f'Navigate to {service["name"]} signup page'
                },
                {
                    'type': 'fill_form',
                    'fields': [
                        {'name': 'email', 'selector': 'input[type="email"], input[name*="email"]'},
                        {'name': 'password', 'selector': 'input[type="password"], input[name*="password"]'},
                        {'name': 'username', 'selector': 'input[name*="username"], input[name*="user"]', 'optional': True}
                    ],
                    'description': 'Fill registration form'
                },
                {
                    'type': 'solve_captcha',
                    'description': 'Solve CAPTCHA if present',
                    'optional': True
                },
                {
                    'type': 'click',
                    'selector': 'button[type="submit"], .signup-btn, .register-btn',
                    'description': 'Submit registration form'
                }
            ]
            
            if service['requires_verification']:
                template['steps'].append({
                    'type': 'verify_email',
                    'description': 'Verify email address',
                    'timeout': 300000  # 5 minutes
                })
        
        return template
    
    def update_service_templates(self):
        """Main method to update service templates"""
        logger.info("Starting service template update...")
        
        all_services = []
        
        # Fetch and parse each source
        for source in self.sources:
            logger.info(f"Processing source: {source['name']}")
            
            content = self.fetch_source_content(source)
            if not content:
                continue
            
            if source['type'] == 'github_markdown':
                services = self.parse_github_markdown(content, source['name'])
                all_services.extend(services)
        
        # Deduplicate services
        unique_services = self.deduplicate_services(all_services)
        logger.info(f"Found {len(unique_services)} unique services")
        
        # Enrich service data (limit to prevent rate limiting)
        enriched_services = []
        for i, service in enumerate(unique_services[:50]):  # Limit to first 50 for demo
            logger.info(f"Enriching service {i+1}/{min(50, len(unique_services))}: {service['name']}")
            enriched_service = self.enrich_service_data(service)
            enriched_services.append(enriched_service)
            
            # Add delay to be respectful
            time.sleep(1)
        
        # Generate registration templates
        templates = []
        for service in enriched_services:
            template = self.generate_registration_template(service)
            templates.append(template)
        
        # Prepare final output
        result = {
            'updated_at': datetime.now().isoformat(),
            'sources_processed': len(self.sources),
            'services_discovered': len(all_services),
            'unique_services': len(unique_services),
            'enriched_services': len(enriched_services),
            'services': enriched_services,
            'registration_templates': templates,
            'categories': list(set(s['category'] for s in enriched_services)),
            'statistics': {
                'by_category': {},
                'by_pricing_model': {},
                'by_difficulty': {}
            }
        }
        
        # Calculate statistics
        for service in enriched_services:
            # By category
            category = service['category']
            result['statistics']['by_category'][category] = result['statistics']['by_category'].get(category, 0) + 1
            
            # By pricing model
            pricing = service['pricing_model']
            result['statistics']['by_pricing_model'][pricing] = result['statistics']['by_pricing_model'].get(pricing, 0) + 1
            
            # By difficulty
            difficulty = service['registration_difficulty']
            result['statistics']['by_difficulty'][difficulty] = result['statistics']['by_difficulty'].get(difficulty, 0) + 1
        
        logger.info("Service template update completed")
        return result

def main():
    updater = ServiceTemplateUpdater()
    result = updater.update_service_templates()
    
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()