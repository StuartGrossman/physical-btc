import unittest
from unittest.mock import patch, MagicMock
import json
from app import app
from tests.test_mocks import get_mock_firebase, get_mock_stripe
from generate_btc_seeds import ElectrumSeedGenerator
import os
from .test_config import setup_test_environment, teardown_test_environment

class TestBitcoinFunctionality(unittest.TestCase):
    """Test suite focused on Bitcoin seed generation and address derivation"""
    
    def setUp(self):
        """Set up test environment"""
        self.seed_generator = ElectrumSeedGenerator()
        self.app = app.test_client()
        self.app.testing = True
    
    def test_seed_generation_basic(self):
        """Test basic seed generation functionality"""
        # Generate a 12-word seed
        seed = self.seed_generator.generate_seed()
        
        # Verify seed format
        seed_words = seed.split()
        self.assertEqual(len(seed_words), 12)
        
        # Verify all words are from the wordlist
        for word in seed_words:
            self.assertIn(word, self.seed_generator.wordlist)
    
    def test_seed_generation_entropy(self):
        """Test that generated seeds have sufficient entropy"""
        # Generate multiple seeds and verify they're different
        seeds = [self.seed_generator.generate_seed() for _ in range(5)]
        unique_seeds = set(seeds)
        
        # All seeds should be unique
        self.assertEqual(len(seeds), len(unique_seeds))
        
        # Each seed should have 12 unique positions
        for seed in seeds:
            words = seed.split()
            # Check word positions are unique (no word repeated in same position)
            for i, word in enumerate(words):
                other_seeds = [s.split()[i] for s in seeds if s != seed]
                self.assertFalse(all(word == other_word for other_word in other_seeds))
    
    def test_seed_validation(self):
        """Test seed validation functionality."""
        # Test valid seed
        seed = self.seed_generator.generate_seed()
        self.assertTrue(self.seed_generator.validate_seed(seed))
        
        # Test invalid seeds
        invalid_seeds = [
            "not a valid seed",
            "too few words one two three",
            "too many words " + " ".join(["word"] * 13),
            "invalid words " + " ".join(["notaword"] * 12),
            "",
            None
        ]
        
        for invalid_seed in invalid_seeds:
            self.assertFalse(self.seed_generator.validate_seed(invalid_seed))
    
    def test_receiving_address_generation(self):
        """Test receiving address generation and format"""
        # Generate a seed and its receiving address
        seed = self.seed_generator.generate_seed()
        receiving_address = self.seed_generator.get_receiving_address(seed)
        
        # Verify address format
        self.assertTrue(receiving_address.startswith('bc1'))
        # Bech32 addresses can be either 42 or 43 characters
        self.assertIn(len(receiving_address), [42, 43])
        
        # Verify address is deterministic
        same_address = self.seed_generator.get_receiving_address(seed)
        self.assertEqual(receiving_address, same_address)
        
        # Verify different seeds produce different addresses
        different_seed = self.seed_generator.generate_seed()
        different_address = self.seed_generator.get_receiving_address(different_seed)
        self.assertNotEqual(receiving_address, different_address)
        
        # Verify address character set (bech32 format)
        valid_chars = set('0123456789abcdefghjklmnpqrstuvwxyz')  # bech32 charset
        address_chars = set(receiving_address[3:])  # Skip 'bc1' prefix
        self.assertTrue(address_chars.issubset(valid_chars))
    
    def test_seed_to_address_consistency(self):
        """Test consistency between seed and address generation"""
        # Generate multiple seed-address pairs and verify consistency
        pairs = []
        for _ in range(3):
            seed = self.seed_generator.generate_seed()
            addr = self.seed_generator.get_receiving_address(seed)
            pairs.append((seed, addr))
        
        # Verify each pair is unique
        unique_pairs = set(pairs)
        self.assertEqual(len(pairs), len(unique_pairs))
        
        # Verify same seed always gives same address
        for seed, addr in pairs:
            new_addr = self.seed_generator.get_receiving_address(seed)
            self.assertEqual(addr, new_addr)
    
    @patch('app.firebase_db', get_mock_firebase())
    def test_generate_seed_endpoint(self):
        """Test the seed generation API endpoint"""
        # Mock Firebase
        with patch('app.firebase_db') as mock_db:
            # Make request
            response = self.app.get('/generate-seed')
            
            # Check response
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIn('seed', data)
            self.assertIn('receiving_address', data)
            
            # Validate seed format
            seed = data['seed']
            words = seed.split()
            self.assertEqual(len(words), 12)
            
            # Validate address format
            address = data['receiving_address']
            self.assertTrue(address.startswith('bc1'))
            self.assertIn(len(address), [42, 43])

class TestElectrumSeedGenerator(unittest.TestCase):
    def setUp(self):
        setup_test_environment()
        self.generator = ElectrumSeedGenerator()
        
    def tearDown(self):
        teardown_test_environment()
        
    def test_seed_generation(self):
        """Test that generated seeds are valid and unique."""
        # Generate multiple seeds
        seeds = set()
        for _ in range(5):
            seed = self.generator.generate_seed()
            seeds.add(seed)
            
            # Check seed format
            words = seed.split()
            self.assertEqual(len(words), 12)
            
            # Verify all words are in wordlist
            for word in words:
                self.assertIn(word, self.generator.wordlist)
        
        # Check uniqueness
        self.assertEqual(len(seeds), 5)
    
    def test_seed_validation(self):
        """Test seed validation with valid and invalid seeds."""
        # Test valid seed
        valid_seed = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
        self.assertTrue(self.generator.validate_seed(valid_seed))
        
        # Test invalid seed (wrong length)
        invalid_seed = "abandon abandon abandon"
        self.assertFalse(self.generator.validate_seed(invalid_seed))
        
        # Test invalid seed (invalid word)
        invalid_seed = "invalid abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
        self.assertFalse(self.generator.validate_seed(invalid_seed))
        
    def test_receiving_address_generation(self):
        """Test receiving address generation from a known seed."""
        # Use a known seed for testing
        test_seed = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
        address = self.generator.get_receiving_address(test_seed)
        
        # Check address format
        self.assertTrue(address.startswith('bc1'))
        self.assertEqual(len(address), 42)  # Standard bech32 address length
        
    def test_development_mode(self):
        """Test fallback mechanism in development mode."""
        os.environ['FLASK_ENV'] = 'development'
        seed = self.generator.generate_seed()
        self.assertIsNotNone(seed)
        words = seed.split()
        self.assertEqual(len(words), 12)
        self.assertEqual(len(set(words)), len(words))  # All words should be unique
    
    def test_word_distribution(self):
        """Test that generated seeds have good word distribution."""
        seed = self.generator.generate_seed()
        words = seed.split()
        
        # Count words starting with each letter
        letter_counts = {}
        for word in words:
            first_letter = word[0]
            letter_counts[first_letter] = letter_counts.get(first_letter, 0) + 1
        
        # No letter should appear more than twice
        for count in letter_counts.values():
            self.assertLessEqual(count, 2)

if __name__ == '__main__':
    unittest.main() 