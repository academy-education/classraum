'use client'

import React, { useState } from 'react';
import {
  Server,
  Database,
  Users,
  Zap,
  HardDrive,
  Wifi,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  RefreshCw,
  Download,
  Upload,
  Monitor,
  Cpu,
  MemoryStick,
  Globe,
  FileText
} from 'lucide-react';

export function SystemDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'logs' | 'maintenance'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Mock system data
  const systemStatus = {
    overall: 'healthy',
    uptime: '15 days, 6 hours',
    version: '2.4.1',
    lastUpdate: new Date('2024-11-01T10:30:00')
  };

  const systemMetrics = [
    {
      name: 'CPU Usage',
      value: '34%',
      status: 'good',
      icon: Cpu,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Memory',
      value: '2.1GB / 8GB',
      status: 'good',
      icon: MemoryStick,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Storage',
      value: '156GB / 500GB',
      status: 'warning',
      icon: HardDrive,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      name: 'Network',
      value: '↑ 2.3MB/s ↓ 1.8MB/s',
      status: 'good',
      icon: Wifi,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  const services = [
    { name: 'Database', status: 'running', uptime: '99.9%', icon: Database },
    { name: 'API Server', status: 'running', uptime: '99.8%', icon: Server },
    { name: 'Authentication', status: 'running', uptime: '100%', icon: Shield },
    { name: 'File Storage', status: 'warning', uptime: '98.5%', icon: HardDrive },
    { name: 'Email Service', status: 'running', uptime: '99.2%', icon: Globe },
    { name: 'Background Jobs', status: 'running', uptime: '99.7%', icon: Zap }
  ];

  const recentLogs = [
    {
      id: '1',
      level: 'info',
      message: 'Database backup completed successfully',
      timestamp: new Date('2024-11-06T10:45:00'),
      service: 'Database'
    },
    {
      id: '2',
      level: 'warning',
      message: 'High memory usage detected (85%)',
      timestamp: new Date('2024-11-06T10:30:00'),
      service: 'System'
    },
    {
      id: '3',
      level: 'info',
      message: 'User authentication successful',
      timestamp: new Date('2024-11-06T10:25:00'),
      service: 'Auth'
    },
    {
      id: '4',
      level: 'error',
      message: 'Failed to connect to external API',
      timestamp: new Date('2024-11-06T10:20:00'),
      service: 'API'
    },
    {
      id: '5',
      level: 'info',
      message: 'Scheduled maintenance completed',
      timestamp: new Date('2024-11-06T09:00:00'),
      service: 'System'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'healthy':
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'running':
      case 'healthy':
      case 'good':
        return 'bg-green-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'error':
      case 'critical':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'text-blue-600 bg-blue-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Management</h1>
        <p className="text-gray-600">Monitor system health, logs, and maintenance tools</p>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleRefresh}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${getStatusBg(systemStatus.overall)}`}>
              <CheckCircle className={`h-6 w-6 ${getStatusColor(systemStatus.overall)}`} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">System Status</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{systemStatus.overall}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-lg font-semibold text-gray-900">{systemStatus.uptime}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-purple-100">
              <Monitor className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Version</p>
              <p className="text-lg font-semibold text-gray-900">{systemStatus.version}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-lg font-semibold text-gray-900">1,247</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <div className="flex space-x-8 px-6">
            {(['overview', 'health', 'logs', 'maintenance'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* System Metrics */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {systemMetrics.map((metric) => (
                    <div key={metric.name} className={`p-4 rounded-lg ${metric.bgColor}`}>
                      <div className="flex items-center">
                        <metric.icon className={`h-6 w-6 ${metric.color} mr-2`} />
                        <div>
                          <p className={`text-sm ${metric.color}`}>{metric.name}</p>
                          <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Services Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <div key={service.name} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <service.icon className="h-5 w-5 text-gray-600 mr-2" />
                          <div>
                            <p className="font-medium text-gray-900">{service.name}</p>
                            <p className="text-sm text-gray-500">Uptime: {service.uptime}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBg(service.status)} ${getStatusColor(service.status)}`}>
                          {service.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">System Health Monitoring</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Performance Metrics</h4>
                  {systemMetrics.map((metric) => (
                    <div key={metric.name} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <metric.icon className="h-5 w-5 text-gray-600 mr-3" />
                          <span className="text-sm font-medium text-gray-900">{metric.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{metric.value}</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusBg(metric.status)} ${getStatusColor(metric.status)}`}>
                            {metric.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Health Checks</h4>
                  <div className="space-y-3">
                    {[
                      { check: 'Database Connection', status: 'passing', lastRun: '2 minutes ago' },
                      { check: 'API Endpoints', status: 'passing', lastRun: '5 minutes ago' },
                      { check: 'External Services', status: 'warning', lastRun: '1 minute ago' },
                      { check: 'Backup Systems', status: 'passing', lastRun: '10 minutes ago' },
                      { check: 'SSL Certificates', status: 'passing', lastRun: '1 hour ago' }
                    ].map((check) => (
                      <div key={check.check} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{check.check}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">{check.lastRun}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBg(check.status)} ${getStatusColor(check.status)}`}>
                              {check.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">System Logs</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-1 inline" />
                    Export
                  </button>
                  <select className="text-sm border border-gray-300 rounded-lg px-3 py-1">
                    <option>All Levels</option>
                    <option>Info</option>
                    <option>Warning</option>
                    <option>Error</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm text-gray-900">{log.message}</p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>{log.timestamp.toLocaleString()}</span>
                            <span>Service: {log.service}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Maintenance Tools</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Database Operations</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center">
                        <Database className="h-5 w-5 text-gray-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Create Backup</p>
                          <p className="text-sm text-gray-500">Generate database backup</p>
                        </div>
                      </div>
                    </button>
                    <button className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center">
                        <Upload className="h-5 w-5 text-gray-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Restore Backup</p>
                          <p className="text-sm text-gray-500">Restore from backup file</p>
                        </div>
                      </div>
                    </button>
                    <button className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center">
                        <Settings className="h-5 w-5 text-gray-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Run Maintenance</p>
                          <p className="text-sm text-gray-500">Optimize database tables</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">System Operations</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center">
                        <RefreshCw className="h-5 w-5 text-gray-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Clear Cache</p>
                          <p className="text-sm text-gray-500">Clear system and application cache</p>
                        </div>
                      </div>
                    </button>
                    <button className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Generate Report</p>
                          <p className="text-sm text-gray-500">Create system health report</p>
                        </div>
                      </div>
                    </button>
                    <button className="w-full text-left px-4 py-3 bg-white border border-red-300 rounded-lg hover:bg-red-50 text-red-700">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                        <div>
                          <p className="font-medium text-red-900">Restart Services</p>
                          <p className="text-sm text-red-600">Restart all system services</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Maintenance Mode</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Some operations may require putting the system in maintenance mode. Users will see a maintenance page during this time.
                    </p>
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