"use client"

import React, { useState } from 'react'
import { Plus, Users, BookOpen, Calendar, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Import our composition patterns
import { Modal } from '../patterns/Modal'
import { DataTable } from '../patterns/DataTable'
import { FormField } from '../patterns/FormField'
import { Card } from '../patterns/Card'
import { PageLayout } from '../patterns/PageLayout'
import { withLoading, useLoading, Skeleton } from '../patterns/withLoading'

// Example: Using Modal composition pattern
const ExampleModal = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '' })

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Open Modal Example
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="md">
        <Modal.Header>
          <h2 className="text-lg font-semibold">Create New User</h2>
          <p className="text-sm text-gray-600">Add a new user to the system</p>
        </Modal.Header>
        
        <Modal.Body>
          <div className="space-y-4">
            <FormField id="name" required>
              <FormField.Label>Full Name</FormField.Label>
              <FormField.Control>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </FormField.Control>
              <FormField.Help>
                Enter the user's first and last name
              </FormField.Help>
            </FormField>

            <FormField id="email" required>
              <FormField.Label>Email Address</FormField.Label>
              <FormField.Control>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </FormField.Control>
              <FormField.Error>
                {!formData.email.includes('@') && formData.email ? 'Please enter a valid email' : ''}
              </FormField.Error>
            </FormField>
          </div>
        </Modal.Body>
        
        <Modal.Footer>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsOpen(false)}>
              Create User
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  )
})

// Example: Using DataTable composition pattern
const ExampleDataTable = React.memo(() => {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  
  const sampleData = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Teacher', status: 'Active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Student', status: 'Active' },
    { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'Admin', status: 'Inactive' },
  ]

  return (
    <DataTable
      data={sampleData}
      showSearch
      searchPlaceholder="Search users..."
      selectable
      onSelectionChange={setSelectedRows}
    >
      <DataTable.Header>
        <DataTable.SelectHeader />
        <DataTable.ColumnHeader field="name" sortable>Name</DataTable.ColumnHeader>
        <DataTable.ColumnHeader field="email" sortable>Email</DataTable.ColumnHeader>
        <DataTable.ColumnHeader field="role">Role</DataTable.ColumnHeader>
        <DataTable.ColumnHeader field="status" sortable>Status</DataTable.ColumnHeader>
        <DataTable.ColumnHeader>Actions</DataTable.ColumnHeader>
      </DataTable.Header>
      
      <DataTable.Body>
        {sampleData.length === 0 ? (
          <DataTable.Empty colSpan={6}>
            No users found. Create your first user to get started.
          </DataTable.Empty>
        ) : (
          sampleData.map((user) => (
            <DataTable.Row key={user.id} id={user.id} selectable>
              <DataTable.Cell>
                <div className="font-medium">{user.name}</div>
              </DataTable.Cell>
              <DataTable.Cell>
                <div className="text-gray-600">{user.email}</div>
              </DataTable.Cell>
              <DataTable.Cell>
                <Card.Badge variant={user.role === 'Admin' ? 'primary' : 'default'}>
                  {user.role}
                </Card.Badge>
              </DataTable.Cell>
              <DataTable.Cell>
                <Card.Badge variant={user.status === 'Active' ? 'success' : 'default'}>
                  {user.status}
                </Card.Badge>
              </DataTable.Cell>
              <DataTable.Cell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">Edit</Button>
                  <Button variant="ghost" size="sm">Delete</Button>
                </div>
              </DataTable.Cell>
            </DataTable.Row>
          ))
        )}
      </DataTable.Body>
    </DataTable>
  )
})

