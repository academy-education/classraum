"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Upload } from 'lucide-react'
import { DataExportModal } from './DataExportModal'
import { DataImportModal } from './DataImportModal'
import { ImportResult } from '@/hooks/useDataImport'

// Example component showing how to use the data export/import modals
export function DataManagementExample() {
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  
  // Example data - replace with your actual data
  const [data, setData] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Student', enrolledDate: new Date('2024-01-15') },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Teacher', enrolledDate: new Date('2024-02-20') },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Student', enrolledDate: new Date('2024-03-10') },
  ])

  const handleImportComplete = (result: ImportResult<unknown>) => {
    console.log('Import completed:', result)
    // Update your data with the imported records
    if (result.data.length > 0) {
      const typedData = result.data as { id: number; name: string; email: string; role: string; enrolledDate: Date }[]
      setData(prevData => [...prevData, ...typedData])
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Data Management Example</h2>
      
      <div className="flex gap-4">
        <Button onClick={() => setShowExportModal(true)}>
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
        
        <Button onClick={() => setShowImportModal(true)} variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import Data
        </Button>
      </div>

      {/* Current Data Display */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Current Data ({data.length} records)</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Enrolled Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-2">{item.id}</td>
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2">{item.email}</td>
                  <td className="px-4 py-2">{item.role}</td>
                  <td className="px-4 py-2">{item.enrolledDate.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Modal */}
      <DataExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={data}
        title="Export User Data"
        defaultFilename="users_export"
      />

      {/* Import Modal */}
      <DataImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
        title="Import User Data"
        acceptedFormats={['csv', 'json']}
      />
    </div>
  )
}