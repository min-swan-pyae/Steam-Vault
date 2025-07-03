import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function ErrorPage() {
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get('message') || 'An unknown error occurred';

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-red-900/30 p-6 border-b border-red-800">
          <h1 className="text-2xl font-bold text-center">Authentication Error</h1>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <p className="text-red-400 mb-4">{errorMessage}</p>
            <p className="text-gray-400">There was a problem with your authentication request. This might be due to an expired session, invalid credentials, or a server issue.</p>
          </div>
          <div className="flex justify-center space-x-4">
            <Link
              to="/"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors duration-200"
            >
              Return Home
            </Link>
            <button
              onClick={() => window.location.href = 'http://localhost:3000/auth/steam'}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 