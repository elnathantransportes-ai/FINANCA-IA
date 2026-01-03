import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}></div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
    <div className="grid grid-cols-2 gap-4">
      <div className="h-24 bg-gray-200 rounded-2xl"></div>
      <div className="h-24 bg-gray-200 rounded-2xl"></div>
    </div>
    <div className="space-y-3">
        <div className="h-16 bg-gray-200 rounded-xl w-full"></div>
        <div className="h-16 bg-gray-200 rounded-xl w-full"></div>
    </div>
  </div>
);