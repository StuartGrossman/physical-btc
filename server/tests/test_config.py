import os
import json
import unittest
from unittest.mock import patch, MagicMock

# Test configuration
TEST_CONFIG = {
    'STRIPE_TEST_KEY': 'sk_test_placeholder',
    'FIREBASE_TEST_CREDENTIALS': {
        'type': 'service_account',
        'project_id': 'physical-btc-test',
        'private_key_id': 'test-key-id',
        'private_key': 'test-private-key',
        'client_email': 'test@physical-btc-test.iam.gserviceaccount.com',
        'client_id': 'test-client-id',
        'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
        'token_uri': 'https://oauth2.googleapis.com/token',
        'auth_provider_x509_cert_url': 'https://www.googleapis.com/oauth2/v1/certs',
        'client_x509_cert_url': 'https://www.googleapis.com/robot/v1/metadata/x509/test%40physical-btc-test.iam.gserviceaccount.com'
    }
}

def get_mock_firebase():
    """Create a mock Firebase instance for testing."""
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_doc = MagicMock()
    
    mock_db.collection.return_value = mock_collection
    mock_collection.document.return_value = mock_doc
    
    return mock_db

def setup_test_environment():
    """Set up test environment variables."""
    os.environ['STRIPE_API_KEY'] = 'sk_test_placeholder'
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['STRIPE_WEBHOOK_SECRET'] = 'whsec_placeholder'
    os.environ['FIREBASE_CREDENTIALS'] = json.dumps(TEST_CONFIG['FIREBASE_TEST_CREDENTIALS'])
    
    # Initialize mock Firebase
    import app
    app.firebase_db = get_mock_firebase()

def teardown_test_environment():
    """Clean up test environment variables."""
    if 'STRIPE_API_KEY' in os.environ:
        del os.environ['STRIPE_API_KEY']
    if 'FLASK_ENV' in os.environ:
        del os.environ['FLASK_ENV']
    if 'STRIPE_WEBHOOK_SECRET' in os.environ:
        del os.environ['STRIPE_WEBHOOK_SECRET']
    if 'FIREBASE_CREDENTIALS' in os.environ:
        del os.environ['FIREBASE_CREDENTIALS']
            
    # Clean up mock Firebase
    import app
    if hasattr(app, 'firebase_db'):
        delattr(app, 'firebase_db')

class TestConfig(unittest.TestCase):
    def setUp(self):
        setup_test_environment()

    def tearDown(self):
        teardown_test_environment()

    def test_environment_variables(self):
        """Test that environment variables are set correctly."""
        self.assertEqual(os.environ.get('FLASK_ENV'), 'testing')
        self.assertEqual(os.environ.get('STRIPE_WEBHOOK_SECRET'), 'whsec_placeholder')
        self.assertEqual(os.environ.get('STRIPE_API_KEY'), 'sk_test_placeholder')
        self.assertEqual(os.environ.get('FIREBASE_CREDENTIALS'), json.dumps(TEST_CONFIG['FIREBASE_TEST_CREDENTIALS']))

    def test_environment_cleanup(self):
        """Test that environment variables are cleaned up properly."""
        teardown_test_environment()
        self.assertNotIn('FLASK_ENV', os.environ)
        self.assertNotIn('STRIPE_WEBHOOK_SECRET', os.environ)
        self.assertNotIn('STRIPE_API_KEY', os.environ)
        self.assertNotIn('FIREBASE_CREDENTIALS', os.environ)

if __name__ == '__main__':
    unittest.main() 