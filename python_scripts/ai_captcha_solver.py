#!/usr/bin/env python3
"""
AI-powered CAPTCHA solver for FreebeeZ
Uses computer vision and machine learning to solve various CAPTCHA types
"""

import json
import sys
import base64
import cv2
import numpy as np
from PIL import Image
import io
import requests
import time
import os
from typing import Dict, Any, Optional, Tuple

class AICaptchaSolver:
    def __init__(self):
        self.supported_types = [
            'text_captcha',
            'math_captcha', 
            'image_selection',
            'recaptcha_v2',
            'hcaptcha',
            'simple_text'
        ]
        
        # Load environment variables for API keys
        self.twocaptcha_key = os.getenv('NEXT_PUBLIC_2CAPTCHA_KEY')
        self.anticaptcha_key = os.getenv('NEXT_PUBLIC_ANTICAPTCHA_KEY')
        
    def solve_captcha(self, image_b64: str, captcha_type: str) -> Dict[str, Any]:
        """Main method to solve CAPTCHA based on type"""
        try:
            # Decode base64 image
            image_data = base64.b64decode(image_b64)
            image = Image.open(io.BytesIO(image_data))
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            result = {
                'success': False,
                'solution': '',
                'confidence': 0.0,
                'method': 'unknown',
                'processing_time': 0
            }
            
            start_time = time.time()
            
            # Route to appropriate solver based on type
            if captcha_type == 'text_captcha':
                result = self.solve_text_captcha(cv_image)
            elif captcha_type == 'math_captcha':
                result = self.solve_math_captcha(cv_image)
            elif captcha_type == 'image_selection':
                result = self.solve_image_selection(cv_image)
            elif captcha_type == 'recaptcha_v2':
                result = self.solve_recaptcha_v2(image_b64)
            elif captcha_type == 'hcaptcha':
                result = self.solve_hcaptcha(image_b64)
            elif captcha_type == 'simple_text':
                result = self.solve_simple_text(cv_image)
            else:
                # Try generic approach
                result = self.solve_generic(cv_image)
                
            result['processing_time'] = time.time() - start_time
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'solution': '',
                'confidence': 0.0,
                'method': 'error',
                'processing_time': 0
            }
    
    def solve_text_captcha(self, image: np.ndarray) -> Dict[str, Any]:
        """Solve text-based CAPTCHA using OCR"""
        try:
            # Preprocess image for better OCR
            processed = self.preprocess_for_ocr(image)
            
            # Try multiple OCR approaches
            solutions = []
            
            # Method 1: Simple OCR
            try:
                import pytesseract
                text = pytesseract.image_to_string(processed, config='--psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
                if text.strip():
                    solutions.append({
                        'text': text.strip(),
                        'confidence': 0.7,
                        'method': 'tesseract'
                    })
            except:
                pass
            
            # Method 2: EasyOCR
            try:
                import easyocr
                reader = easyocr.Reader(['en'])
                results = reader.readtext(processed)
                for (bbox, text, conf) in results:
                    if conf > 0.5:
                        solutions.append({
                            'text': text.strip(),
                            'confidence': conf,
                            'method': 'easyocr'
                        })
            except:
                pass
            
            # Method 3: Custom CNN (if available)
            cnn_result = self.solve_with_cnn(processed)
            if cnn_result['success']:
                solutions.append(cnn_result)
            
            # Select best solution
            if solutions:
                best = max(solutions, key=lambda x: x['confidence'])
                return {
                    'success': True,
                    'solution': best['text'],
                    'confidence': best['confidence'],
                    'method': best['method']
                }
            
            return {'success': False, 'solution': '', 'confidence': 0.0, 'method': 'ocr_failed'}
            
        except Exception as e:
            return {'success': False, 'error': str(e), 'solution': '', 'confidence': 0.0, 'method': 'error'}
    
    def solve_math_captcha(self, image: np.ndarray) -> Dict[str, Any]:
        """Solve mathematical CAPTCHA"""
        try:
            # Extract text using OCR
            processed = self.preprocess_for_ocr(image)
            
            import pytesseract
            text = pytesseract.image_to_string(processed, config='--psm 8')
            
            # Parse mathematical expression
            import re
            
            # Look for patterns like "5 + 3 = ?" or "What is 7 - 2?"
            patterns = [
                r'(\d+)\s*[\+\-\*\/]\s*(\d+)',
                r'What is (\d+)\s*[\+\-\*\/]\s*(\d+)',
                r'(\d+)\s*[\+\-\*\/]\s*(\d+)\s*=\s*\?'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text)
                if match:
                    # Extract numbers and operator
                    full_match = match.group(0)
                    if '+' in full_match:
                        nums = re.findall(r'\d+', full_match)
                        if len(nums) >= 2:
                            result = int(nums[0]) + int(nums[1])
                    elif '-' in full_match:
                        nums = re.findall(r'\d+', full_match)
                        if len(nums) >= 2:
                            result = int(nums[0]) - int(nums[1])
                    elif '*' in full_match:
                        nums = re.findall(r'\d+', full_match)
                        if len(nums) >= 2:
                            result = int(nums[0]) * int(nums[1])
                    elif '/' in full_match:
                        nums = re.findall(r'\d+', full_match)
                        if len(nums) >= 2 and int(nums[1]) != 0:
                            result = int(nums[0]) // int(nums[1])
                    
                    return {
                        'success': True,
                        'solution': str(result),
                        'confidence': 0.9,
                        'method': 'math_parser'
                    }
            
            return {'success': False, 'solution': '', 'confidence': 0.0, 'method': 'math_parse_failed'}
            
        except Exception as e:
            return {'success': False, 'error': str(e), 'solution': '', 'confidence': 0.0, 'method': 'error'}
    
    def solve_image_selection(self, image: np.ndarray) -> Dict[str, Any]:
        """Solve image selection CAPTCHA (like "Select all traffic lights")"""
        try:
            # This would require a trained model for object detection
            # For now, return a placeholder implementation
            
            # Detect grid structure
            grid_info = self.detect_image_grid(image)
            
            if grid_info['detected']:
                # Simulate object detection (in real implementation, use YOLO or similar)
                selected_cells = self.simulate_object_detection(image, grid_info)
                
                return {
                    'success': True,
                    'solution': selected_cells,
                    'confidence': 0.6,
                    'method': 'object_detection_simulation'
                }
            
            return {'success': False, 'solution': '', 'confidence': 0.0, 'method': 'grid_not_detected'}
            
        except Exception as e:
            return {'success': False, 'error': str(e), 'solution': '', 'confidence': 0.0, 'method': 'error'}
    
    def solve_recaptcha_v2(self, image_b64: str) -> Dict[str, Any]:
        """Solve reCAPTCHA v2 using external service"""
        if not self.twocaptcha_key and not self.anticaptcha_key:
            return {
                'success': False,
                'solution': '',
                'confidence': 0.0,
                'method': 'no_api_key',
                'error': 'No CAPTCHA solving API key configured'
            }
        
        try:
            # Try 2captcha first
            if self.twocaptcha_key:
                result = self.solve_with_2captcha(image_b64, 'recaptcha')
                if result['success']:
                    return result
            
            # Try anticaptcha as fallback
            if self.anticaptcha_key:
                result = self.solve_with_anticaptcha(image_b64, 'recaptcha')
                if result['success']:
                    return result
            
            return {'success': False, 'solution': '', 'confidence': 0.0, 'method': 'external_service_failed'}
            
        except Exception as e:
            return {'success': False, 'error': str(e), 'solution': '', 'confidence': 0.0, 'method': 'error'}
    
    def solve_hcaptcha(self, image_b64: str) -> Dict[str, Any]:
        """Solve hCaptcha using external service"""
        if not self.twocaptcha_key and not self.anticaptcha_key:
            return {
                'success': False,
                'solution': '',
                'confidence': 0.0,
                'method': 'no_api_key',
                'error': 'No CAPTCHA solving API key configured'
            }
        
        try:
            # Try 2captcha first
            if self.twocaptcha_key:
                result = self.solve_with_2captcha(image_b64, 'hcaptcha')
                if result['success']:
                    return result
            
            # Try anticaptcha as fallback
            if self.anticaptcha_key:
                result = self.solve_with_anticaptcha(image_b64, 'hcaptcha')
                if result['success']:
                    return result
            
            return {'success': False, 'solution': '', 'confidence': 0.0, 'method': 'external_service_failed'}
            
        except Exception as e:
            return {'success': False, 'error': str(e), 'solution': '', 'confidence': 0.0, 'method': 'error'}
    
    def solve_simple_text(self, image: np.ndarray) -> Dict[str, Any]:
        """Solve simple text CAPTCHA with basic preprocessing"""
        try:
            # Apply aggressive preprocessing for simple text
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Remove noise
            denoised = cv2.medianBlur(gray, 3)
            
            # Threshold
            _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Morphological operations
            kernel = np.ones((2, 2), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            # OCR with specific config for simple text
            import pytesseract
            text = pytesseract.image_to_string(cleaned, config='--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
            
            if text.strip():
                return {
                    'success': True,
                    'solution': text.strip(),
                    'confidence': 0.8,
                    'method': 'simple_ocr'
                }
            
            return {'success': False, 'solution': '', 'confidence': 0.0, 'method': 'simple_ocr_failed'}
            
        except Exception as e:
            return {'success': False, 'error': str(e), 'solution': '', 'confidence': 0.0, 'method': 'error'}
    
    def solve_generic(self, image: np.ndarray) -> Dict[str, Any]:
        """Generic solver that tries multiple approaches"""
        try:
            # Try text extraction first
            text_result = self.solve_text_captcha(image)
            if text_result['success']:
                return text_result
            
            # Try math solving
            math_result = self.solve_math_captcha(image)
            if math_result['success']:
                return math_result
            
            # Try simple text
            simple_result = self.solve_simple_text(image)
            if simple_result['success']:
                return simple_result
            
            return {'success': False, 'solution': '', 'confidence': 0.0, 'method': 'all_methods_failed'}
            
        except Exception as e:
            return {'success': False, 'error': str(e), 'solution': '', 'confidence': 0.0, 'method': 'error'}
    
    def preprocess_for_ocr(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better OCR results"""
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Resize if too small
        height, width = gray.shape
        if height < 50 or width < 100:
            scale = max(50/height, 100/width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            gray = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        # Denoise
        denoised = cv2.medianBlur(gray, 3)
        
        # Enhance contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # Threshold
        _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        return thresh
    
    def solve_with_cnn(self, image: np.ndarray) -> Dict[str, Any]:
        """Solve using custom CNN model (placeholder)"""
        # This would load a pre-trained CNN model for CAPTCHA solving
        # For now, return failure
        return {'success': False, 'solution': '', 'confidence': 0.0, 'method': 'cnn_not_available'}
    
    def detect_image_grid(self, image: np.ndarray) -> Dict[str, Any]:
        """Detect grid structure in image selection CAPTCHAs"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            
            # Detect horizontal and vertical lines
            horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1))
            vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 25))
            
            horizontal_lines = cv2.morphologyEx(edges, cv2.MORPH_OPEN, horizontal_kernel)
            vertical_lines = cv2.morphologyEx(edges, cv2.MORPH_OPEN, vertical_kernel)
            
            # Count lines to estimate grid size
            h_lines = cv2.HoughLinesP(horizontal_lines, 1, np.pi/180, threshold=50, minLineLength=50, maxLineGap=10)
            v_lines = cv2.HoughLinesP(vertical_lines, 1, np.pi/180, threshold=50, minLineLength=50, maxLineGap=10)
            
            if h_lines is not None and v_lines is not None:
                return {
                    'detected': True,
                    'grid_size': (len(v_lines) - 1, len(h_lines) - 1),
                    'confidence': 0.7
                }
            
            return {'detected': False, 'grid_size': (0, 0), 'confidence': 0.0}
            
        except Exception as e:
            return {'detected': False, 'error': str(e), 'grid_size': (0, 0), 'confidence': 0.0}
    
    def simulate_object_detection(self, image: np.ndarray, grid_info: Dict[str, Any]) -> str:
        """Simulate object detection for image selection (placeholder)"""
        # In a real implementation, this would use YOLO, SSD, or similar
        # For now, return random selection
        import random
        
        grid_size = grid_info['grid_size']
        total_cells = grid_size[0] * grid_size[1]
        
        # Randomly select 2-4 cells
        num_selected = random.randint(2, min(4, total_cells))
        selected = random.sample(range(total_cells), num_selected)
        
        return ','.join(map(str, selected))
    
    def solve_with_2captcha(self, image_b64: str, captcha_type: str) -> Dict[str, Any]:
        """Solve CAPTCHA using 2captcha service"""
        try:
            # Submit CAPTCHA
            submit_url = "http://2captcha.com/in.php"
            submit_data = {
                'key': self.twocaptcha_key,
                'method': 'base64',
                'body': image_b64
            }
            
            response = requests.post(submit_url, data=submit_data, timeout=30)
            
            if response.text.startswith('OK|'):
                captcha_id = response.text.split('|')[1]
                
                # Wait and get result
                result_url = "http://2captcha.com/res.php"
                
                for _ in range(30):  # Wait up to 5 minutes
                    time.sleep(10)
                    
                    result_response = requests.get(result_url, params={
                        'key': self.twocaptcha_key,
                        'action': 'get',
                        'id': captcha_id
                    }, timeout=30)
                    
                    if result_response.text.startswith('OK|'):
                        solution = result_response.text.split('|')[1]
                        return {
                            'success': True,
                            'solution': solution,
                            'confidence': 0.9,
                            'method': '2captcha'
                        }
                    elif result_response.text != 'CAPCHA_NOT_READY':
                        break
                
                return {'success': False, 'solution': '', 'confidence': 0.0, 'method': '2captcha_timeout'}
            
            return {'success': False, 'solution': '', 'confidence': 0.0, 'method': '2captcha_submit_failed'}
            
        except Exception as e:
            return {'success': False, 'error': str(e), 'solution': '', 'confidence': 0.0, 'method': '2captcha_error'}
    
    def solve_with_anticaptcha(self, image_b64: str, captcha_type: str) -> Dict[str, Any]:
        """Solve CAPTCHA using anticaptcha service"""
        try:
            # Submit CAPTCHA
            submit_url = "https://api.anti-captcha.com/createTask"
            submit_data = {
                'clientKey': self.anticaptcha_key,
                'task': {
                    'type': 'ImageToTextTask',
                    'body': image_b64
                }
            }
            
            response = requests.post(submit_url, json=submit_data, timeout=30)
            result = response.json()
            
            if result.get('errorId') == 0:
                task_id = result['taskId']
                
                # Wait and get result
                result_url = "https://api.anti-captcha.com/getTaskResult"
                
                for _ in range(30):  # Wait up to 5 minutes
                    time.sleep(10)
                    
                    result_data = {
                        'clientKey': self.anticaptcha_key,
                        'taskId': task_id
                    }
                    
                    result_response = requests.post(result_url, json=result_data, timeout=30)
                    result_json = result_response.json()
                    
                    if result_json.get('status') == 'ready':
                        solution = result_json['solution']['text']
                        return {
                            'success': True,
                            'solution': solution,
                            'confidence': 0.9,
                            'method': 'anticaptcha'
                        }
                    elif result_json.get('status') != 'processing':
                        break
                
                return {'success': False, 'solution': '', 'confidence': 0.0, 'method': 'anticaptcha_timeout'}
            
            return {'success': False, 'solution': '', 'confidence': 0.0, 'method': 'anticaptcha_submit_failed'}
            
        except Exception as e:
            return {'success': False, 'error': str(e), 'solution': '', 'confidence': 0.0, 'method': 'anticaptcha_error'}

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'success': False, 'error': 'Usage: python ai_captcha_solver.py <image_base64> <captcha_type>'}))
        return
    
    try:
        image_b64 = sys.argv[1]
        captcha_type = sys.argv[2]
        
        solver = AICaptchaSolver()
        result = solver.solve_captcha(image_b64, captcha_type)
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))

if __name__ == '__main__':
    main()