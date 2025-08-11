// Debug authentication system
import { createHash, scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  if (!stored || !stored.includes('.')) {
    return false;
  }
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false;
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Test the credentials
async function testCredentials() {
  console.log('Testing authentication system...');
  
  // Hash admin123 password
  const adminHash = await hashPassword('admin123');
  console.log('Admin hash:', adminHash);
  
  // Test comparison
  const isValid = await comparePasswords('admin123', adminHash);
  console.log('Password comparison test:', isValid);
  
  // Test wrong password
  const isInvalid = await comparePasswords('wrongpass', adminHash);
  console.log('Wrong password test:', isInvalid);
}

testCredentials().catch(console.error);