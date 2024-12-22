import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';

// Suppress specific React warnings during tests if needed
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('Warning: ') || args[0].includes('[React]'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};