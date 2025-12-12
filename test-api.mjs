import fetch from 'node-fetch';

const API_URL = 'http://localhost:5173/api/auth';

async function testLogin(email, password) {
  console.log(`\n=== Testing Login: ${email} ===`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password,
        action: 'login'
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✓ LOGIN SUCCESSFUL');
    } else {
      console.log('❌ LOGIN FAILED:', data.message);
    }
    
    return data;
  } catch (error) {
    console.error('❌ REQUEST FAILED:', error.message);
    return null;
  }
}

// Test both users
(async () => {
  console.log('Testing authentication against Vite dev server...\n');
  
  await testLogin('admin@hyrax.com', 'HyraxAdmin2024!SecurePass');
  await testLogin('test@hyrax.com', 'password123');
  
  // Also test with wrong password
  await testLogin('admin@hyrax.com', 'wrongpassword');
})();
