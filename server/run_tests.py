import unittest
from test_config import setup_test_environment
from test_payment_flow import TestPaymentFlow

def run_tests():
    """Set up test environment and run all tests"""
    # Set up test environment
    setup_test_environment()
    
    # Create test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(TestPaymentFlow)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Return exit code based on test results
    return 0 if result.wasSuccessful() else 1

if __name__ == '__main__':
    exit(run_tests()) 