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
  seed?: string;  // Make seed optional since it's not available immediately
  amount: number;
  paymentIntentId: string;
  status: string;
  timestamp: string;
  shippingInfo: {
    email: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bitcoin"></div>
  </div>
);

const CustomAmountInput = ({ 
  value, 
  onChange,
  onContinue
}: { 
  value: number | null; 
  onChange: (value: number) => void;
  onContinue: () => void;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    if (newValue.split('.').length > 2) return;
    
    // Limit to 2 decimal places
    const parts = newValue.split('.');
    if (parts[1] && parts[1].length > 2) return;
    
    setInputValue(newValue);
    setError(null);
    
    const numericValue = parseFloat(newValue);
    if (!isNaN(numericValue)) {
      // Convert to cents and ensure it's a whole number
      const amountInCents = Math.round(numericValue * 100);
      onChange(amountInCents);
    } else {
      onChange(0);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format the input value on blur
    if (inputValue) {
      const numericValue = parseFloat(inputValue);
      if (!isNaN(numericValue)) {
        setInputValue(numericValue.toFixed(2));
      }
    }
  };

  const handleContinue = () => {
    if (!value || value < 100) {
      setError('Please enter an amount of at least $1.00');
      return;
    }
    if (value > 100000) {
      setError('Maximum amount is $1,000.00');
      return;
    }
    onContinue();
  };

  return (
    <div className="space-y-4">
      <div className={`relative transition-all duration-200 ${isFocused ? 'scale-105' : ''}`}>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">$</span>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder="0.00"
            inputMode="decimal"
            pattern="[0-9]*"
            className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-center bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-bitcoin focus:ring-2 focus:ring-bitcoin focus:ring-opacity-20 transition-all duration-200"
          />
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm text-gray-500 bg-white px-2">
          {value ? `$${(value / 100).toFixed(2)}` : 'Enter amount'}
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm text-center mt-2">
          {error}
        </div>
      )}

      <button
        onClick={handleContinue}
        className="w-full bg-bitcoin hover:bg-bitcoin-dark text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!value || value < 100}
      >
        Continue
      </button>
    </div>
  );
};

const Modal = ({ 
  isOpen, 
  onClose, 
  children,
  title,
  size = 'md',
  isLoading = false
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`bg-white rounded-lg w-full ${sizeClasses[size]} relative my-8`}>
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 pt-12">
          <h2 className="text-2xl font-bold mb-6 text-center">{title}</h2>
          {isLoading ? <LoadingSpinner /> : children}
        </div>
      </div>
    </div>
  );
};

