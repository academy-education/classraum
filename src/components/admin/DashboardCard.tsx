'use client'

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function DashboardCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  className 
}: DashboardCardProps) {
  return (
    <div className={cn(
      "bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-150",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-2">{title}</h3>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <div className={cn(
                "flex items-center text-sm font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="ml-4">
          {icon}
        </div>
      </div>
      
      {trend && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                trend.isPositive ? "bg-green-500" : "bg-red-500"
              )}
              style={{ width: `${Math.min(Math.abs(trend.value), 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}