import React from 'react'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders with correct text and status', () => {
    render(<StatusBadge status="active" text="Active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders different status types', () => {
    const { rerender } = render(<StatusBadge status="active" text="Active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()

    rerender(<StatusBadge status="error" text="Error" />)
    expect(screen.getByText('Error')).toBeInTheDocument()

    rerender(<StatusBadge status="pending" text="Pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('shows icon by default', () => {
    render(<StatusBadge status="active" text="Test" />)
    const badge = screen.getByText('Test').parentElement
    const icon = badge?.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('hides icon when showIcon is false', () => {
    render(<StatusBadge status="active" text="Test" showIcon={false} />)
    const badge = screen.getByText('Test').parentElement
    const icon = badge?.querySelector('svg')
    expect(icon).not.toBeInTheDocument()
  })

  it('is a memoized component', () => {
    // Test that the component is wrapped with React.memo (memo components are objects)
    expect(StatusBadge).toBeDefined()
    expect(typeof StatusBadge).toBe('object')
    expect(StatusBadge.type).toBeDefined()
  })
})