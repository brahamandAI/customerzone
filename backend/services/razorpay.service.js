const Razorpay = require('razorpay');
const crypto = require('crypto');

// Check if Razorpay credentials are available
const getRazorpayConfig = () => {
  return process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
};

const isRazorpayConfigured = getRazorpayConfig();

let razorpay = null;

// Initialize Razorpay function
const initializeRazorpay = () => {
  if (getRazorpayConfig()) {
    if (!razorpay) {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      console.log('✅ Razorpay initialized successfully');
    }
    return razorpay;
  } else {
    console.log('⚠️  Razorpay not configured. Payment features will be disabled.');
    console.log('   To enable payments, add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file');
    return null;
  }
};

const razorpayService = {
  // Check if Razorpay is configured
  isConfigured() {
    return getRazorpayConfig();
  },

  // Create a new order
  async createOrder(amount, currency = 'INR', receipt = null) {
    if (!getRazorpayConfig()) {
      throw new Error('Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.');
    }

    try {
      const razorpayInstance = initializeRazorpay();
      if (!razorpayInstance) {
        throw new Error('Failed to initialize Razorpay');
      }

      const options = {
        amount: amount * 100, // Razorpay expects amount in paise
        currency: currency,
        receipt: receipt || `receipt_${Date.now()}`,
        payment_capture: 1
      };

      const order = await razorpayInstance.orders.create(options);
      return order;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new Error('Failed to create payment order');
    }
  },

  // Verify payment signature
  verifyPaymentSignature(orderId, paymentId, signature) {
    if (!getRazorpayConfig()) {
      throw new Error('Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.');
    }

    try {
      const text = `${orderId}|${paymentId}`;
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

      return generatedSignature === signature;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  },

  // Get payment details
  async getPaymentDetails(paymentId) {
    if (!getRazorpayConfig()) {
      throw new Error('Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.');
    }

    try {
      const razorpayInstance = initializeRazorpay();
      if (!razorpayInstance) {
        throw new Error('Failed to initialize Razorpay');
      }

      const payment = await razorpayInstance.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw new Error('Failed to fetch payment details');
    }
  },

  // Refund payment
  async refundPayment(paymentId, amount = null, reason = 'Expense refund') {
    if (!getRazorpayConfig()) {
      throw new Error('Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.');
    }

    try {
      const razorpayInstance = initializeRazorpay();
      if (!razorpayInstance) {
        throw new Error('Failed to initialize Razorpay');
      }

      const refundOptions = {
        payment_id: paymentId,
        reason: reason
      };

      if (amount) {
        refundOptions.amount = amount * 100; // Convert to paise
      }

      const refund = await razorpayInstance.payments.refund(refundOptions);
      return refund;
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw new Error('Failed to refund payment');
    }
  },

  // Get all payments for a user
  async getUserPayments(userId, limit = 10, skip = 0) {
    if (!getRazorpayConfig()) {
      throw new Error('Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.');
    }

    try {
      const razorpayInstance = initializeRazorpay();
      if (!razorpayInstance) {
        throw new Error('Failed to initialize Razorpay');
      }

      const payments = await razorpayInstance.payments.all({
        count: limit,
        skip: skip,
        // You can add more filters here based on your requirements
      });
      return payments;
    } catch (error) {
      console.error('Error fetching user payments:', error);
      throw new Error('Failed to fetch user payments');
    }
  }
};

module.exports = razorpayService; 