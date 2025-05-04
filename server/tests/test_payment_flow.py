import unittest
from unittest.mock import patch, MagicMock
import json
import os
from app import app

class TestPaymentFlow(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.test_payment_data = {
            'amount': 2500,
            'currency': 'usd',
            'shipping': {
                'name': 'Test User',
                'address': {
                    'line1': '123 Test St',
                    'city': 'Test City',
                    'state': 'TS',
                    'postal_code': '12345',
                    'country': 'US'
                }
            }
        }
        
        # Set up test environment
        os.environ['FLASK_ENV'] = 'development'
        os.environ['STRIPE_WEBHOOK_SECRET'] = 'whsec_test_123'
        os.environ['STRIPE_API_KEY'] = 'sk_test_123'
        
    def tearDown(self):
        # Clean up environment variables
        env_vars = ['FLASK_ENV', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_API_KEY']
        for var in env_vars:
            if var in os.environ:
                del os.environ[var]

    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent(self, mock_create):
        # Mock Stripe response
        mock_intent = MagicMock()
        mock_intent.client_secret = 'test_secret'
        mock_intent.id = 'test_id'
        mock_create.return_value = mock_intent
        
        # Make request
        response = self.app.post(
            '/create-payment-intent',
            json=self.test_payment_data,
            content_type='application/json'
        )
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('clientSecret', data)
        self.assertEqual(data['clientSecret'], 'test_secret')
        self.assertEqual(data['id'], 'test_id')
        
        # Verify Stripe was called correctly
        mock_create.assert_called_once_with(
            amount=2500,
            currency='usd',
            metadata={
                'shipping_name': 'Test User',
                'shipping_address': '123 Test St',
                'shipping_city': 'Test City',
                'shipping_state': 'TS',
                'shipping_zip': '12345',
                'shipping_country': 'US'
            }
        )

    @patch('stripe.Webhook.construct_event')
    def test_webhook_payment_success(self, mock_construct_event):
        # Mock webhook event
        event_data = {
            'id': 'evt_test123',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'amount': 2500,
                    'status': 'succeeded',
                    'metadata': {
                        'shipping_name': 'Test User',
                        'shipping_address': '123 Test St',
                        'shipping_city': 'Test City',
                        'shipping_state': 'TS',
                        'shipping_zip': '12345',
                        'shipping_country': 'US'
                    }
                }
            }
        }
        mock_construct_event.return_value = event_data
        
        # Make request
        response = self.app.post(
            '/webhook',
            data=json.dumps(event_data),
            headers={'stripe-signature': 'test_signature'},
            content_type='application/json'
        )
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')

    def test_webhook_invalid_signature(self):
        # Make request with invalid signature
        response = self.app.post(
            '/webhook',
            data=json.dumps({
                'id': 'evt_test123',
                'type': 'payment_intent.succeeded',
                'data': {
                    'object': {
                        'id': 'pi_test123',
                        'amount': 2500,
                        'status': 'succeeded',
                        'metadata': {
                            'shipping_name': 'Test User',
                            'shipping_address': '123 Test St',
                            'shipping_city': 'Test City',
                            'shipping_state': 'TS',
                            'shipping_zip': '12345',
                            'shipping_country': 'US'
                        }
                    }
                }
            }),
            headers={'stripe-signature': 'invalid_signature'},
            content_type='application/json'
        )
        
        # Check response
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)

    def test_webhook_missing_secret(self):
        # Remove webhook secret
        if 'STRIPE_WEBHOOK_SECRET' in os.environ:
            del os.environ['STRIPE_WEBHOOK_SECRET']
            
        # Make request
        response = self.app.post(
            '/webhook',
            data=json.dumps({
                'id': 'evt_test123',
                'type': 'payment_intent.succeeded',
                'data': {
                    'object': {
                        'id': 'pi_test123',
                        'amount': 2500,
                        'status': 'succeeded',
                        'metadata': {
                            'shipping_name': 'Test User',
                            'shipping_address': '123 Test St',
                            'shipping_city': 'Test City',
                            'shipping_state': 'TS',
                            'shipping_zip': '12345',
                            'shipping_country': 'US'
                        }
                    }
                }
            }),
            content_type='application/json'
        )
        
        # Check response
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)

    @patch('stripe.Webhook.construct_event')
    def test_webhook_unhandled_event(self, mock_construct_event):
        # Mock unhandled event type
        event_data = {
            'id': 'evt_test123',
            'type': 'charge.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test123',
                    'amount': 2500,
                    'status': 'succeeded',
                    'metadata': {
                        'shipping_name': 'Test User',
                        'shipping_address': '123 Test St',
                        'shipping_city': 'Test City',
                        'shipping_state': 'TS',
                        'shipping_zip': '12345',
                        'shipping_country': 'US'
                    }
                }
            }
        }
        mock_construct_event.return_value = event_data
        
        # Make request
        response = self.app.post(
            '/webhook',
            data=json.dumps(event_data),
            headers={'stripe-signature': 'test_signature'},
            content_type='application/json'
        )
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'ignored')

if __name__ == '__main__':
    unittest.main() 