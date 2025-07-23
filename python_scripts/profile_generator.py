#!/usr/bin/env python3
"""
Advanced profile generator for FreebeeZ
Creates realistic user profiles with consistent data
"""

import json
import random
import string
from faker import Faker
from datetime import datetime, timedelta
import hashlib

fake = Faker()

class ProfileGenerator:
    def __init__(self):
        self.domains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'protonmail.com', 'tutanota.com', 'yandex.com',
            'icloud.com', 'aol.com', 'zoho.com'
        ]
        
        self.password_patterns = [
            '{word}{number}!',
            '{Word}{number}#{symbol}',
            '{word}_{number}_{word}',
            '{Word}{word}{number}',
            '{number}{Word}!{number}'
        ]
        
        self.interests = [
            'technology', 'gaming', 'music', 'movies', 'sports',
            'travel', 'cooking', 'reading', 'photography', 'art',
            'fitness', 'nature', 'science', 'history', 'fashion'
        ]
        
    def generate_consistent_profile(self, seed=None):
        """Generate a consistent profile that can be reproduced"""
        if seed:
            fake.seed_instance(seed)
            random.seed(seed)
            
        # Basic info
        first_name = fake.first_name()
        last_name = fake.last_name()
        birth_date = fake.date_of_birth(minimum_age=18, maximum_age=65)
        
        # Generate consistent username variations
        username_base = f"{first_name.lower()}{last_name.lower()}"
        username_variations = [
            username_base,
            f"{first_name.lower()}.{last_name.lower()}",
            f"{first_name.lower()}_{last_name.lower()}",
            f"{first_name.lower()}{last_name.lower()}{random.randint(10, 99)}",
            f"{first_name[0].lower()}{last_name.lower()}",
            f"{first_name.lower()}{last_name[0].lower()}{random.randint(100, 999)}"
        ]
        
        # Generate email variations
        email_variations = []
        for username in username_variations[:3]:  # Use top 3 username variations
            for domain in random.sample(self.domains, 3):  # Use 3 random domains
                email_variations.append(f"{username}@{domain}")
                
        # Generate secure password
        password = self.generate_secure_password(first_name, last_name, birth_date)
        
        # Generate phone number
        phone = fake.phone_number()
        
        # Generate address
        address = {
            'street': fake.street_address(),
            'city': fake.city(),
            'state': fake.state(),
            'zip_code': fake.zipcode(),
            'country': fake.country()
        }
        
        # Generate browser fingerprint
        fingerprint = self.generate_browser_fingerprint()
        
        # Generate interests and preferences
        user_interests = random.sample(self.interests, random.randint(3, 7))
        
        # Generate recovery questions and answers
        recovery_qa = self.generate_recovery_questions(first_name, last_name, address)
        
        profile = {
            'id': self.generate_profile_id(first_name, last_name, birth_date),
            'personal': {
                'first_name': first_name,
                'last_name': last_name,
                'full_name': f"{first_name} {last_name}",
                'birth_date': birth_date.isoformat(),
                'age': (datetime.now().date() - birth_date).days // 365,
                'gender': random.choice(['male', 'female', 'other']),
                'phone': phone,
                'address': address
            },
            'credentials': {
                'username_variations': username_variations,
                'email_variations': email_variations,
                'primary_email': email_variations[0],
                'password': password,
                'password_hint': self.generate_password_hint(password),
                'recovery_questions': recovery_qa
            },
            'preferences': {
                'interests': user_interests,
                'timezone': fake.timezone(),
                'language': 'en-US',
                'date_format': 'MM/DD/YYYY',
                'currency': 'USD'
            },
            'browser_profile': fingerprint,
            'metadata': {
                'created_at': datetime.now().isoformat(),
                'profile_strength': self.calculate_profile_strength(),
                'consistency_score': random.uniform(0.85, 0.98),
                'risk_level': random.choice(['low', 'medium']),
                'notes': []
            }
        }
        
        return profile
        
    def generate_secure_password(self, first_name, last_name, birth_date):
        """Generate a secure but memorable password"""
        pattern = random.choice(self.password_patterns)
        
        # Choose words related to the person
        words = [
            first_name.lower(),
            last_name.lower(),
            fake.word(),
            random.choice(['love', 'life', 'dream', 'hope', 'star', 'moon', 'sun'])
        ]
        
        word = random.choice(words)
        Word = word.capitalize()
        number = str(random.randint(10, 99))
        symbol = random.choice(['!', '@', '#', '$', '%', '&', '*'])
        
        password = pattern.format(
            word=word,
            Word=Word,
            number=number,
            symbol=symbol
        )
        
        # Ensure minimum complexity
        if len(password) < 8:
            password += str(random.randint(100, 999))
            
        return password
        
    def generate_password_hint(self, password):
        """Generate a hint for the password"""
        hints = [
            "My favorite word and lucky number",
            "First pet name and birth year",
            "Childhood nickname with special character",
            "Favorite hobby and random number",
            "Dream destination and lucky digits"
        ]
        return random.choice(hints)
        
    def generate_recovery_questions(self, first_name, last_name, address):
        """Generate security questions and answers"""
        questions = [
            {
                'question': "What was the name of your first pet?",
                'answer': fake.first_name()
            },
            {
                'question': "What is your mother's maiden name?",
                'answer': fake.last_name()
            },
            {
                'question': "What was the name of your elementary school?",
                'answer': f"{fake.last_name()} Elementary School"
            },
            {
                'question': "What is the name of the city where you were born?",
                'answer': address['city']
            },
            {
                'question': "What was your childhood nickname?",
                'answer': first_name[:3] + random.choice(['y', 'ie', 'o'])
            }
        ]
        
        return random.sample(questions, 3)
        
    def generate_browser_fingerprint(self):
        """Generate realistic browser fingerprint"""
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        viewports = [
            {'width': 1920, 'height': 1080},
            {'width': 1366, 'height': 768},
            {'width': 1440, 'height': 900},
            {'width': 1536, 'height': 864}
        ]
        
        timezones = [
            'America/New_York',
            'America/Los_Angeles',
            'America/Chicago',
            'Europe/London',
            'Europe/Berlin'
        ]
        
        return {
            'user_agent': random.choice(user_agents),
            'viewport': random.choice(viewports),
            'timezone': random.choice(timezones),
            'language': 'en-US',
            'platform': random.choice(['Win32', 'MacIntel', 'Linux x86_64']),
            'screen': {
                'width': random.choice([1920, 1366, 1440, 1536]),
                'height': random.choice([1080, 768, 900, 864]),
                'color_depth': 24
            },
            'canvas_fingerprint': self.generate_canvas_fingerprint(),
            'webgl_fingerprint': self.generate_webgl_fingerprint()
        }
        
    def generate_canvas_fingerprint(self):
        """Generate unique canvas fingerprint"""
        return hashlib.md5(f"{random.random()}".encode()).hexdigest()[:16]
        
    def generate_webgl_fingerprint(self):
        """Generate unique WebGL fingerprint"""
        return hashlib.md5(f"{random.random()}webgl".encode()).hexdigest()[:16]
        
    def generate_profile_id(self, first_name, last_name, birth_date):
        """Generate unique profile ID"""
        data = f"{first_name}{last_name}{birth_date.isoformat()}{random.random()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
        
    def calculate_profile_strength(self):
        """Calculate profile strength score"""
        return random.uniform(0.75, 0.95)
        
    def generate_bulk_profiles(self, count=10):
        """Generate multiple profiles"""
        profiles = []
        for i in range(count):
            profile = self.generate_consistent_profile(seed=random.randint(1000, 9999))
            profiles.append(profile)
        return profiles
        
    def export_profile_for_browser(self, profile):
        """Export profile in browser-compatible format"""
        return {
            'name': profile['personal']['full_name'],
            'userAgent': profile['browser_profile']['user_agent'],
            'viewport': profile['browser_profile']['viewport'],
            'timezone': profile['browser_profile']['timezone'],
            'locale': profile['preferences']['language'],
            'cookies': [],
            'localStorage': {},
            'sessionStorage': {}
        }

def main():
    generator = ProfileGenerator()
    
    # Generate single profile
    profile = generator.generate_consistent_profile()
    
    result = {
        'success': True,
        'profile': profile,
        'browser_export': generator.export_profile_for_browser(profile)
    }
    
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()