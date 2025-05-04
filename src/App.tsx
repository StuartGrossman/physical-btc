import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1fOWGL9R4khA1buXGetn3cLl-4sIwAS8",
  authDomain: "physical-btc.firebaseapp.com",
  projectId: "physical-btc",
  storageBucket: "physical-btc.firebasestorage.app",
  messagingSenderId: "308679096663",
  appId: "1:308679096663:web:74bbaf3d2a85bcbcec2612",
  measurementId: "G-Y17EL9Q35M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Replace with your Stripe publishable key
const stripePromise = loadStripe('pk_test_51RKs1QQFOBBUBpOdqVo5Ifwg1vnW1naK3V2q2dPEWt2nOyCtg4syCbdbukcx5DRyTr8wBAGFtzxg4YJsxXQcn4xp00QK6gznGK');

const AMOUNT_OPTIONS = [
  { value: 1000, label: '$10.00' },
  { value: 2500, label: '$25.00' },
  { value: 5000, label: '$50.00' },
  { value: 10000, label: '$100.00' },
];

// Test card details
const TEST_CARD = {
  number: '4242424242424242',
  exp_month: 12,
  exp_year: 2025,
  cvc: '123',
};

interface TransactionData {
  seed: string;
  amount: number;
  paymentIntentId: string;
  status: string;
  timestamp: string;
}

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShippingForm, setShowShippingForm] = useState(true);
  const [shippingInfo, setShippingInfo] = useState({
    email: 'test@example.com',
    name: 'John Doe',
    address: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    country: 'United States'
  });

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowShippingForm(false);
  };

  useEffect(() => {
    if (!showShippingForm) {
      // Create PaymentIntent as soon as the page loads
      fetch("http://localhost:5001/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 10000 }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Payment intent created:", data);
          setClientSecret(data.clientSecret);
        })
        .catch((err) => {
          console.error("Error creating payment intent:", err);
          setError("Failed to initialize payment. Please try again.");
        });
    }
  }, [showShippingForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setProcessing(true);

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            email: shippingInfo.email,
            name: shippingInfo.name,
            address: {
              line1: shippingInfo.address,
              city: shippingInfo.city,
              state: shippingInfo.state,
              postal_code: shippingInfo.zipCode,
              country: shippingInfo.country
            }
          }
        }
      }
    );

    if (stripeError) {
      setError(stripeError.message || "An error occurred");
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Save transaction to Firebase
      const transactionRef = doc(collection(db, 'transactions'));
      await setDoc(transactionRef, {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
        shippingInfo,
        timestamp: new Date().toISOString()
      });
      
      setProcessing(false);
      // Handle successful payment
      alert("Payment Successful!");
    }
  };

  if (showShippingForm) {
    return (
      <form onSubmit={handleShippingSubmit} className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6">Shipping Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={shippingInfo.email}
              onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={shippingInfo.name}
              onChange={(e) => setShippingInfo({...shippingInfo, name: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              value={shippingInfo.address}
              onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                value={shippingInfo.city}
                onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State</label>
              <input
                type="text"
                value={shippingInfo.state}
                onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
              <input
                type="text"
                value={shippingInfo.zipCode}
                onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Country</label>
              <input
                type="text"
                value={shippingInfo.country}
                onChange={(e) => setShippingInfo({...shippingInfo, country: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="mt-6 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Continue to Payment
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Payment Information</h2>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="p-3 border rounded-md">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || processing}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
};

const AmountSelectionModal = ({ 
  isOpen, 
  onClose, 
  onSelectAmount 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelectAmount: (amount: number) => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Select Amount</h2>
        <div className="grid grid-cols-2 gap-4">
          {AMOUNT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelectAmount(option.value)}
              className="bg-bitcoin hover:bg-bitcoin-dark text-white font-bold py-3 px-4 rounded"
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

function App() {
  const [isAmountModalOpen, setIsAmountModalOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsAmountModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-3xl font-bold text-center mb-8 text-bitcoin">Physical Bitcoin</h1>
                
                <div className="space-y-6">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          Your Bitcoin seed phrase will be printed on high-quality paper currency-style notes and shipped to your address.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900">What You Get:</h2>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Physical Bitcoin seed phrase printed on premium paper</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>QR code for easy digital access</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Secure shipping to your address</span>
                      </li>
                      <li className="flex items-start">
                        <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Backup copy of your seed phrase</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">How It Works:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      <li>Select your desired amount</li>
                      <li>Enter your shipping details</li>
                      <li>Complete the payment</li>
                      <li>We'll generate your seed and ship it to you</li>
                    </ol>
                  </div>
                </div>

                <button
                  onClick={() => setIsAmountModalOpen(true)}
                  className="w-full bg-bitcoin hover:bg-bitcoin-dark text-white font-bold py-3 px-4 rounded mt-8 transition-colors duration-200"
                >
                  Buy Physical Bitcoin
                </button>

                {selectedAmount && (
                  <Elements stripe={stripePromise}>
                    <CheckoutForm />
                  </Elements>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AmountSelectionModal
        isOpen={isAmountModalOpen}
        onClose={() => setIsAmountModalOpen(false)}
        onSelectAmount={handleAmountSelect}
      />
    </div>
  );
}

export default App;
