#!/usr/bin/env python3
"""
Email verification link extractor for FreebeeZ
Extracts verification links from email content
"""

import json
import sys
import re
from urllib.parse import urlparse, parse_qs
from bs4 import BeautifulSoup
import base64
from typing import List, Dict, Any, Optional

class EmailLinkExtractor:
    def __init__(self):
        self.verification_patterns = [
            # Common verification link patterns
            r'https?://[^\s<>"]+(?:verify|confirm|activate|validation)[^\s<>"]*',
            r'https?://[^\s<>"]+[?&](?:token|code|key|verify|confirm)[^\s<>"]*',
            r'https?://[^\s<>"]+/(?:verify|confirm|activate|validation)/[^\s<>"]*',
            
            # Service-specific patterns
            r'https?://account\.proton\.me/[^\s<>"]*verify[^\s<>"]*',
            r'https?://[^\s<>"]*\.tutanota\.com/[^\s<>"]*verify[^\s<>"]*',
            r'https?://[^\s<>"]*\.mega\.nz/[^\s<>"]*verify[^\s<>"]*',
            r'https?://[^\s<>"]*\.netlify\.com/[^\s<>"]*verify[^\s<>"]*',
            r'https?://[^\s<>"]*\.vercel\.com/[^\s<>"]*verify[^\s<>"]*',
            r'https?://[^\s<>"]*github\.com/[^\s<>"]*verify[^\s<>"]*',
            
            # Generic activation patterns
            r'https?://[^\s<>"]+[?&]action=(?:verify|confirm|activate)[^\s<>"]*',
            r'https?://[^\s<>"]+/(?:auth|account)/[^\s<>"]*(?:verify|confirm)[^\s<>"]*'
        ]
        
        self.verification_keywords = [
            'verify', 'confirm', 'activate', 'validation', 'authenticate',
            'click here', 'complete registration', 'finish setup',
            'verify email', 'confirm email', 'activate account'
        ]
        
        self.common_domains = [
            'protonmail.com', 'proton.me', 'tutanota.com', 'mega.nz',
            'netlify.com', 'vercel.com', 'github.com', 'railway.app',
            'planetscale.com', 'supabase.com', 'huggingface.co'
        ]
    
    def extract_verification_links(self, email_content: str) -> Dict[str, Any]:
        """Extract verification links from email content"""
        try:
            results = {
                'success': True,
                'links': [],
                'primary_link': None,
                'confidence_scores': {},
                'email_analysis': {}
            }
            
            # Analyze email content
            analysis = self.analyze_email_content(email_content)
            results['email_analysis'] = analysis
            
            # Extract links using different methods
            all_links = []
            
            # Method 1: Regex pattern matching
            regex_links = self.extract_with_regex(email_content)
            all_links.extend(regex_links)
            
            # Method 2: HTML parsing
            html_links = self.extract_from_html(email_content)
            all_links.extend(html_links)
            
            # Method 3: Plain text parsing
            text_links = self.extract_from_text(email_content)
            all_links.extend(text_links)
            
            # Remove duplicates and score links
            unique_links = list(set(all_links))
            scored_links = []
            
            for link in unique_links:
                score = self.score_verification_link(link, email_content)
                if score > 0.3:  # Only include links with reasonable confidence
                    scored_links.append({
                        'url': link,
                        'confidence': score,
                        'type': self.classify_link_type(link),
                        'domain': urlparse(link).netloc,
                        'parameters': self.extract_link_parameters(link)
                    })
            
            # Sort by confidence
            scored_links.sort(key=lambda x: x['confidence'], reverse=True)
            
            results['links'] = scored_links
            if scored_links:
                results['primary_link'] = scored_links[0]['url']
                results['confidence_scores'] = {
                    link['url']: link['confidence'] for link in scored_links
                }
            
            return results
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'links': [],
                'primary_link': None,
                'confidence_scores': {},
                'email_analysis': {}
            }
    
    def analyze_email_content(self, content: str) -> Dict[str, Any]:
        """Analyze email content to understand context"""
        analysis = {
            'is_html': False,
            'sender_domain': None,
            'subject': None,
            'contains_verification_keywords': False,
            'language': 'en',
            'content_length': len(content)
        }
        
        # Check if HTML
        if '<html' in content.lower() or '<body' in content.lower():
            analysis['is_html'] = True
        
        # Extract sender information
        sender_match = re.search(r'From:.*?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', content, re.IGNORECASE)
        if sender_match:
            analysis['sender_domain'] = sender_match.group(1)
        
        # Extract subject
        subject_match = re.search(r'Subject:\s*(.+)', content, re.IGNORECASE)
        if subject_match:
            analysis['subject'] = subject_match.group(1).strip()
        
        # Check for verification keywords
        content_lower = content.lower()
        for keyword in self.verification_keywords:
            if keyword in content_lower:
                analysis['contains_verification_keywords'] = True
                break
        
        return analysis
    
    def extract_with_regex(self, content: str) -> List[str]:
        """Extract links using regex patterns"""
        links = []
        
        for pattern in self.verification_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            links.extend(matches)
        
        return links
    
    def extract_from_html(self, content: str) -> List[str]:
        """Extract links from HTML content"""
        links = []
        
        try:
            soup = BeautifulSoup(content, 'html.parser')
            
            # Find all anchor tags
            for a_tag in soup.find_all('a', href=True):
                href = a_tag['href']
                text = a_tag.get_text().lower()
                
                # Check if link or text contains verification keywords
                if any(keyword in href.lower() or keyword in text for keyword in self.verification_keywords):
                    links.append(href)
                
                # Check for common verification URL patterns
                if any(pattern in href.lower() for pattern in ['verify', 'confirm', 'activate', 'token=']):
                    links.append(href)
            
            # Also check for links in button elements
            for button in soup.find_all(['button', 'input'], {'onclick': True}):
                onclick = button.get('onclick', '')
                url_match = re.search(r'https?://[^\'"]+', onclick)
                if url_match:
                    links.append(url_match.group())
            
        except Exception as e:
            # If HTML parsing fails, fall back to regex
            pass
        
        return links
    
    def extract_from_text(self, content: str) -> List[str]:
        """Extract links from plain text content"""
        links = []
        
        # Find all URLs in text
        url_pattern = r'https?://[^\s<>"\'\[\]{}|\\^`]+'
        all_urls = re.findall(url_pattern, content)
        
        for url in all_urls:
            # Clean up URL (remove trailing punctuation)
            url = re.sub(r'[.,;:!?)\]}]+$', '', url)
            
            # Check if URL looks like a verification link
            if any(keyword in url.lower() for keyword in ['verify', 'confirm', 'activate', 'token', 'code']):
                links.append(url)
        
        return links
    
    def score_verification_link(self, link: str, email_content: str) -> float:
        """Score a link based on how likely it is to be a verification link"""
        score = 0.0
        link_lower = link.lower()
        content_lower = email_content.lower()
        
        # Domain scoring
        domain = urlparse(link).netloc.lower()
        if any(common_domain in domain for common_domain in self.common_domains):
            score += 0.3
        
        # Path scoring
        path = urlparse(link).path.lower()
        if 'verify' in path:
            score += 0.4
        elif 'confirm' in path:
            score += 0.35
        elif 'activate' in path:
            score += 0.3
        elif 'auth' in path:
            score += 0.2
        
        # Query parameter scoring
        query = urlparse(link).query.lower()
        if 'token=' in query:
            score += 0.3
        elif 'code=' in query:
            score += 0.25
        elif 'key=' in query:
            score += 0.2
        elif 'verify' in query:
            score += 0.25
        
        # Context scoring (surrounding text)
        link_index = content_lower.find(link.lower())
        if link_index != -1:
            # Check text around the link
            start = max(0, link_index - 100)
            end = min(len(content_lower), link_index + len(link) + 100)
            context = content_lower[start:end]
            
            for keyword in self.verification_keywords:
                if keyword in context:
                    score += 0.1
                    break
        
        # Length scoring (verification links are usually longer)
        if len(link) > 50:
            score += 0.1
        elif len(link) > 100:
            score += 0.15
        
        # HTTPS bonus
        if link.startswith('https://'):
            score += 0.05
        
        return min(score, 1.0)  # Cap at 1.0
    
    def classify_link_type(self, link: str) -> str:
        """Classify the type of verification link"""
        link_lower = link.lower()
        
        if 'email' in link_lower and 'verify' in link_lower:
            return 'email_verification'
        elif 'account' in link_lower and ('activate' in link_lower or 'confirm' in link_lower):
            return 'account_activation'
        elif 'password' in link_lower and 'reset' in link_lower:
            return 'password_reset'
        elif 'unsubscribe' in link_lower:
            return 'unsubscribe'
        elif 'token=' in link_lower or 'code=' in link_lower:
            return 'token_verification'
        else:
            return 'generic_verification'
    
    def extract_link_parameters(self, link: str) -> Dict[str, str]:
        """Extract important parameters from verification link"""
        parsed = urlparse(link)
        params = parse_qs(parsed.query)
        
        # Flatten single-value parameters
        flattened = {}
        for key, values in params.items():
            if len(values) == 1:
                flattened[key] = values[0]
            else:
                flattened[key] = values
        
        return flattened
    
    def extract_verification_code(self, email_content: str) -> Dict[str, Any]:
        """Extract verification codes from email content"""
        try:
            codes = []
            
            # Common verification code patterns
            code_patterns = [
                r'verification code[:\s]+([A-Z0-9]{4,8})',
                r'your code[:\s]+([A-Z0-9]{4,8})',
                r'enter code[:\s]+([A-Z0-9]{4,8})',
                r'code[:\s]+([A-Z0-9]{6})',
                r'([A-Z0-9]{6})\s+is your verification code',
                r'([0-9]{4,6})\s+is your code'
            ]
            
            for pattern in code_patterns:
                matches = re.findall(pattern, email_content, re.IGNORECASE)
                codes.extend(matches)
            
            # Remove duplicates
            unique_codes = list(set(codes))
            
            return {
                'success': True,
                'codes': unique_codes,
                'primary_code': unique_codes[0] if unique_codes else None
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'codes': [],
                'primary_code': None
            }
    
    def extract_temporary_password(self, email_content: str) -> Dict[str, Any]:
        """Extract temporary passwords from email content"""
        try:
            passwords = []
            
            # Temporary password patterns
            password_patterns = [
                r'temporary password[:\s]+([A-Za-z0-9!@#$%^&*]{8,})',
                r'your password[:\s]+([A-Za-z0-9!@#$%^&*]{8,})',
                r'password[:\s]+([A-Za-z0-9!@#$%^&*]{8,})',
                r'login with[:\s]+([A-Za-z0-9!@#$%^&*]{8,})'
            ]
            
            for pattern in password_patterns:
                matches = re.findall(pattern, email_content, re.IGNORECASE)
                passwords.extend(matches)
            
            # Filter out common false positives
            filtered_passwords = []
            for pwd in passwords:
                if len(pwd) >= 8 and not pwd.lower() in ['password', 'your password', 'temporary']:
                    filtered_passwords.append(pwd)
            
            return {
                'success': True,
                'passwords': filtered_passwords,
                'primary_password': filtered_passwords[0] if filtered_passwords else None
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'passwords': [],
                'primary_password': None
            }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No email content provided'}))
        return
    
    try:
        email_content = sys.argv[1]
        
        # Decode if base64 encoded
        try:
            decoded_content = base64.b64decode(email_content).decode('utf-8')
            email_content = decoded_content
        except:
            # Not base64 encoded, use as is
            pass
        
        extractor = EmailLinkExtractor()
        
        # Extract verification links
        link_results = extractor.extract_verification_links(email_content)
        
        # Extract verification codes
        code_results = extractor.extract_verification_code(email_content)
        
        # Extract temporary passwords
        password_results = extractor.extract_temporary_password(email_content)
        
        # Combine results
        combined_results = {
            'success': True,
            'verification_links': link_results,
            'verification_codes': code_results,
            'temporary_passwords': password_results
        }
        
        print(json.dumps(combined_results))
        
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))

if __name__ == '__main__':
    main()