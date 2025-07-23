#!/usr/bin/env python3
"""
Advanced Playwright automation script for FreebeeZ
Handles complex browser automation tasks with stealth capabilities
"""

import asyncio
import json
import sys
import base64
from playwright.async_api import async_playwright
from faker import Faker
import random
import time

fake = Faker()

class PlaywrightAutomator:
    def __init__(self, config):
        self.config = config
        self.browser = None
        self.page = None
        self.results = []
        
    async def setup_browser(self):
        """Setup browser with stealth configuration"""
        playwright = await async_playwright().start()
        
        # Browser args for stealth
        browser_args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-blink-features=AutomationControlled'
        ]
        
        self.browser = await playwright.chromium.launch(
            headless=self.config.get('headless', True),
            args=browser_args
        )
        
        # Create context with realistic settings
        context = await self.browser.new_context(
            user_agent=self.config.get('userAgent', self.get_random_user_agent()),
            viewport=self.config.get('viewport', {'width': 1920, 'height': 1080}),
            locale='en-US',
            timezone_id='America/New_York'
        )
        
        # Add stealth scripts
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
            
            window.chrome = {
                runtime: {},
            };
        """)
        
        self.page = await context.new_page()
        
        # Set additional headers
        await self.page.set_extra_http_headers({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
    def get_random_user_agent(self):
        """Get a random realistic user agent"""
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
        ]
        return random.choice(user_agents)
        
    async def execute_actions(self):
        """Execute the configured actions"""
        try:
            # Navigate to initial URL
            await self.page.goto(self.config['url'], wait_until='networkidle')
            await self.random_delay()
            
            # Execute each action
            for action in self.config.get('actions', []):
                await self.execute_action(action)
                await self.random_delay()
                
        except Exception as e:
            self.results.append({
                'type': 'error',
                'message': str(e),
                'timestamp': time.time()
            })
            
    async def execute_action(self, action):
        """Execute a single action"""
        action_type = action['type']
        
        try:
            if action_type == 'goto':
                await self.page.goto(action['value'], wait_until='networkidle')
                
            elif action_type == 'click':
                await self.page.wait_for_selector(action['selector'], timeout=action.get('timeout', 10000))
                await self.page.click(action['selector'])
                
            elif action_type == 'fill':
                await self.page.wait_for_selector(action['selector'], timeout=action.get('timeout', 10000))
                # Clear field first
                await self.page.fill(action['selector'], '')
                # Type with human-like delay
                await self.page.type(action['selector'], action['value'], delay=random.randint(50, 150))
                
            elif action_type == 'wait':
                if action.get('selector'):
                    await self.page.wait_for_selector(action['selector'], timeout=action.get('timeout', 10000))
                else:
                    await asyncio.sleep(action.get('timeout', 1000) / 1000)
                    
            elif action_type == 'screenshot':
                screenshot = await self.page.screenshot(full_page=True)
                screenshot_b64 = base64.b64encode(screenshot).decode()
                self.results.append({
                    'type': 'screenshot',
                    'data': screenshot_b64,
                    'timestamp': time.time()
                })
                
            elif action_type == 'extract':
                elements = await self.page.query_selector_all(action['selector'])
                extracted_data = []
                for element in elements:
                    if action.get('attribute'):
                        data = await element.get_attribute(action['attribute'])
                    else:
                        data = await element.text_content()
                    extracted_data.append(data)
                    
                self.results.append({
                    'type': 'extracted_data',
                    'selector': action['selector'],
                    'data': extracted_data,
                    'timestamp': time.time()
                })
                
            elif action_type == 'scroll':
                await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                
            elif action_type == 'hover':
                await self.page.wait_for_selector(action['selector'], timeout=action.get('timeout', 10000))
                await self.page.hover(action['selector'])
                
            self.results.append({
                'type': 'action_completed',
                'action': action_type,
                'selector': action.get('selector'),
                'timestamp': time.time()
            })
            
        except Exception as e:
            self.results.append({
                'type': 'action_error',
                'action': action_type,
                'error': str(e),
                'timestamp': time.time()
            })
            
    async def random_delay(self):
        """Add random human-like delay"""
        delay = random.uniform(0.5, 2.0)
        await asyncio.sleep(delay)
        
    async def detect_captcha(self):
        """Detect if there's a CAPTCHA on the page"""
        captcha_selectors = [
            '[class*="captcha"]',
            '[id*="captcha"]',
            '[class*="recaptcha"]',
            '[id*="recaptcha"]',
            'iframe[src*="recaptcha"]',
            'iframe[src*="hcaptcha"]',
            '[class*="hcaptcha"]',
            '[id*="hcaptcha"]'
        ]
        
        for selector in captcha_selectors:
            try:
                element = await self.page.query_selector(selector)
                if element:
                    self.results.append({
                        'type': 'captcha_detected',
                        'selector': selector,
                        'timestamp': time.time()
                    })
                    return True
            except:
                continue
                
        return False
        
    async def handle_email_verification(self):
        """Handle email verification if detected"""
        # Look for email verification indicators
        verification_indicators = [
            'verify your email',
            'check your email',
            'confirmation email',
            'activate your account'
        ]
        
        page_content = await self.page.content()
        page_text = await self.page.text_content('body')
        
        for indicator in verification_indicators:
            if indicator.lower() in page_text.lower():
                self.results.append({
                    'type': 'email_verification_required',
                    'indicator': indicator,
                    'timestamp': time.time()
                })
                return True
                
        return False
        
    async def cleanup(self):
        """Clean up browser resources"""
        if self.browser:
            await self.browser.close()
            
    async def run(self):
        """Main execution method"""
        try:
            await self.setup_browser()
            await self.execute_actions()
            
            # Check for CAPTCHA
            await self.detect_captcha()
            
            # Check for email verification
            await self.handle_email_verification()
            
            # Final screenshot
            screenshot = await self.page.screenshot(full_page=True)
            screenshot_b64 = base64.b64encode(screenshot).decode()
            self.results.append({
                'type': 'final_screenshot',
                'data': screenshot_b64,
                'timestamp': time.time()
            })
            
            return {
                'success': True,
                'results': self.results,
                'url': self.page.url,
                'title': await self.page.title()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'results': self.results
            }
            
        finally:
            await self.cleanup()

async def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No configuration provided'}))
        return
        
    try:
        config = json.loads(sys.argv[1])
        automator = PlaywrightAutomator(config)
        result = await automator.run()
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))

if __name__ == '__main__':
    asyncio.run(main())