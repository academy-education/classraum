import React from 'react'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container).toBeInTheDocument()
  })

  it('renders with custom text', () => {
    const testText = 'Loading test data...'
    render(<LoadingSpinner text={testText} />)
    expect(screen.getByText(testText)).toBeInTheDocument()
  })

  it('renders without text by default', () => {
    render(<LoadingSpinner />)
    // Should not find any text elements
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const customClass = 'custom-spinner-class'
    const { container } = render(<LoadingSpinner className={customClass} />)
    expect(container.firstChild).toHaveClass(customClass)
  })

  it('is a memoized component', () => {
    // Test that the component is wrapped with React.memo (memo components are objects)
    expect(LoadingSpinner).toBeDefined()
    expect(typeof LoadingSpinner).toBe('object')
    expect(LoadingSpinner.type).toBeDefined()
  })
})