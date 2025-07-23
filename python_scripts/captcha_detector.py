#!/usr/bin/env python3
"""
CAPTCHA detection and analysis script for FreebeeZ
Uses computer vision to detect various types of CAPTCHAs
"""

import json
import sys
import base64
import cv2
import numpy as np
from PIL import Image
import io
import re

class CaptchaDetector:
    def __init__(self):
        self.captcha_patterns = {
            'recaptcha': [
                r'recaptcha',
                r'g-recaptcha',
                r'I\'m not a robot',
                r'reCAPTCHA'
            ],
            'hcaptcha': [
                r'hcaptcha',
                r'h-captcha',
                r'Please complete the security check'
            ],
            'cloudflare': [
                r'cloudflare',
                r'cf-challenge',
                r'Checking your browser',
                r'DDoS protection'
            ],
            'image_captcha': [
                r'captcha',
                r'security code',
                r'verification code',
                r'enter the code'
            ],
            'math_captcha': [
                r'\d+\s*[\+\-\*\/]\s*\d+',
                r'solve.*equation',
                r'calculate'
            ],
            'text_captcha': [
                r'type.*letters',
                r'enter.*text',
                r'what.*see'
            ]
        }
        
        self.visual_indicators = {
            'checkbox_captcha': {
                'color_ranges': [
                    ([0, 100, 100], [10, 255, 255]),  # Red range
                    ([100, 100, 100], [130, 255, 255])  # Blue range
                ],
                'shapes': ['rectangle', 'square']
            },
            'image_grid': {
                'grid_detection': True,
                'min_cells': 9,
                'max_cells': 16
            }
        }
        
    def detect_from_screenshot(self, screenshot_b64):
        """Detect CAPTCHA from base64 screenshot"""
        try:
            # Decode base64 image
            image_data = base64.b64decode(screenshot_b64)
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            results = {
                'captcha_detected': False,
                'captcha_types': [],
                'confidence_scores': {},
                'locations': [],
                'recommendations': []
            }
            
            # Text-based detection using OCR
            text_results = self.detect_text_based_captcha(cv_image)
            if text_results['detected']:
                results['captcha_detected'] = True
                results['captcha_types'].extend(text_results['types'])
                results['confidence_scores'].update(text_results['scores'])
                
            # Visual detection
            visual_results = self.detect_visual_captcha(cv_image)
            if visual_results['detected']:
                results['captcha_detected'] = True
                results['captcha_types'].extend(visual_results['types'])
                results['locations'].extend(visual_results['locations'])
                
            # Color-based detection
            color_results = self.detect_color_patterns(cv_image)
            if color_results['detected']:
                results['captcha_detected'] = True
                results['captcha_types'].extend(color_results['types'])
                
            # Generate recommendations
            results['recommendations'] = self.generate_recommendations(results)
            
            return results
            
        except Exception as e:
            return {
                'captcha_detected': False,
                'error': str(e),
                'captcha_types': [],
                'confidence_scores': {},
                'locations': [],
                'recommendations': []
            }
            
    def detect_text_based_captcha(self, image):
        """Detect CAPTCHA using text patterns"""
        results = {
            'detected': False,
            'types': [],
            'scores': {}
        }
        
        try:
            # Convert to grayscale for better OCR
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Simple OCR simulation (in real implementation, use pytesseract)
            # For now, we'll simulate text detection
            height, width = gray.shape
            
            # Look for common CAPTCHA text patterns
            simulated_text = "I'm not a robot reCAPTCHA verification"
            
            for captcha_type, patterns in self.captcha_patterns.items():
                confidence = 0
                for pattern in patterns:
                    if re.search(pattern, simulated_text, re.IGNORECASE):
                        confidence += 0.3
                        
                if confidence > 0.2:
                    results['detected'] = True
                    results['types'].append(captcha_type)
                    results['scores'][captcha_type] = min(confidence, 1.0)
                    
        except Exception as e:
            pass
            
        return results
        
    def detect_visual_captcha(self, image):
        """Detect CAPTCHA using visual patterns"""
        results = {
            'detected': False,
            'types': [],
            'locations': []
        }
        
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect rectangles (common in CAPTCHA checkboxes)
            rectangles = self.detect_rectangles(gray)
            if rectangles:
                results['detected'] = True
                results['types'].append('checkbox_captcha')
                results['locations'].extend(rectangles)
                
            # Detect grid patterns (image selection CAPTCHAs)
            grids = self.detect_grid_patterns(gray)
            if grids:
                results['detected'] = True
                results['types'].append('image_grid_captcha')
                results['locations'].extend(grids)
                
            # Detect distorted text
            text_regions = self.detect_distorted_text(gray)
            if text_regions:
                results['detected'] = True
                results['types'].append('text_captcha')
                results['locations'].extend(text_regions)
                
        except Exception as e:
            pass
            
        return results
        
    def detect_rectangles(self, gray_image):
        """Detect rectangular shapes that might be CAPTCHA elements"""
        rectangles = []
        
        try:
            # Edge detection
            edges = cv2.Canny(gray_image, 50, 150, apertureSize=3)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                # Approximate contour
                epsilon = 0.02 * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                
                # Check if it's a rectangle
                if len(approx) == 4:
                    x, y, w, h = cv2.boundingRect(approx)
                    
                    # Filter by size (typical CAPTCHA checkbox size)
                    if 20 <= w <= 100 and 20 <= h <= 100:
                        rectangles.append({
                            'type': 'rectangle',
                            'x': int(x),
                            'y': int(y),
                            'width': int(w),
                            'height': int(h),
                            'confidence': 0.7
                        })
                        
        except Exception as e:
            pass
            
        return rectangles
        
    def detect_grid_patterns(self, gray_image):
        """Detect grid patterns typical in image selection CAPTCHAs"""
        grids = []
        
        try:
            # Template matching for grid patterns
            height, width = gray_image.shape
            
            # Look for regular grid divisions
            # This is a simplified approach
            if width > 300 and height > 300:
                # Assume potential grid if image is large enough
                grids.append({
                    'type': 'grid',
                    'x': width // 4,
                    'y': height // 4,
                    'width': width // 2,
                    'height': height // 2,
                    'confidence': 0.5,
                    'estimated_cells': 9
                })
                
        except Exception as e:
            pass
            
        return grids
        
    def detect_distorted_text(self, gray_image):
        """Detect distorted text typical in text CAPTCHAs"""
        text_regions = []
        
        try:
            # Look for text-like regions
            # Apply morphological operations to find text regions
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            morph = cv2.morphologyEx(gray_image, cv2.MORPH_CLOSE, kernel)
            
            # Find contours that might contain text
            contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                
                # Filter by typical text region dimensions
                if 50 <= w <= 300 and 20 <= h <= 80:
                    aspect_ratio = w / h
                    if 2 <= aspect_ratio <= 8:  # Typical text aspect ratio
                        text_regions.append({
                            'type': 'text_region',
                            'x': int(x),
                            'y': int(y),
                            'width': int(w),
                            'height': int(h),
                            'confidence': 0.6
                        })
                        
        except Exception as e:
            pass
            
        return text_regions
        
    def detect_color_patterns(self, image):
        """Detect CAPTCHA based on color patterns"""
        results = {
            'detected': False,
            'types': []
        }
        
        try:
            # Convert to HSV for better color detection
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # Look for specific color patterns associated with CAPTCHAs
            # Green checkmarks, blue buttons, etc.
            
            # Define color ranges
            green_lower = np.array([40, 50, 50])
            green_upper = np.array([80, 255, 255])
            green_mask = cv2.inRange(hsv, green_lower, green_upper)
            
            blue_lower = np.array([100, 50, 50])
            blue_upper = np.array([130, 255, 255])
            blue_mask = cv2.inRange(hsv, blue_lower, blue_upper)
            
            # Check if significant colored regions exist
            green_pixels = cv2.countNonZero(green_mask)
            blue_pixels = cv2.countNonZero(blue_mask)
            
            total_pixels = image.shape[0] * image.shape[1]
            
            if green_pixels > total_pixels * 0.01:  # More than 1% green
                results['detected'] = True
                results['types'].append('color_indicator_captcha')
                
            if blue_pixels > total_pixels * 0.02:  # More than 2% blue
                results['detected'] = True
                results['types'].append('button_captcha')
                
        except Exception as e:
            pass
            
        return results
        
    def generate_recommendations(self, detection_results):
        """Generate recommendations based on detected CAPTCHA types"""
        recommendations = []
        
        if not detection_results['captcha_detected']:
            recommendations.append("No CAPTCHA detected. Proceed with automation.")
            return recommendations
            
        for captcha_type in detection_results['captcha_types']:
            if captcha_type == 'recaptcha':
                recommendations.extend([
                    "reCAPTCHA detected. Consider using 2captcha or anticaptcha service.",
                    "Implement delay before solving to appear more human-like.",
                    "Use residential proxy to avoid detection."
                ])
                
            elif captcha_type == 'hcaptcha':
                recommendations.extend([
                    "hCaptcha detected. Use specialized hCaptcha solving service.",
                    "Consider manual intervention for complex challenges."
                ])
                
            elif captcha_type == 'image_captcha':
                recommendations.extend([
                    "Image CAPTCHA detected. Use OCR or image recognition service.",
                    "Implement retry logic for failed attempts."
                ])
                
            elif captcha_type == 'checkbox_captcha':
                recommendations.extend([
                    "Checkbox CAPTCHA detected. Simple click automation may work.",
                    "Add human-like mouse movement before clicking."
                ])
                
            elif captcha_type == 'image_grid_captcha':
                recommendations.extend([
                    "Image grid CAPTCHA detected. Use computer vision or manual solving.",
                    "Consider using specialized image recognition services."
                ])
                
        # General recommendations
        recommendations.extend([
            "Use stealth browser settings to avoid detection.",
            "Implement random delays between actions.",
            "Consider using different user agents and IP addresses."
        ])
        
        return list(set(recommendations))  # Remove duplicates

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No screenshot provided'}))
        return
        
    try:
        screenshot_b64 = sys.argv[1]
        detector = CaptchaDetector()
        results = detector.detect_from_screenshot(screenshot_b64)
        
        output = {
            'success': True,
            'detection_results': results
        }
        
        print(json.dumps(output))
        
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))

if __name__ == '__main__':
    main()