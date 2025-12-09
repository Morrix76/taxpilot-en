// Test file for disposable email checker
// Run with: node backend/test/disposableEmail.test.js

import { isDisposableEmail, getDisposableDomainsCount, isDomainDisposable } from '../utils/disposableEmail.js';

console.log('\n🧪 Testing Disposable Email Checker\n');
console.log('═'.repeat(50));

// Test 1: Check domains count
console.log(`\n✅ Loaded ${getDisposableDomainsCount()} disposable domains`);

// Test 2: Valid permanent emails (should return false)
const validEmails = [
  'user@gmail.com',
  'john.doe@outlook.com',
  'admin@company.com',
  'contact@yahoo.com',
  'info@business.co.uk'
];

console.log('\n📧 Testing VALID (permanent) emails:');
validEmails.forEach(email => {
  const isDisposable = isDisposableEmail(email);
  console.log(`  ${isDisposable ? '❌' : '✅'} ${email} → ${isDisposable ? 'BLOCKED' : 'ALLOWED'}`);
});

// Test 3: Disposable emails (should return true)
const disposableEmails = [
  'test@10minutemail.com',
  'user@yopmail.com',
  'spam@guerrillamail.com',
  'temp@mailinator.com',
  'fake@trashmail.com',
  'test@tempmail.com',
  'burner@getnada.com'
];

console.log('\n🚫 Testing DISPOSABLE emails:');
disposableEmails.forEach(email => {
  const isDisposable = isDisposableEmail(email);
  console.log(`  ${isDisposable ? '✅' : '❌'} ${email} → ${isDisposable ? 'BLOCKED' : 'ALLOWED'}`);
});

// Test 4: Invalid inputs
const invalidInputs = [
  '',
  null,
  undefined,
  'not-an-email',
  '@nodomain.com',
  'user@',
  123
];

console.log('\n⚠️  Testing INVALID inputs:');
invalidInputs.forEach(input => {
  const isDisposable = isDisposableEmail(input);
  console.log(`  ✅ ${JSON.stringify(input)} → ${isDisposable ? 'BLOCKED' : 'ALLOWED (safe default)'}`);
});

// Test 5: Case insensitivity
console.log('\n🔤 Testing CASE INSENSITIVITY:');
const caseSensitiveTests = [
  'User@YOPMAIL.COM',
  'TEST@Mailinator.COM',
  'Admin@10MinuteMail.com'
];
caseSensitiveTests.forEach(email => {
  const isDisposable = isDisposableEmail(email);
  console.log(`  ${isDisposable ? '✅' : '❌'} ${email} → ${isDisposable ? 'BLOCKED' : 'ALLOWED'}`);
});

// Test 6: Domain check
console.log('\n🌐 Testing DOMAIN check:');
const domains = ['yopmail.com', 'gmail.com', 'mailinator.com'];
domains.forEach(domain => {
  const isDisposable = isDomainDisposable(domain);
  console.log(`  ${isDisposable ? '🚫' : '✅'} ${domain} → ${isDisposable ? 'DISPOSABLE' : 'PERMANENT'}`);
});

console.log('\n' + '═'.repeat(50));
console.log('\n✅ All tests completed!\n');

