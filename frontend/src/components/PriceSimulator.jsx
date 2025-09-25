import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const PriceSimulator = () => {
  const { user, isAuthenticated } = useAuth();
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    hashName: '',
    targetPrice: '',
    appid: '730'
  });

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const loadWatchlistItems = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/dev/watchlist-items`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setWatchlistItems(result.items);
      }
    } catch (error) {
      console.error('Error loading watchlist items:', error);
    }
  };

  const simulatePriceDrop = async (itemId, newPrice) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/dev/simulate-price-drop`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, newPrice: parseFloat(newPrice) })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        loadWatchlistItems(); // Refresh list
      } else {
        alert(`❌ ${result.error || 'Failed to simulate price drop'}`);
      }
    } catch (error) {
      alert(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createMockItem = async () => {
    if (!newItemForm.hashName || !newItemForm.targetPrice) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/dev/create-mock-item`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItemForm)
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        setNewItemForm({ hashName: '', targetPrice: '', appid: '730' });
        loadWatchlistItems(); // Refresh list
      } else {
        alert(`❌ ${result.error || 'Failed to create mock item'}`);
      }
    } catch (error) {
      alert(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId) => {
    if (!confirm('Delete this watchlist item?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/dev/watchlist-item/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        loadWatchlistItems(); // Refresh list
      } else {
        alert(`❌ ${result.error || 'Failed to delete item'}`);
      }
    } catch (error) {
      alert(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadWatchlistItems();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">💰 Price Simulator</h3>
        <p className="text-gray-400">Please log in to simulate price changes.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">💰 Price Simulator</h3>
      <p className="text-gray-400 text-sm mb-6">
        Create mock watchlist items and simulate price drops to test notifications.
      </p>

      {/* Create New Mock Item */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h4 className="text-white font-medium mb-3">Create Mock Watchlist Item</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            type="text"
            placeholder="Item Name (e.g., AK-47 | Redline)"
            value={newItemForm.hashName}
            onChange={(e) => setNewItemForm(prev => ({ ...prev, hashName: e.target.value }))}
            className="px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Target Price ($)"
            value={newItemForm.targetPrice}
            onChange={(e) => setNewItemForm(prev => ({ ...prev, targetPrice: e.target.value }))}
            className="px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500"
          />
          <select
            value={newItemForm.appid}
            onChange={(e) => setNewItemForm(prev => ({ ...prev, appid: e.target.value }))}
            className="px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500"
          >
            <option value="730">CS2</option>
            <option value="570">Dota 2</option>
            <option value="440">TF2</option>
          </select>
        </div>
        <button
          onClick={createMockItem}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
        >
          ➕ Create Mock Item
        </button>
      </div>

      {/* Existing Items */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-white font-medium">Your Watchlist Items</h4>
          <button
            onClick={loadWatchlistItems}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        {watchlistItems.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-4 border border-gray-600 rounded">
            No watchlist items. Create one above to start testing!
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {watchlistItems.map((item) => (
              <div key={item.id} className="bg-gray-700 p-4 rounded border border-gray-600">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h5 className="text-white font-medium text-sm">{item.hashName}</h5>
                    <p className="text-gray-400 text-xs">
                      App ID: {item.appid} | Target: ${item.targetPrice.toFixed(2)}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Current: ${item.currentPrice?.toFixed(2) || 'N/A'}
                      {item.currentPrice <= item.targetPrice && 
                        <span className="text-green-400 ml-2">🎯 Alert Triggered!</span>
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                  >
                    🗑️
                  </button>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="New price"
                    id={`price-${item.id}`}
                    className="flex-1 px-2 py-1 bg-gray-600 text-white rounded border border-gray-500 text-sm"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`price-${item.id}`);
                      const newPrice = parseFloat(input.value);
                      if (newPrice > 0) {
                        simulatePriceDrop(item.id, newPrice);
                        input.value = '';
                      }
                    }}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
                  >
                    💰 Update Price
                  </button>
                  <button
                    onClick={() => simulatePriceDrop(item.id, item.targetPrice - 0.01)}
                    disabled={loading}
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
                  >
                    📉 Trigger Alert
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceSimulator;