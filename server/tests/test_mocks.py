from unittest.mock import MagicMock
import json
from datetime import datetime

class MockFirebaseDB:
    """Mock Firebase database for testing"""
    def __init__(self):
        self.data = {}
        self.transactions = {}
        self.collections = {}
    
    def collection(self, name):
        """Mock collection method"""
        if name not in self.collections:
            self.collections[name] = MockCollection(self)
        return self.collections[name]
    
    def child(self, path):
        """Mock child method to simulate Firebase path"""
        return self
    
    def set(self, data):
        """Mock set method to store data"""
        if isinstance(data, dict):
            self.data.update(data)
        return self
    
    def get(self):
        """Mock get method to retrieve data"""
        return self.data
    
    def update(self, data):
        """Mock update method to update data"""
        self.data.update(data)
        return self

class MockCollection:
    """Mock Firebase collection"""
    def __init__(self, db):
        self.db = db
        self.documents = {}
    
    def document(self, doc_id=None):
        """Mock document method"""
        if doc_id is None:
            doc_id = f"doc_{len(self.documents)}"
        if doc_id not in self.documents:
            self.documents[doc_id] = MockDocument(self.db, doc_id)
        return self.documents[doc_id]
    
    def where(self, field, op, value):
        """Mock where method"""
        return MockQuery(self, field, op, value)

class MockDocument:
    """Mock Firebase document"""
    def __init__(self, db, doc_id):
        self.db = db
        self.id = doc_id
        self.data = {}
    
    def set(self, data):
        """Mock set method"""
        self.data = data
        self.db.data.update(data)
        return self
    
    def update(self, data):
        """Mock update method"""
        self.data.update(data)
        self.db.data.update(data)
        return self
    
    @property
    def reference(self):
        """Mock reference property"""
        return self

class MockQuery:
    """Mock Firebase query"""
    def __init__(self, collection, field, op, value):
        self.collection = collection
        self.field = field
        self.op = op
        self.value = value
    
    def limit(self, limit):
        """Mock limit method"""
        return self
    
    def get(self):
        """Mock get method"""
        results = []
        for doc in self.collection.documents.values():
            if self.field in doc.data and doc.data[self.field] == self.value:
                results.append(doc)
        return results

class MockStripe:
    """Mock Stripe API for testing"""
    def __init__(self):
        self.payment_intents = {}
        self.events = {}
    
    def PaymentIntent(self, id=None):
        """Mock PaymentIntent creation"""
        mock_intent = MagicMock()
        mock_intent.id = id or f"pi_test_{len(self.payment_intents)}"
        mock_intent.client_secret = f"pi_test_secret_{mock_intent.id}"
        mock_intent.amount = 10000  # $100.00
        mock_intent.metadata = {}
        self.payment_intents[mock_intent.id] = mock_intent
        return mock_intent
    
    def Event(self, payload):
        """Mock Event creation"""
        mock_event = MagicMock()
        mock_event.type = payload.get('type', 'payment_intent.succeeded')
        mock_event.data = payload.get('data', {})
        return mock_event

    def PaymentIntent_create(self, **kwargs):
        """Mock PaymentIntent.create method"""
        mock_intent = self.PaymentIntent()
        mock_intent.amount = kwargs.get('amount', 10000)
        mock_intent.currency = kwargs.get('currency', 'usd')
        mock_intent.metadata = kwargs.get('metadata', {})
        return mock_intent

    def Event_construct_from(self, data, key):
        """Mock Event.construct_from method"""
        return self.Event(data)

    def __getattr__(self, name):
        """Handle dynamic attribute access"""
        if name == 'PaymentIntent':
            return type('PaymentIntent', (), {
                'create': self.PaymentIntent_create,
                '__call__': self.PaymentIntent
            })()
        elif name == 'Event':
            return type('Event', (), {
                'construct_from': self.Event_construct_from,
                '__call__': self.Event
            })()
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")

# Create mock instances
mock_firebase = MockFirebaseDB()
mock_stripe = MockStripe()

def get_mock_firebase():
    """Get mock Firebase instance"""
    return mock_firebase

def get_mock_stripe():
    """Get mock Stripe instance"""
    return mock_stripe 