// Example: Using Card composition patterns
const ExampleCards = React.memo(() => {
  const stats = [
    { label: 'Total Users', value: 1234, icon: <Users className="w-6 h-6" /> },
    { label: 'Active Sessions', value: 89, icon: <BookOpen className="w-6 h-6" /> },
    { label: 'This Month', value: 456, icon: <Calendar className="w-6 h-6" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card.Stat
            key={index}
            title={stat.label}
            value={stat.value}
            icon={stat.icon}
            change={{ value: '+12%', type: 'increase', period: 'vs last month' }}
          />
        ))}
      </div>

      {/* Regular Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hoverable>
          <Card.Header showActionsMenu>
            <div>
              <Card.Title>Recent Activity</Card.Title>
              <Card.Subtitle>Last 7 days</Card.Subtitle>
            </div>
          </Card.Header>
          <Card.Content>
            <p className="text-gray-600">Activity content would go here...</p>
          </Card.Content>
          <Card.Footer divider>
            <Card.Actions>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button size="sm">View All</Button>
            </Card.Actions>
          </Card.Footer>
        </Card>

        <Card.Clickable 
          showArrow
          onClick={() => console.log('Card clicked')}
        >
          <Card.Header>
            <div>
              <Card.Title>Quick Actions</Card.Title>
              <Card.Subtitle>Commonly used features</Card.Subtitle>
            </div>
          </Card.Header>
          <Card.Content>
            <p className="text-gray-600">Click this card to navigate...</p>
          </Card.Content>
        </Card.Clickable>
      </div>
    </div>
  )
})

// Example: Using withLoading HOC
const LoadingExample = withLoading(
  React.memo(() => {
    return (
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Data Loaded Successfully!</h3>
        <p className="text-gray-600">This component was wrapped with the withLoading HOC.</p>
      </div>
    )
  }),
  { loadingText: 'Loading data...', loadingSize: 'lg' }
)

// Example: Using useLoading hook
const LoadingHookExample = React.memo(() => {
  const { loading, error, withLoadingWrapper } = useLoading()

  const simulateAsyncOperation = React.useCallback(async () => {
    await withLoadingWrapper(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('Operation completed!')
    })
  }, [withLoadingWrapper])

  return (
    <Card>
      <Card.Header>
        <Card.Title>Loading Hook Example</Card.Title>
      </Card.Header>
      <Card.Content>
        {loading ? (
          <div className="space-y-3">
            <Skeleton lines={3} />
            <Skeleton variant="rectangular" height={100} />
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">Click the button to simulate a loading operation.</p>
            <Button onClick={simulateAsyncOperation} disabled={loading}>
              {loading ? 'Loading...' : 'Start Operation'}
            </Button>
          </div>
        )}
      </Card.Content>
    </Card>
  )
})

// Main example component showing all patterns
export const CompositionExample = React.memo(() => {
  const [showLoadingExample, setShowLoadingExample] = useState(false)

  return (
    <PageLayout maxWidth="2xl">
      <PageLayout.Header>
        <PageLayout.Title>Component Composition Patterns</PageLayout.Title>
        <PageLayout.Description>
          Examples of how to use our composition patterns for building complex UIs
        </PageLayout.Description>
      </PageLayout.Header>

      <PageLayout.Content>
        <PageLayout.Section 
          title="Modal Pattern"
          description="Compound component pattern for flexible modal composition"
        >
          <ExampleModal />
        </PageLayout.Section>

        <PageLayout.Section 
          title="DataTable Pattern"
          description="Flexible data table with sorting, filtering, and selection"
        >
          <ExampleDataTable />
        </PageLayout.Section>

        <PageLayout.Section 
          title="Card Patterns"
          description="Various card layouts and compositions"
        >
          <ExampleCards />
        </PageLayout.Section>

        <PageLayout.Section 
          title="Loading Patterns"
          description="HOC and hook patterns for loading states"
        >
          <PageLayout.Grid columns={2}>
            <div>
              <h4 className="font-medium mb-3">Higher-Order Component</h4>
              <LoadingExample 
                loading={showLoadingExample} 
                loadingText="Loading with HOC..."
              />
              <Button 
                onClick={() => setShowLoadingExample(!showLoadingExample)}
                className="mt-3"
                variant="outline"
                size="sm"
              >
                Toggle Loading
              </Button>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Loading Hook</h4>
              <LoadingHookExample />
            </div>
          </PageLayout.Grid>
        </PageLayout.Section>
      </PageLayout.Content>
    </PageLayout>
  )
})