const SuccessModal = ({ 
  isOpen, 
  onClose, 
  transactionData 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  transactionData: TransactionData | null;
}) => {
  if (!isOpen || !transactionData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Successful!" size="md">
      <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
        <div className="bg-green-50 p-3 rounded-lg">
          <h3 className="text-sm font-semibold text-green-800 mb-2">Transaction Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Payment ID</p>
              <p className="font-medium truncate">{transactionData.paymentIntentId}</p>
            </div>
            <div>
              <p className="text-gray-600">Amount</p>
              <p className="font-medium">${(transactionData.amount / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Status</p>
              <p className="font-medium text-green-600">{transactionData.status}</p>
            </div>
            <div>
              <p className="text-gray-600">Date & Time</p>
              <p className="font-medium">{new Date(transactionData.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Shipping Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Name</p>
              <p className="font-medium">{transactionData.shippingInfo.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Email</p>
              <p className="font-medium">{transactionData.shippingInfo.email}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-600">Address</p>
              <p className="font-medium">{transactionData.shippingInfo.address}</p>
            </div>
            <div>
              <p className="text-gray-600">City</p>
              <p className="font-medium">{transactionData.shippingInfo.city}</p>
            </div>
            <div>
              <p className="text-gray-600">State</p>
              <p className="font-medium">{transactionData.shippingInfo.state}</p>
            </div>
            <div>
              <p className="text-gray-600">ZIP Code</p>
              <p className="font-medium">{transactionData.shippingInfo.zipCode}</p>
            </div>
            <div>
              <p className="text-gray-600">Country</p>
              <p className="font-medium">{transactionData.shippingInfo.country}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Next Steps</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
            <li>Your Bitcoin seed phrase will be generated and printed</li>
            <li>We'll ship your physical Bitcoin to the provided address</li>
            <li>You'll receive a shipping confirmation email</li>
            <li>Estimated delivery time: 5-7 business days</li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

type CheckoutStep = 'amount' | 'shipping' | 'payment' | 'confirmation' | 'success';

const PaymentConfirmation = ({
  amount,
  shippingInfo,
  onConfirm,
  onBack,
  cardDetails
}: {
  amount: number;
  shippingInfo: any;
  onConfirm: () => void;
  onBack: () => void;
  cardDetails: string;
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Amount</span>
            <span className="font-semibold">${(amount / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Payment Method</span>
            <span className="font-semibold">{cardDetails}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Information</h3>
        <div className="space-y-3">
          <div>
            <span className="text-gray-600">Name</span>
            <p className="font-medium">{shippingInfo.name}</p>
          </div>
          <div>
            <span className="text-gray-600">Email</span>
            <p className="font-medium">{shippingInfo.email}</p>
          </div>
          <div>
            <span className="text-gray-600">Address</span>
            <p className="font-medium">
              {shippingInfo.address}<br />
              {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}<br />
              {shippingInfo.country}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-6 py-3 text-sm font-medium text-white bg-bitcoin hover:bg-bitcoin-dark rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bitcoin transition-colors"
        >
          Confirm & Pay
        </button>
      </div>
    </div>
  );
};

const CheckoutModal = ({ 
  isOpen, 
  onClose,
  onSuccess
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: (data: TransactionData) => void;
}) => {
  const [step, setStep] = useState<CheckoutStep>('amount');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [shippingInfo, setShippingInfo] = useState({
    email: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState<string>('');
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    if (step === 'payment' && selectedAmount) {
      fetch("http://localhost:5001/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: selectedAmount }),
      })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((err) => {
          console.error("Error creating payment intent:", err);
          setError("Failed to initialize payment. Please try again.");
        });
    }
  }, [step, selectedAmount]);

  const handleStepChange = (newStep: CheckoutStep) => {
    setIsLoading(true);
    setTimeout(() => {
      setStep(newStep);
      setIsLoading(false);
    }, 500);
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    handleStepChange('shipping');
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleStepChange('payment');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setProcessing(true);

    const { error: cardError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
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
    });

    if (cardError) {
      setError(cardError.message || "An error occurred");
      setProcessing(false);
      return;
    }

    // Get the last 4 digits of the card
    const last4 = paymentMethod.card?.last4;
    setCardDetails(`•••• •••• •••• ${last4}`);
    setPaymentMethodId(paymentMethod.id);
    setProcessing(false);
    handleStepChange('confirmation');
  };

  const handleConfirmPayment = async () => {
    if (!stripe || !clientSecret || !paymentMethodId) {
      return;
    }

    setProcessing(true);

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: paymentMethodId
      }
    );

    if (stripeError) {
      setError(stripeError.message || "An error occurred");
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      const transactionData = {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
        shippingInfo,
        timestamp: new Date().toISOString()
      };
      
      await setDoc(doc(collection(db, 'transactions')), transactionData);
      setProcessing(false);
      onSuccess(transactionData);
      setStep('success');
    }
  };

  const renderAmountSelection = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {AMOUNT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleAmountSelect(option.value)}
            className="relative group bg-white border-2 border-gray-200 hover:border-bitcoin rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="text-center">
              <span className="block text-2xl font-bold text-gray-900 group-hover:text-bitcoin transition-colors">
                {option.label}
              </span>
              <span className="block text-sm text-gray-500 mt-1">Quick Select</span>
            </div>
            <div className="absolute inset-0 border-2 border-bitcoin rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-white text-sm text-gray-500">or enter custom amount</span>
        </div>
      </div>

      <div className="px-4 sm:px-8">
        <CustomAmountInput
          value={selectedAmount}
          onChange={(value) => setSelectedAmount(value)}
          onContinue={() => handleAmountSelect(selectedAmount!)}
        />
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>Minimum amount: $1.00</p>
        <p>Maximum amount: $1,000.00</p>
      </div>
    </div>
  );

  const renderShippingForm = () => (
    <form onSubmit={handleShippingSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={shippingInfo.email}
            onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-bitcoin focus:ring-2 focus:ring-bitcoin focus:ring-opacity-20 transition-all duration-200 bg-white"
            placeholder="your@email.com"
            required
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={shippingInfo.name}
            onChange={(e) => setShippingInfo({...shippingInfo, name: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-bitcoin focus:ring-2 focus:ring-bitcoin focus:ring-opacity-20 transition-all duration-200 bg-white"
            placeholder="John Doe"
            required
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            value={shippingInfo.address}
            onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-bitcoin focus:ring-2 focus:ring-bitcoin focus:ring-opacity-20 transition-all duration-200 bg-white"
            placeholder="123 Main St"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            value={shippingInfo.city}
            onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-bitcoin focus:ring-2 focus:ring-bitcoin focus:ring-opacity-20 transition-all duration-200 bg-white"
            placeholder="New York"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input
            type="text"
            value={shippingInfo.state}
            onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-bitcoin focus:ring-2 focus:ring-bitcoin focus:ring-opacity-20 transition-all duration-200 bg-white"
            placeholder="NY"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
          <input
            type="text"
            value={shippingInfo.zipCode}
            onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-bitcoin focus:ring-2 focus:ring-bitcoin focus:ring-opacity-20 transition-all duration-200 bg-white"
            placeholder="10001"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input
            type="text"
            value={shippingInfo.country}
            onChange={(e) => setShippingInfo({...shippingInfo, country: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-bitcoin focus:ring-2 focus:ring-bitcoin focus:ring-opacity-20 transition-all duration-200 bg-white"
            placeholder="United States"
            required
          />
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={() => handleStepChange('amount')}
          className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-6 py-3 text-sm font-medium text-white bg-bitcoin hover:bg-bitcoin-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bitcoin transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          Continue to Payment
        </button>
      </div>
    </form>
  );

  const renderPaymentForm = () => (
    <form onSubmit={handlePaymentSubmit} className="space-y-4">
      <div>
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
        <div className="p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => handleStepChange('shipping')}
          className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || processing}
          className="px-6 py-3 text-sm font-medium text-white bg-bitcoin hover:bg-bitcoin-dark rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bitcoin transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? "Processing..." : "Continue to Review"}
        </button>
      </div>
    </form>
  );

  const renderSuccess = () => (
    <div className="space-y-4">
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Payment Successful!</h3>
        <p className="text-green-700">Your order has been processed successfully.</p>
      </div>
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Next Steps</h3>
        <ul className="list-disc list-inside space-y-2 text-blue-700">
          <li>Your Bitcoin seed phrase will be generated and printed</li>
          <li>We'll ship your physical Bitcoin to the provided address</li>
          <li>You'll receive a shipping confirmation email</li>
          <li>Estimated delivery time: 5-7 business days</li>
        </ul>
      </div>
      <button
        onClick={onClose}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        Close
      </button>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'amount':
        return 'Select Amount';
      case 'shipping':
        return 'Shipping Information';
      case 'payment':
        return 'Payment Information';
      case 'confirmation':
        return 'Review & Confirm';
      case 'success':
        return 'Order Complete';
      default:
        return '';
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={getStepTitle()} 
      size="md"
      isLoading={isLoading}
    >
      {step === 'amount' && renderAmountSelection()}
      {step === 'shipping' && renderShippingForm()}
      {step === 'payment' && renderPaymentForm()}
      {step === 'confirmation' && (
        <PaymentConfirmation
          amount={selectedAmount!}
          shippingInfo={shippingInfo}
          onConfirm={handleConfirmPayment}
          onBack={() => handleStepChange('payment')}
          cardDetails={cardDetails}
        />
      )}
      {step === 'success' && renderSuccess()}
    </Modal>
  );
};

function App() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);

  const handleCheckoutSuccess = (data: TransactionData) => {
    setTransactionData(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white sm:tracking-tight lg:text-6xl">
            Physical Bitcoin
          </h1>
          <p className="mt-4 sm:mt-5 max-w-xl mx-auto text-lg sm:text-xl text-gray-300">
            Own your Bitcoin seed phrase in physical form, printed on premium paper currency-style notes.
          </p>
        </div>

        <div className="mt-8 sm:mt-12 bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-6 sm:py-8 sm:p-10">
            <div className="space-y-6 sm:space-y-8">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-4 sm:space-y-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">What You Get:</h2>
                  <ul className="space-y-3 sm:space-y-4">
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">Physical Bitcoin seed phrase printed on premium paper</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">QR code for easy digital access</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">Secure shipping to your address</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">Backup copy of your seed phrase</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">How It Works:</h3>
                  <ol className="space-y-3 sm:space-y-4">
                    <li className="flex items-start">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-bitcoin text-white font-semibold mr-3">1</span>
                      <span className="text-gray-700">Select your desired amount</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-bitcoin text-white font-semibold mr-3">2</span>
                      <span className="text-gray-700">Enter your shipping details</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-bitcoin text-white font-semibold mr-3">3</span>
                      <span className="text-gray-700">Complete the payment</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-bitcoin text-white font-semibold mr-3">4</span>
                      <span className="text-gray-700">We'll generate your seed and ship it to you</span>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 sm:mt-8">
                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full bg-bitcoin hover:bg-bitcoin-dark text-white font-bold py-3 sm:py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Buy Physical Bitcoin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Elements stripe={stripePromise}>
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false);
            setTransactionData(null);
          }}
          onSuccess={handleCheckoutSuccess}
        />
      </Elements>
    </div>
  );
}

export default App;
