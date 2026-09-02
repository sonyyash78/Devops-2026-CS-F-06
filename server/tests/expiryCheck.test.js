import assert from 'node:assert/strict';
import test from 'node:test';
import { checkExpiryStatus } from '../utils/expiryCheck.js';

const dateAfterDays = (days) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

test('classifies medicines at each expiry threshold', () => {
  assert.equal(checkExpiryStatus(dateAfterDays(-1)), 'EXPIRED');
  assert.equal(checkExpiryStatus(dateAfterDays(0)), 'CRITICAL');
  assert.equal(checkExpiryStatus(dateAfterDays(30)), 'CRITICAL');
  assert.equal(checkExpiryStatus(dateAfterDays(31)), 'WARNING');
  assert.equal(checkExpiryStatus(dateAfterDays(60)), 'WARNING');
  assert.equal(checkExpiryStatus(dateAfterDays(61)), 'CAUTION');
  assert.equal(checkExpiryStatus(dateAfterDays(90)), 'CAUTION');
  assert.equal(checkExpiryStatus(dateAfterDays(91)), 'SAFE');
});
