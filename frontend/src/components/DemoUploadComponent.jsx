import React, { useState } from 'react';
import { firebaseDataService } from '../services/firebaseData';

const DemoUploadComponent = ({ steamId, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.dem')) {
      setError('Please upload a valid .dem file');
      return;
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      const response = await firebaseDataService.uploadDemoData(steamId, { file });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (response.message) {
        setSuccess(response.message);
      } else {
        setSuccess('Demo file uploaded and processed successfully!');
      }
      
      // Call the success callback to refresh data
      if (onUploadSuccess) {
        onUploadSuccess(response);
      }
      
    } catch (error) {
      setError(error.message || 'Failed to upload demo file');
      setUploadProgress(0);
    } finally {
      setUploading(false);
      
      // Clear messages after 5 seconds
      setTimeout(() => {
        setError(null);
        setSuccess(null);
        setUploadProgress(0);
      }, 5000);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-6 shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Upload CS2 Demo File</h3>
      
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-900/20' 
            : 'border-gray-600 hover:border-gray-500'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="space-y-4">
            <div className="text-blue-400">
              <svg className="w-12 h-12 mx-auto animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
              </svg>
            </div>
            <div className="text-white">
              <div className="mb-2">Processing demo file...</div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-400 mt-1">{Math.round(uploadProgress)}%</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-gray-400">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-white">
              <div className="mb-2">Drop your .dem file here</div>
              <div className="text-sm text-gray-400 mb-4">or click to browse</div>
              <input
                type="file"
                accept=".dem"
                onChange={handleFileSelect}
                className="hidden"
                id="demo-upload"
                disabled={uploading}
              />
              <label
                htmlFor="demo-upload"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
              >
                Choose File
              </label>
            </div>
            <div className="text-xs text-gray-500">
              Maximum file size: 100MB • Supported format: .dem
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-2">How to get your demo files:</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Open CS2 and go to Watch → Your Matches</li>
          <li>• Click on a match you want to analyze</li>
          <li>• Click "Download Demo" button</li>
          <li>• Upload the downloaded .dem file here</li>
        </ul>
      </div>
    </div>
  );
};

export default DemoUploadComponent;
