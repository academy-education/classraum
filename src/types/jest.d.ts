/**
 * Augments Jest's `expect` with the `@testing-library/jest-dom` matchers
 * (`toBeInTheDocument`, `toHaveClass`, etc.). The matchers are wired at
 * runtime by `jest.setup.js` (which imports `@testing-library/jest-dom`),
 * but the type augmentation needs to be visible to TypeScript at compile
 * time too — that's what this file does.
 *
 * Without this, every test that uses these matchers errors with
 * "Property 'toBeInTheDocument' does not exist on type 'JestMatchers<...>'."
 */
import '@testing-library/jest-dom'
