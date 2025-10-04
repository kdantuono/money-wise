import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeVisible(): R;
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}