import fs from 'fs';
import path from 'path';

// Read the users.json file
const usersFilePath = path.join(process.cwd(), 'server', 'data', 'users.json');
const usersData = fs.readFileSync(usersFilePath, 'utf8');
const users = JSON.parse(usersData);

console.log('=== Users in users.json ===');
users.forEach(user => {
  console.log(`\nUser: ${user.name}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Password: ${user.password}`);
  console.log(`  Role: ${user.role}`);
});

// Test authentication with admin credentials
const testEmail = 'admin@hyrax.com';
const testPassword = 'HyraxAdmin2024!SecurePass';

console.log('\n=== Testing Authentication ===');
console.log(`Testing with: ${testEmail} / ${testPassword}`);

const user = users.find(u => u.email.toLowerCase() === testEmail.toLowerCase());

if (!user) {
  console.log('❌ User not found');
} else {
  console.log('✓ User found:', user.email);
  console.log(`  Stored password: "${user.password}"`);
  console.log(`  Test password:   "${testPassword}"`);
  console.log(`  Match: ${user.password === testPassword ? '✓ YES' : '❌ NO'}`);
  console.log(`  Password length - Stored: ${user.password.length}, Test: ${testPassword.length}`);
}

// Test with the test user too
const testUser2 = 'test@hyrax.com';
const testPassword2 = 'password123';

console.log(`\nTesting with: ${testUser2} / ${testPassword2}`);
const user2 = users.find(u => u.email.toLowerCase() === testUser2.toLowerCase());

if (!user2) {
  console.log('❌ User not found');
} else {
  console.log('✓ User found:', user2.email);
  console.log(`  Stored password: "${user2.password}"`);
  console.log(`  Test password:   "${testPassword2}"`);
  console.log(`  Match: ${user2.password === testPassword2 ? '✓ YES' : '❌ NO'}`);
}
