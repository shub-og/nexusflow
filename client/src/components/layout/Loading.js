import React from 'react';

export default function Loading({ fullscreen = false, text = 'Loading…' }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"/>
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16">
      {content}
    </div>
  );
}
