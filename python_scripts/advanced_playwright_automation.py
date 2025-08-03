#!/usr/bin/env python3
"""
Advanced Playwright Automation Script for FreebeeZ
Supports complex automation workflows with AI-powered decision making
"""

import json
import sys
import asyncio
import time
from datetime import datetime
from playwright.async_api import async_playwright, Page, Browser
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AdvancedPlaywrightAutomation:
    def __init__(self, config):
        self.config = config
        self.browser = None
        self.page = None
        self.screenshots = []
        self.logs = []
        self.start_time = time.time()
        
    async def initialize_browser(self):
        """Initialize browser with advanced configuration"""
        playwright = await async_playwright().start()
        
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
        
        # Add proxy if specified
        if self.config.get('proxy'):
            browser_args.extend([
                f'--proxy-server={self.config["proxy"]["url"]}',
            ])
        
        self.browser = await playwright.chromium.launch(
            headless=self.config.get('headless', True),
            args=browser_args
        )
        
        # Create context with advanced settings
        context = await self.browser.new_context(
            user_agent=self.config.get('userAgent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
            viewport=self.config.get('viewport', {'width': 1920, 'height': 1080}),
            locale=self.config.get('locale', 'en-US'),
            timezone_id=self.config.get('timezone', 'America/New_York'),
            permissions=['geolocation', 'notifications'],
            extra_http_headers=self.config.get('headers', {})
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
        
        # Set up event listeners
        self.page.on('console', lambda msg: self.logs.append(f'Console: {msg.text}'))
        self.page.on('pageerror', lambda error: self.logs.append(f'Page Error: {error}'))
        self.page.on('requestfailed', lambda request: self.logs.append(f'Request Failed: {request.url}'))
        
        logger.info("Browser initialized successfully")
        
    async def execute_action(self, action):
        """Execute a single automation action with enhanced error handling"""
        action_type = action.get('type')
        selector = action.get('selector')
        value = action.get('value')
        timeout = action.get('timeout', 30000)
        
        logger.info(f"Executing action: {action_type}")
        
        try:
            if action_type == 'goto':
                await self.page.goto(value, wait_until='networkidle', timeout=timeout)
                await self.page.wait_for_timeout(2000)  # Additional wait for dynamic content
                
            elif action_type == 'wait':
                if selector:
                    await self.page.wait_for_selector(selector, timeout=timeout)
                else:
                    await self.page.wait_for_timeout(int(value) if value else 1000)
                    
            elif action_type == 'click':
                # Enhanced click with multiple strategies
                element = await self.page.wait_for_selector(selector, timeout=timeout)
                if element:
                    # Scroll into view first
                    await element.scroll_into_view_if_needed()
                    await self.page.wait_for_timeout(500)
                    
                    # Try different click methods
                    try:
                        await element.click(timeout=5000)
                    except:
                        # Fallback to JavaScript click
                        await self.page.evaluate(f'document.querySelector("{selector}").click()')
                        
            elif action_type == 'fill':
                element = await self.page.wait_for_selector(selector, timeout=timeout)
                if element:
                    await element.scroll_into_view_if_needed()
                    await element.clear()
                    await element.fill(value)
                    await self.page.wait_for_timeout(500)
                    
            elif action_type == 'type':
                element = await self.page.wait_for_selector(selector, timeout=timeout)
                if element:
                    await element.scroll_into_view_if_needed()
                    await element.type(value, delay=100)  # Human-like typing
                    
            elif action_type == 'select':
                await self.page.select_option(selector, value)
                
            elif action_type == 'hover':
                element = await self.page.wait_for_selector(selector, timeout=timeout)
                if element:
                    await element.hover()
                    
            elif action_type == 'scroll':
                if selector:
                    element = await self.page.wait_for_selector(selector, timeout=timeout)
                    await element.scroll_into_view_if_needed()
                else:
                    await self.page.evaluate(f'window.scrollBy(0, {value or 500})')
                    
            elif action_type == 'screenshot':
                screenshot = await self.page.screenshot(full_page=True)
                self.screenshots.append({
                    'timestamp': datetime.now().isoformat(),
                    'data': screenshot.hex(),
                    'description': action.get('description', 'Screenshot')
                })
                
            elif action_type == 'extract':
                elements = await self.page.query_selector_all(selector)
                extracted_data = []
                
                for element in elements:
                    if action.get('attribute'):
                        data = await element.get_attribute(action['attribute'])
                    else:
                        data = await element.text_content()
                    extracted_data.append(data)
                    
                return {
                    'selector': selector,
                    'data': extracted_data,
                    'count': len(extracted_data)
                }
                
            elif action_type == 'wait_for_navigation':
                async with self.page.expect_navigation(timeout=timeout):
                    pass
                    
            elif action_type == 'evaluate':
                result = await self.page.evaluate(value)
                return {'result': result}
                
            elif action_type == 'upload_file':
                file_input = await self.page.wait_for_selector(selector, timeout=timeout)
                await file_input.set_input_files(value)
                
            elif action_type == 'handle_dialog':
                # Set up dialog handler
                self.page.on('dialog', lambda dialog: dialog.accept(value) if value else dialog.dismiss())
                
            elif action_type == 'switch_frame':
                frame = self.page.frame(value)
                if frame:
                    self.page = frame
                    
            elif action_type == 'wait_for_element':
                await self.page.wait_for_selector(selector, state=value or 'visible', timeout=timeout)
                
            elif action_type == 'check_element_exists':
                element = await self.page.query_selector(selector)
                return {'exists': element is not None}
                
            elif action_type == 'get_page_title':
                title = await self.page.title()
                return {'title': title}
                
            elif action_type == 'get_current_url':
                url = self.page.url
                return {'url': url}
                
            elif action_type == 'wait_for_load_state':
                await self.page.wait_for_load_state(value or 'networkidle', timeout=timeout)
                
            elif action_type == 'custom_script':
                # Execute custom JavaScript
                result = await self.page.evaluate(value)
                return {'result': result}
                
            else:
                raise ValueError(f"Unknown action type: {action_type}")
                
            logger.info(f"Action {action_type} completed successfully")
            return {'success': True}
            
        except Exception as e:
            error_msg = f"Action {action_type} failed: {str(e)}"
            logger.error(error_msg)
            self.logs.append(error_msg)
            return {'success': False, 'error': error_msg}
    
    async def detect_captcha(self):
        """Detect if there's a CAPTCHA on the page"""
        captcha_selectors = [
            '.g-recaptcha',
            '.h-captcha',
            '#captcha',
            '[data-captcha]',
            'iframe[src*="recaptcha"]',
            'iframe[src*="hcaptcha"]'
        ]
        
        for selector in captcha_selectors:
            element = await self.page.query_selector(selector)
            if element:
                logger.info(f"CAPTCHA detected: {selector}")
                return True
        
        return False
    
    async def handle_captcha(self):
        """Handle CAPTCHA if detected"""
        if await self.detect_captcha():
            logger.info("CAPTCHA detected, attempting to solve...")
            
            # Take screenshot for CAPTCHA solving
            screenshot = await self.page.screenshot()
            
            # This would integrate with CAPTCHA solving service
            # For now, just wait and hope it's solved manually or by service
            await self.page.wait_for_timeout(10000)
            
            return True
        
        return False
    
    async def run_automation(self):
        """Run the complete automation workflow"""
        try:
            await self.initialize_browser()
            
            # Navigate to initial URL
            if self.config.get('url'):
                await self.page.goto(self.config['url'], wait_until='networkidle')
                logger.info(f"Navigated to: {self.config['url']}")
            
            extracted_data = {}
            
            # Execute actions
            for i, action in enumerate(self.config.get('actions', [])):
                logger.info(f"Executing action {i+1}/{len(self.config['actions'])}: {action.get('type')}")
                
                # Check for CAPTCHA before each action
                await self.handle_captcha()
                
                result = await self.execute_action(action)
                
                if result and result.get('data'):
                    extracted_data[f'action_{i}'] = result['data']
                
                # Add delay between actions for human-like behavior
                delay = action.get('delay', 1000)
                await self.page.wait_for_timeout(delay)
            
            # Final screenshot
            final_screenshot = await self.page.screenshot(full_page=True)
            self.screenshots.append({
                'timestamp': datetime.now().isoformat(),
                'data': final_screenshot.hex(),
                'description': 'Final screenshot'
            })
            
            duration = time.time() - self.start_time
            
            return {
                'success': True,
                'duration': duration,
                'screenshots': self.screenshots,
                'logs': self.logs,
                'extracted_data': extracted_data,
                'final_url': self.page.url,
                'page_title': await self.page.title()
            }
            
        except Exception as e:
            error_msg = f"Automation failed: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            
            duration = time.time() - self.start_time
            
            return {
                'success': False,
                'error': error_msg,
                'duration': duration,
                'screenshots': self.screenshots,
                'logs': self.logs,
                'traceback': traceback.format_exc()
            }
            
        finally:
            if self.browser:
                await self.browser.close()

async def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Configuration required as first argument'
        }))
        return
    
    try:
        config = json.loads(sys.argv[1])
        automation = AdvancedPlaywrightAutomation(config)
        result = await automation.run_automation()
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            'success': False,
            'error': f'Invalid JSON configuration: {str(e)}'
        }))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': f'Automation failed: {str(e)}',
            'traceback': traceback.format_exc()
        }))

if __name__ == '__main__':
    asyncio.run(main())