'use client'

import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Bell,
  Palette,
  Save,
  Server,
  Zap,
  Upload,
  Download,
  Eye,
  EyeOff,
  Check,
  AlertTriangle
} from 'lucide-react';

export function SettingsDashboard() {
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'security' | 'notifications' | 'appearance' | 'advanced'>('general');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure system settings, integrations, and preferences</p>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleSave}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {saved ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <div className="flex space-x-8 px-6 overflow-x-auto">
            {([
              { key: 'general', label: 'General', icon: Settings },
              { key: 'integrations', label: 'Integrations', icon: Zap },
              { key: 'security', label: 'Security', icon: Shield },
              { key: 'notifications', label: 'Notifications', icon: Bell },
              { key: 'appearance', label: 'Appearance', icon: Palette },
              { key: 'advanced', label: 'Advanced', icon: Server }
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Classraum Academy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Support Email
                    </label>
                    <input
                      type="email"
                      defaultValue="support@classraum.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Zone
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>UTC-8 (Pacific Standard Time)</option>
                      <option>UTC-5 (Eastern Standard Time)</option>
                      <option>UTC+0 (Greenwich Mean Time)</option>
                      <option>UTC+1 (Central European Time)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      defaultValue="+1 (555) 123-4567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      defaultValue="https://classraum.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      rows={3}
                      defaultValue="123 Education Street, Learning City, LC 12345"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">API Keys</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Supabase', service: 'Database & Auth', key: 'sb_..._abc123xyz' },
                    { name: 'Stripe', service: 'Payments', key: 'sk_test_..._789def' },
                    { name: 'SendGrid', service: 'Email', key: 'SG._abc123..._xyz789' },
                    { name: 'Google OAuth', service: 'Authentication', key: 'gcp_..._client_id' }
                  ].map((integration) => (
                    <div key={integration.name} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{integration.name}</h4>
                          <p className="text-sm text-gray-500">{integration.service}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type={showApiKeys ? "text" : "password"}
                            value={integration.key}
                            readOnly
                            className="px-3 py-2 border border-gray-300 rounded bg-white text-sm font-mono"
                          />
                          <button
                            onClick={() => setShowApiKeys(!showApiKeys)}
                            className="p-2 text-gray-500 hover:text-gray-700"
                          >
                            {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">External Services</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Google Calendar', status: 'connected', description: 'Sync schedules and events' },
                    { name: 'Zoom Integration', status: 'connected', description: 'Video conferencing for classes' },
                    { name: 'Slack Notifications', status: 'disconnected', description: 'Team communication' },
                    { name: 'Microsoft Teams', status: 'disconnected', description: 'Alternative video conferencing' }
                  ].map((service) => (
                    <div key={service.name} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{service.name}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              service.status === 'connected' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {service.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{service.description}</p>
                        </div>
                        <button className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          service.status === 'connected'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}>
                          {service.status === 'connected' ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Password Requirements</h4>
                      <p className="text-sm text-gray-500">Enforce strong password policies</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Session Timeout</h4>
                      <p className="text-sm text-gray-500">Auto logout after inactivity</p>
                    </div>
                    <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>15 minutes</option>
                      <option>30 minutes</option>
                      <option>1 hour</option>
                      <option>4 hours</option>
                      <option>Never</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Access Control</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">IP Whitelist</h4>
                    <p className="text-sm text-gray-500 mb-3">Restrict admin access to specific IP addresses</p>
                    <textarea
                      rows={3}
                      placeholder="192.168.1.0/24&#10;10.0.0.1&#10;203.0.113.0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Login Attempts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Failed Attempts
                        </label>
                        <input
                          type="number"
                          defaultValue="5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lockout Duration (minutes)
                        </label>
                        <input
                          type="number"
                          defaultValue="30"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
                <div className="space-y-4">
                  {[
                    { name: 'New User Registration', description: 'When new users sign up', enabled: true },
                    { name: 'System Alerts', description: 'Critical system notifications', enabled: true },
                    { name: 'Security Events', description: 'Login failures and security issues', enabled: true },
                    { name: 'Backup Status', description: 'Database backup completion', enabled: false },
                    { name: 'Performance Alerts', description: 'High resource usage warnings', enabled: true },
                    { name: 'Update Notifications', description: 'System and feature updates', enabled: false }
                  ].map((notification) => (
                    <div key={notification.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{notification.name}</h4>
                        <p className="text-sm text-gray-500">{notification.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={notification.enabled} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Email
                    </label>
                    <input
                      type="email"
                      defaultValue="admin@classraum.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Frequency
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Immediate</option>
                      <option>Hourly Digest</option>
                      <option>Daily Digest</option>
                      <option>Weekly Summary</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Theme Settings</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Color Scheme</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { name: 'Light', colors: ['bg-white', 'bg-gray-100', 'bg-gray-200'] },
                        { name: 'Dark', colors: ['bg-gray-900', 'bg-gray-800', 'bg-gray-700'] },
                        { name: 'Blue', colors: ['bg-blue-50', 'bg-blue-100', 'bg-blue-200'] }
                      ].map((theme) => (
                        <div key={theme.name} className="text-center">
                          <div className="flex space-x-1 mb-2">
                            {theme.colors.map((color, index) => (
                              <div key={index} className={`w-8 h-8 rounded ${color} border border-gray-300`} />
                            ))}
                          </div>
                          <label className="flex items-center justify-center">
                            <input type="radio" name="theme" className="mr-2" defaultChecked={theme.name === 'Light'} />
                            <span className="text-sm">{theme.name}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Logo & Branding</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload Logo
                        </label>
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-2xl font-bold text-gray-500">C</span>
                          </div>
                          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                            <Upload className="h-4 w-4 mr-2 inline" />
                            Upload
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Primary Color
                        </label>
                        <div className="flex items-center space-x-2">
                          <input type="color" defaultValue="#3B82F6" className="w-12 h-10 border border-gray-300 rounded" />
                          <input type="text" defaultValue="#3B82F6" className="px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Layout Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Compact Mode</h4>
                      <p className="text-sm text-gray-500">Reduce spacing for more content</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Sidebar Collapse</h4>
                      <p className="text-sm text-gray-500">Auto-collapse sidebar on mobile</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Database Settings</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Backup Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Backup Frequency
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Every 6 hours</option>
                          <option>Daily</option>
                          <option>Weekly</option>
                          <option>Monthly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Retention Period
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>7 days</option>
                          <option>30 days</option>
                          <option>90 days</option>
                          <option>1 year</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Performance Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Connection Pool Size
                        </label>
                        <input
                          type="number"
                          defaultValue="20"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Query Timeout (seconds)
                        </label>
                        <input
                          type="number"
                          defaultValue="30"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Configuration</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Environment Variables</h4>
                    <p className="text-sm text-gray-500 mb-3">Configure system environment variables</p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="VARIABLE_NAME"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                        <input
                          type="text"
                          placeholder="value"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                        <button className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-900">Danger Zone</h4>
                        <p className="text-sm text-yellow-700 mt-1 mb-3">
                          These actions are irreversible and may cause data loss.
                        </p>
                        <div className="space-y-2">
                          <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                            Reset All Settings
                          </button>
                          <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                            Clear All Data
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Import/Export</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Export Settings</h4>
                    <p className="text-sm text-gray-500 mb-3">Download current configuration</p>
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Download className="h-4 w-4 mr-2 inline" />
                      Export Config
                    </button>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Import Settings</h4>
                    <p className="text-sm text-gray-500 mb-3">Upload configuration file</p>
                    <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <Upload className="h-4 w-4 mr-2 inline" />
                      Import Config
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}