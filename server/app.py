from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
import stripe
import qrcode
from io import BytesIO
import base64
import firebase_admin
from firebase_admin import credentials, firestore
from generate_btc_seeds import ElectrumSeedGenerator
import os
import json
from datetime import datetime

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_API_KEY', 'sk_test_default')
logger.info("Stripe initialized with test key")

# Initialize Firebase
firebase_db = None

def init_firebase():
    global firebase_db
    try:
        if os.getenv('FLASK_ENV') == 'development':
            # Use mock DB for development/testing
            from unittest.mock import MagicMock
            firebase_db = MagicMock()
            logger.info("Using mock Firebase DB for development")
        else:
            # Initialize Firebase with credentials
            cred_path = os.getenv('FIREBASE_CREDENTIALS')
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                firebase_db = firestore.client()
                logger.info("Firebase initialized successfully")
            else:
                logger.error("Firebase credentials not found")
    except Exception as e:
        logger.error("Error initializing Firebase: %s", str(e))

# Initialize Firebase on startup
init_firebase()

# Initialize seed generator
seed_generator = ElectrumSeedGenerator()
logger.info("Seed generator initialized")

def generate_qr_code(data):
    """Generate QR code for given data."""
    try:
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode()
    except Exception as e:
        logger.error(f"Error generating QR code: {str(e)}")
        raise

@app.route('/create-payment-intent', methods=['POST'])
def create_payment_intent():
    try:
        data = request.get_json()
        logger.info("Received payment intent request: %s", json.dumps(data, indent=2))
        
        if not data:
            logger.error("No data received in request")
            return jsonify({'error': 'No data received'}), 400
            
        amount = data.get('amount')
        if not amount:
            logger.error("No amount provided in request")
            return jsonify({'error': 'Amount is required'}), 400
            
        shipping = data.get('shipping')
        if not shipping:
            logger.error("No shipping information provided")
            return jsonify({'error': 'Shipping information is required'}), 400
            
        logger.info("Creating payment intent for amount: $%.2f", amount/100)
        logger.info("Shipping info: %s", json.dumps(shipping, indent=2))
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            metadata={
                'shipping_name': shipping['name'],
                'shipping_address': shipping['address']['line1'],
                'shipping_city': shipping['address']['city'],
                'shipping_state': shipping['address']['state'],
                'shipping_zip': shipping['address']['postal_code'],
                'shipping_country': shipping['address']['country']
            }
        )
        
        return jsonify({
            'clientSecret': intent.client_secret,
            'id': intent.id
        })
        
    except KeyError as e:
        logger.error("Missing required field in request: %s", str(e))
        return jsonify({'error': f'Missing required field: {str(e)}'}), 400
    except Exception as e:
        logger.error("Error creating payment intent: %s", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle Stripe webhook events."""
    logger.info("=== Webhook Event Received ===")
    
    # Get the webhook signature header
    signature = request.headers.get('stripe-signature')
    logger.info("Signature header: %s", signature)
    
    # Get the raw payload
    payload = request.data.decode('utf-8')
    logger.info("Raw payload: %s", payload)
    
    try:
        # Verify webhook signature
        if not signature:
            logger.error("Missing Stripe signature")
            return jsonify({'error': 'Missing Stripe signature'}), 400
            
        webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        if not webhook_secret:
            logger.error("Missing webhook secret")
            return jsonify({'error': 'Webhook secret not configured'}), 400
            
        event = stripe.Webhook.construct_event(
            payload, signature, webhook_secret
        )
        
        # Handle successful payment
        if event['type'] == 'payment_intent.succeeded':
            logger.info("Processing successful payment")
            payment_intent = event['data']['object']
            
            try:
                # Generate seed and address
                seed = seed_generator.generate_seed()
                receiving_address = seed_generator.get_receiving_address(seed)
                
                # Store in Firebase if available
                if 'firebase_db' in globals() and firebase_db is not None:
                    payment_doc = {
                        'payment_intent_id': payment_intent['id'],
                        'amount': payment_intent['amount'],
                        'status': payment_intent['status'],
                        'seed': seed,
                        'receiving_address': receiving_address,
                        'shipping': {
                            'name': payment_intent['metadata']['shipping_name'],
                            'address': payment_intent['metadata']['shipping_address'],
                            'city': payment_intent['metadata']['shipping_city'],
                            'state': payment_intent['metadata']['shipping_state'],
                            'zip': payment_intent['metadata']['shipping_zip'],
                            'country': payment_intent['metadata']['shipping_country']
                        },
                        'timestamp': firestore.SERVER_TIMESTAMP
                    }
                    
                    firebase_db.collection('payments').document(payment_intent['id']).set(payment_doc)
                    logger.info("Payment data stored in Firebase")
                else:
                    logger.warning("Firebase DB not available, skipping data storage")
                    
                return jsonify({
                    'status': 'success',
                    'seed': seed,
                    'receiving_address': receiving_address
                }), 200
                
            except Exception as e:
                logger.error("Error processing webhook: %s", str(e))
                return jsonify({'error': str(e)}), 500
                
        else:
            # Unhandled event type
            logger.info("Unhandled event type: %s", event['type'])
            return jsonify({'status': 'ignored'}), 200
            
    except stripe.error.SignatureVerificationError as e:
        logger.error("Invalid signature: %s", str(e))
        return jsonify({'error': 'Invalid signature'}), 400
        
    except Exception as e:
        logger.error("Error processing webhook: %s", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/generate-seed', methods=['GET'])
def generate_seed():
    """Generate a new seed phrase."""
    try:
        seed = seed_generator.generate_seed()
        receiving_address = seed_generator.get_receiving_address(seed)
        
        return jsonify({
            'seed': seed,
            'receiving_address': receiving_address
        }), 200
        
    except Exception as e:
        logger.error("Error generating seed: %s", str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    app.run(host='127.0.0.1', port=5001, debug=True) 