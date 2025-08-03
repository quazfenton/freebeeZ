#!/usr/bin/env python3
"""
Intelligent CAPTCHA Solver for FreebeeZ
Uses multiple AI models and services to solve various types of CAPTCHAs
"""

import json
import sys
import base64
import requests
import time
import os
from io import BytesIO
from PIL import Image
import cv2
import numpy as np
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class IntelligentCaptchaSolver:
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
        self.twocaptcha_api_key = os.getenv('TWOCAPTCHA_API_KEY')
        self.anticaptcha_api_key = os.getenv('ANTICAPTCHA_API_KEY')
        
    def detect_captcha_type(self, image_data):
        """Detect the type of CAPTCHA from image analysis"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))
            
            # Convert to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Analyze image characteristics
            height, width = cv_image.shape[:2]
            
            # Check for common CAPTCHA patterns
            if self._detect_recaptcha_pattern(cv_image):
                return 'recaptcha'
            elif self._detect_hcaptcha_pattern(cv_image):
                return 'hcaptcha'
            elif self._detect_text_captcha(cv_image):
                return 'text'
            elif self._detect_image_captcha(cv_image):
                return 'image_selection'
            elif self._detect_slider_captcha(cv_image):
                return 'slider'
            else:
                return 'unknown'
                
        except Exception as e:
            logger.error(f"Error detecting CAPTCHA type: {e}")
            return 'unknown'
    
    def _detect_recaptcha_pattern(self, image):
        """Detect reCAPTCHA patterns"""
        # Look for reCAPTCHA checkbox or challenge patterns
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Template matching for reCAPTCHA elements
        # This is a simplified version - real implementation would use trained models
        return False
    
    def _detect_hcaptcha_pattern(self, image):
        """Detect hCaptcha patterns"""
        # Look for hCaptcha specific elements
        return False
    
    def _detect_text_captcha(self, image):
        """Detect text-based CAPTCHA"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Use OCR-like analysis to detect text patterns
        # Check for distorted text characteristics
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # If we find text-like contours, it's likely a text CAPTCHA
        text_like_contours = 0
        for contour in contours:
            area = cv2.contourArea(contour)
            if 100 < area < 5000:  # Typical text character size
                text_like_contours += 1
        
        return text_like_contours > 3
    
    def _detect_image_captcha(self, image):
        """Detect image selection CAPTCHA"""
        # Look for grid patterns typical of image selection CAPTCHAs
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect grid lines
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1))
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 25))
        
        horizontal_lines = cv2.morphologyEx(gray, cv2.MORPH_OPEN, horizontal_kernel)
        vertical_lines = cv2.morphologyEx(gray, cv2.MORPH_OPEN, vertical_kernel)
        
        # If we detect significant grid structure, it's likely an image CAPTCHA
        return np.sum(horizontal_lines) > 1000 and np.sum(vertical_lines) > 1000
    
    def _detect_slider_captcha(self, image):
        """Detect slider/puzzle CAPTCHA"""
        # Look for slider or puzzle piece patterns
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Template matching for common slider shapes
        # This would use pre-trained templates in a real implementation
        return False
    
    async def solve_with_ai_vision(self, image_data, captcha_type, ai_model='gpt-4-vision'):
        """Solve CAPTCHA using AI vision models"""
        try:
            if ai_model.startswith('gpt') and self.openai_api_key:
                return await self._solve_with_openai(image_data, captcha_type)
            elif ai_model.startswith('claude') and self.anthropic_api_key:
                return await self._solve_with_anthropic(image_data, captcha_type)
            else:
                return {'success': False, 'error': 'No suitable AI model available'}
                
        except Exception as e:
            logger.error(f"AI vision solving failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _solve_with_openai(self, image_data, captcha_type):
        """Solve CAPTCHA using OpenAI GPT-4 Vision"""
        if not self.openai_api_key:
            return {'success': False, 'error': 'OpenAI API key not available'}
        
        try:
            headers = {
                'Authorization': f'Bearer {self.openai_api_key}',
                'Content-Type': 'application/json'
            }
            
            prompt = self._get_captcha_prompt(captcha_type)
            
            payload = {
                'model': 'gpt-4-vision-preview',
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {'type': 'text', 'text': prompt},
                            {
                                'type': 'image_url',
                                'image_url': {
                                    'url': f'data:image/png;base64,{image_data}'
                                }
                            }
                        ]
                    }
                ],
                'max_tokens': 300
            }
            
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                answer = result['choices'][0]['message']['content']
                
                return {
                    'success': True,
                    'answer': answer,
                    'confidence': 0.8,  # Estimated confidence
                    'method': 'openai_gpt4_vision'
                }
            else:
                return {
                    'success': False,
                    'error': f'OpenAI API error: {response.status_code}'
                }
                
        except Exception as e:
            return {'success': False, 'error': f'OpenAI solving failed: {str(e)}'}
    
    async def _solve_with_anthropic(self, image_data, captcha_type):
        """Solve CAPTCHA using Anthropic Claude Vision"""
        if not self.anthropic_api_key:
            return {'success': False, 'error': 'Anthropic API key not available'}
        
        try:
            headers = {
                'x-api-key': self.anthropic_api_key,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
            
            prompt = self._get_captcha_prompt(captcha_type)
            
            payload = {
                'model': 'claude-3-opus-20240229',
                'max_tokens': 300,
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {'type': 'text', 'text': prompt},
                            {
                                'type': 'image',
                                'source': {
                                    'type': 'base64',
                                    'media_type': 'image/png',
                                    'data': image_data
                                }
                            }
                        ]
                    }
                ]
            }
            
            response = requests.post(
                'https://api.anthropic.com/v1/messages',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                answer = result['content'][0]['text']
                
                return {
                    'success': True,
                    'answer': answer,
                    'confidence': 0.8,
                    'method': 'anthropic_claude_vision'
                }
            else:
                return {
                    'success': False,
                    'error': f'Anthropic API error: {response.status_code}'
                }
                
        except Exception as e:
            return {'success': False, 'error': f'Anthropic solving failed: {str(e)}'}
    
    def _get_captcha_prompt(self, captcha_type):
        """Get appropriate prompt for different CAPTCHA types"""
        prompts = {
            'text': 'Please read and transcribe the text shown in this CAPTCHA image. Return only the text characters you can see, without any additional explanation.',
            'image_selection': 'This is an image selection CAPTCHA. Please identify which images match the given criteria and return the grid positions (e.g., "1,3,5" for images in positions 1, 3, and 5).',
            'recaptcha': 'This is a reCAPTCHA challenge. Please solve it by identifying the requested objects or text.',
            'hcaptcha': 'This is an hCaptcha challenge. Please solve it by identifying the requested objects.',
            'slider': 'This is a slider CAPTCHA. Please determine the correct position or movement needed.',
            'unknown': 'Please analyze this CAPTCHA image and provide the solution. If it\'s text, transcribe it. If it\'s image selection, provide the positions.'
        }
        
        return prompts.get(captcha_type, prompts['unknown'])
    
    async def solve_with_service(self, image_data, captcha_type, service='2captcha'):
        """Solve CAPTCHA using external solving services"""
        try:
            if service == '2captcha' and self.twocaptcha_api_key:
                return await self._solve_with_2captcha(image_data, captcha_type)
            elif service == 'anticaptcha' and self.anticaptcha_api_key:
                return await self._solve_with_anticaptcha(image_data, captcha_type)
            else:
                return {'success': False, 'error': f'Service {service} not available'}
                
        except Exception as e:
            logger.error(f"Service solving failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _solve_with_2captcha(self, image_data, captcha_type):
        """Solve using 2captcha service"""
        if not self.twocaptcha_api_key:
            return {'success': False, 'error': '2captcha API key not available'}
        
        try:
            # Submit CAPTCHA
            submit_url = 'http://2captcha.com/in.php'
            submit_data = {
                'key': self.twocaptcha_api_key,
                'method': 'base64',
                'body': image_data
            }
            
            response = requests.post(submit_url, data=submit_data, timeout=30)
            
            if response.text.startswith('OK|'):
                captcha_id = response.text.split('|')[1]
                
                # Wait and retrieve result
                result_url = 'http://2captcha.com/res.php'
                
                for _ in range(30):  # Wait up to 5 minutes
                    time.sleep(10)
                    
                    result_response = requests.get(
                        result_url,
                        params={
                            'key': self.twocaptcha_api_key,
                            'action': 'get',
                            'id': captcha_id
                        },
                        timeout=30
                    )
                    
                    if result_response.text.startswith('OK|'):
                        answer = result_response.text.split('|')[1]
                        return {
                            'success': True,
                            'answer': answer,
                            'confidence': 0.9,
                            'method': '2captcha',
                            'captcha_id': captcha_id
                        }
                    elif result_response.text != 'CAPCHA_NOT_READY':
                        return {
                            'success': False,
                            'error': f'2captcha error: {result_response.text}'
                        }
                
                return {'success': False, 'error': '2captcha timeout'}
            else:
                return {'success': False, 'error': f'2captcha submit error: {response.text}'}
                
        except Exception as e:
            return {'success': False, 'error': f'2captcha solving failed: {str(e)}'}
    
    async def _solve_with_anticaptcha(self, image_data, captcha_type):
        """Solve using anti-captcha service"""
        if not self.anticaptcha_api_key:
            return {'success': False, 'error': 'Anti-captcha API key not available'}
        
        try:
            # Submit CAPTCHA
            submit_url = 'https://api.anti-captcha.com/createTask'
            submit_data = {
                'clientKey': self.anticaptcha_api_key,
                'task': {
                    'type': 'ImageToTextTask',
                    'body': image_data
                }
            }
            
            response = requests.post(submit_url, json=submit_data, timeout=30)
            result = response.json()
            
            if result.get('errorId') == 0:
                task_id = result['taskId']
                
                # Wait and retrieve result
                result_url = 'https://api.anti-captcha.com/getTaskResult'
                
                for _ in range(30):  # Wait up to 5 minutes
                    time.sleep(10)
                    
                    result_data = {
                        'clientKey': self.anticaptcha_api_key,
                        'taskId': task_id
                    }
                    
                    result_response = requests.post(result_url, json=result_data, timeout=30)
                    result_json = result_response.json()
                    
                    if result_json.get('status') == 'ready':
                        answer = result_json['solution']['text']
                        return {
                            'success': True,
                            'answer': answer,
                            'confidence': 0.9,
                            'method': 'anticaptcha',
                            'task_id': task_id
                        }
                    elif result_json.get('status') != 'processing':
                        return {
                            'success': False,
                            'error': f'Anti-captcha error: {result_json.get("errorDescription", "Unknown error")}'
                        }
                
                return {'success': False, 'error': 'Anti-captcha timeout'}
            else:
                return {
                    'success': False,
                    'error': f'Anti-captcha submit error: {result.get("errorDescription", "Unknown error")}'
                }
                
        except Exception as e:
            return {'success': False, 'error': f'Anti-captcha solving failed: {str(e)}'}
    
    async def solve_captcha(self, image_data, captcha_type='auto', ai_model='gpt-4-vision'):
        """Main method to solve CAPTCHA using multiple approaches"""
        start_time = time.time()
        
        try:
            # Auto-detect CAPTCHA type if not specified
            if captcha_type == 'auto':
                captcha_type = self.detect_captcha_type(image_data)
                logger.info(f"Detected CAPTCHA type: {captcha_type}")
            
            # Try AI vision first (faster and often more accurate)
            ai_result = await self.solve_with_ai_vision(image_data, captcha_type, ai_model)
            if ai_result['success']:
                duration = time.time() - start_time
                ai_result['duration'] = duration
                ai_result['captcha_type'] = captcha_type
                return ai_result
            
            # Fallback to 2captcha service
            service_result = await self.solve_with_service(image_data, captcha_type, '2captcha')
            if service_result['success']:
                duration = time.time() - start_time
                service_result['duration'] = duration
                service_result['captcha_type'] = captcha_type
                return service_result
            
            # Fallback to anti-captcha service
            service_result = await self.solve_with_service(image_data, captcha_type, 'anticaptcha')
            if service_result['success']:
                duration = time.time() - start_time
                service_result['duration'] = duration
                service_result['captcha_type'] = captcha_type
                return service_result
            
            # All methods failed
            duration = time.time() - start_time
            return {
                'success': False,
                'error': 'All solving methods failed',
                'duration': duration,
                'captcha_type': captcha_type,
                'attempts': ['ai_vision', '2captcha', 'anticaptcha']
            }
            
        except Exception as e:
            duration = time.time() - start_time
            return {
                'success': False,
                'error': f'CAPTCHA solving failed: {str(e)}',
                'duration': duration,
                'captcha_type': captcha_type
            }

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python intelligent_captcha_solver.py <image_base64> <captcha_type> [ai_model]'
        }))
        return
    
    image_data = sys.argv[1]
    captcha_type = sys.argv[2]
    ai_model = sys.argv[3] if len(sys.argv) > 3 else 'gpt-4-vision'
    
    solver = IntelligentCaptchaSolver()
    
    # Run async function
    import asyncio
    result = asyncio.run(solver.solve_captcha(image_data, captcha_type, ai_model))
    
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()