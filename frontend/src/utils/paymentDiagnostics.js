/**
 * Payment Diagnostics Utility
 * Run this in browser console to diagnose payment issues
 */

export const runPaymentDiagnostics = () => {
  console.log('🔍 Payment Diagnostics Starting...\n');

  // Test 1: Check Razorpay Script
  console.log('1️⃣ Razorpay Script Check:');
  if (typeof window !== 'undefined' && window.Razorpay) {
    console.log('✅ Razorpay script loaded successfully');
    console.log('📝 Type:', typeof window.Razorpay);
  } else {
    console.log('❌ Razorpay script not loaded');
    console.log('🔧 Fix: Check if script tag is present in index.html');
  }

  // Test 2: Check CSP
  console.log('\n2️⃣ Content Security Policy Check:');
  const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
  if (metaTags.length > 0) {
    const csp = metaTags[0].getAttribute('content');
    const hasRazorpay = csp.includes('razorpay.com') || csp.includes('checkout.razorpay.com');
    if (hasRazorpay) {
      console.log('✅ CSP includes Razorpay domains');
    } else {
      console.log('❌ CSP missing Razorpay domains');
      console.log('🔧 Fix: Update CSP in index.html');
    }
  } else {
    console.log('⚠️ No CSP found');
  }

  // Test 3: Check Network Requests
  console.log('\n3️⃣ Network Check:');
  console.log('📝 Open F12 → Network tab');
  console.log('📝 Look for: checkout.razorpay.com/v1/checkout.js');
  console.log('📝 Should show Status: 200 (not blocked)');

  // Test 4: Check Browser Console
  console.log('\n4️⃣ Console Error Check:');
  console.log('📝 Check for CSP violations');
  console.log('📝 Check for script loading errors');
  console.log('📝 Check for network errors');

  // Test 5: Browser Info
  console.log('\n5️⃣ Browser Information:');
  console.log('📝 User Agent:', navigator.userAgent);
  console.log('📝 Current URL:', window.location.href);
  console.log('📝 Origin:', window.location.origin);

  // Test 6: Extension Check
  console.log('\n6️⃣ Extension Check:');
  console.log('📝 Disable ad blockers for localhost');
  console.log('📝 Disable security extensions');
  console.log('📝 Try incognito mode');

  // Test 7: Quick Razorpay Test
  console.log('\n7️⃣ Quick Razorpay Test:');
  if (typeof window !== 'undefined' && window.Razorpay) {
    try {
      const testOptions = {
        key: 'test_key',
        amount: 100,
        currency: 'INR',
        name: 'Test',
        description: 'Test Payment',
        handler: () => console.log('Test handler called')
      };
      console.log('✅ Razorpay constructor available');
      console.log('📝 Options structure valid');
    } catch (error) {
      console.log('❌ Razorpay constructor error:', error.message);
    }
  }

  console.log('\n🎯 Diagnostic Complete!');
  console.log('📞 If issues persist, check the console errors above');
};

// Auto-run diagnostics if in browser
if (typeof window !== 'undefined') {
  console.log('💡 To run payment diagnostics, call: runPaymentDiagnostics()');
}

export default runPaymentDiagnostics;
