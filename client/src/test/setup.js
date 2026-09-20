import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// input-otp checks the element under its password-manager badge in a deferred
// callback. jsdom does not provide this browser API, so keep the check inert.
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}
