# Physical Bitcoin Platform

A modern web application for purchasing physical Bitcoin coins backed by real Bitcoin, featuring secure seed generation, Stripe payment integration, and a beautiful React frontend.

## 🚀 Features

- **Secure Bitcoin Integration**
  - 12-word seed phrase generation
  - Receiving address generation
  - Seed validation and verification
  - QR code generation for seed phrases

- **Payment Processing**
  - Stripe integration for secure payments
  - Support for multiple payment amounts
  - Custom amount input
  - Payment intent creation and confirmation
  - Webhook handling for payment events

- **Modern Frontend**
  - React with TypeScript
  - Tailwind CSS for styling
  - Responsive design
  - Multi-step checkout process
  - Real-time payment status updates

- **Backend Services**
  - Flask REST API
  - Firebase integration for data storage
  - Comprehensive test suite
  - Development and production configurations

## 🛠️ Technical Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Stripe Elements
- Firebase SDK

### Backend
- Python 3.13
- Flask
- Stripe API
- Firebase Admin SDK
- BitcoinLib for seed generation

## 📋 Project Structure

```
physical-btc/
├── front-end/           # React frontend application
│   ├── src/
│   │   ├── App.tsx     # Main application component
│   │   └── ...
│   └── package.json
├── server/             # Flask backend server
│   ├── app.py         # Main server application
│   ├── tests/         # Test suite
│   └── requirements.txt
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.13+
- Stripe account
- Firebase project

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd front-end
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

### Backend Setup
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   ```bash
   export STRIPE_API_KEY=your_stripe_key
   export FLASK_ENV=development
   ```
5. Start the server:
   ```bash
   python app.py
   ```

## 🧪 Testing

The project includes a comprehensive test suite covering:
- Bitcoin functionality (seed generation, validation)
- Payment flow
- Configuration
- API endpoints

Run tests with:
```bash
cd server
PYTHONPATH=$PYTHONPATH:. python -m pytest tests/ -v
```

## 🔒 Security Features

- Secure seed generation using BitcoinLib
- Stripe payment processing with webhook verification
- Firebase secure data storage
- Environment variable management
- Input validation and sanitization

## 📝 Recent Updates

- Implemented Stripe payment integration
- Added seed phrase generation and validation
- Created multi-step checkout process
- Set up Firebase integration
- Added comprehensive test suite
- Implemented webhook handling for payment events

## 🐛 Known Issues

- Some deprecation warnings in dependencies (SQLAlchemy, Werkzeug)
- These warnings don't affect functionality but should be addressed in future updates

## 🔜 Roadmap

- [ ] Add user authentication
- [ ] Implement order tracking
- [ ] Add admin dashboard
- [ ] Enhance error handling
- [ ] Add more payment options
- [ ] Implement automated testing pipeline

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request 