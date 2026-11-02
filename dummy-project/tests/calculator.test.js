import assert from 'node:assert/strict';
import test from 'node:test';
import { add, subtract, multiply, divide } from '../src/calculator.js';

test('calculator arithmetic operations', () => {
  assert.equal(add(2, 2), 4);
  assert.equal(subtract(5, 3), 2);
  assert.equal(multiply(3, 3), 9);
  assert.equal(divide(10, 2), 5);
});

test('divide by zero guard', () => {
  assert.throws(() => divide(10, 0), /Division by zero/);
});
