import React from 'react'
import { Link } from 'react-router-dom'

const NotAuthenticated = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 md:mb-4">Authentication Required</h2>
            <p className="text-red-400 text-sm sm:text-base">Please log in to view statistics.</p>
          </div>
          <Link 
            to="/" 
            className="text-blue-400 hover:text-blue-300 text-sm sm:text-base inline-block transition-colors duration-200"
          >
            Back to Home
          </Link>
        </div>
    </div>
  )
}

export default NotAuthenticated