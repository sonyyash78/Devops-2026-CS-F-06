const fs = require("fs");
const path = require("path");
const student = require("./students.json");

const root = __dirname;
let passedCount = 0;
let failedCount = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`FAIL: ${description}`);
    failedCount++;
  }
}

console.log('=== Running Application Tests ===\n');

// 1. File existence checks
const requiredFiles = [
  'index.html',
  'script.js',
  'server.js',
  'style.css',
  'success.html',
  'package.json',
  'log.json'
];

requiredFiles.forEach((file) => {
  const fullPath = path.join(root, file);
  assert(`File exists: ${file}`, fs.existsSync(fullPath));
});

// 2. Email Validation Logic Tests
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  return typeof email === 'string' && email.trim() !== '' && emailRegex.test(email.trim());
}

assert('Valid email format (test@example.com)', validateEmail('test@example.com'));
assert('Valid email format with subdomains (user@mail.co.uk)', validateEmail('user@mail.co.uk'));
assert('Reject invalid email without @ (testexample.com)', !validateEmail('testexample.com'));
assert('Reject invalid email without domain (test@)', !validateEmail('test@'));
assert('Reject empty email', !validateEmail(''));

// 3. Password Validation Logic Tests
function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

assert('Accept valid password (length >= 6)', validatePassword('password123'));
assert('Accept minimum valid password (length == 6)', validatePassword('123456'));
assert('Reject short password (length < 6)', !validatePassword('12345'));
assert('Reject empty password', !validatePassword(''));

// 4. Hardcoded Credentials Authentication Tests
const VALID_CREDENTIALS = {
  email: 'tanish@gmail.com',
  password: 'tanish@123',
};

function authenticate(email, password) {
  if (!validateEmail(email)) return false;
  if (!validatePassword(password)) return false;
  return email.trim().toLowerCase() === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password;
}

assert('Authenticate valid credentials (tanish@gmail.com / tanish@123)', authenticate('tanish@gmail.com', 'tanish@123'));
assert('Case-insensitive email match (Tanish@Gmail.com / tanish@123)', authenticate('Tanish@Gmail.com', 'tanish@123'));
assert('Reject wrong password (tanish@gmail.com / wrongpass)', !authenticate('tanish@gmail.com', 'wrongpass'));
assert('Reject wrong email (other@gmail.com / tanish@123)', !authenticate('other@gmail.com', 'tanish@123'));
assert('Reject completely different credentials', !authenticate('attacker@test.com', 'secret123'));

// 5. User Data JSON Logging Tests
const { saveLog } = require("./server.js");
const logFilePath = path.join(root, "log.json");

assert('Log file exists (log.json)', fs.existsSync(logFilePath));

const prevLogs = JSON.parse(fs.readFileSync(logFilePath, 'utf8') || '[]');
assert('Log file contains valid JSON array', Array.isArray(prevLogs));

const testUserEntry = {
  email: 'tanish@gmail.com',
  password: 'tanish@123',
  status: 'success',
  message: 'Login successful!',
  timestamp: new Date().toISOString(),
  loggedAt: new Date().toISOString(),
};

saveLog(testUserEntry);

const updatedLogs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
const latestEntry = updatedLogs[updatedLogs.length - 1];

assert('Latest user data is saved in log.json', Boolean(latestEntry && latestEntry.email === 'tanish@gmail.com' && latestEntry.password === 'tanish@123'));
assert('Latest log entry includes valid timestamp', Boolean(latestEntry && latestEntry.timestamp));
assert('Latest log entry includes status', Boolean(latestEntry && latestEntry.status === 'success'));

// Summary
console.log(`\n=== Test Results: ${passedCount} Passed, ${failedCount} Failed ===`);
if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('All tests passed successfully!\n');
  process.exit(0);
}
