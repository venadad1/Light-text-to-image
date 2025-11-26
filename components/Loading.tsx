import React from 'react';

export const Loading: React.FC<{ message?: string }> = ({ message = "Dreaming..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-brand-900 rounded-full opacity-20"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-brand-100 animate-pulse font-medium">{message}</p>
    </div>
  );
};
