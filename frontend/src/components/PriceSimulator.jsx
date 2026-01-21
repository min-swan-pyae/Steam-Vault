import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../utils/helpers';

const PriceSimulator = () => {
  const { user, isAuthenticated } = useAuth();
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = getApiBaseUrl();

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

  const updatePrice = async (itemId, newPrice) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/dev/update-watchlist-price`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, newPrice: parseFloat(newPrice) })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Price updated to $${newPrice}`);
        loadWatchlistItems(); // Refresh list
      } else {
        alert(`❌ ${result.error || 'Failed to update price'}`);
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
      <h3 className="text-lg font-semibold text-white mb-4">💰 Price Alert Simulator</h3>
      <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <h4 className="text-blue-300 font-medium text-sm mb-2">ℹ️ How to Test Price Alerts</h4>
        <ol className="text-gray-300 text-xs space-y-1 list-decimal list-inside">
          <li>Add items to your watchlist from the <strong>Marketplace</strong> page</li>
          <li>Items will appear below with their current and target prices</li>
          <li>Use <strong>"Update Price"</strong> to manually set a new price and update the database</li>
          <li>Use <strong>"Trigger Alert"</strong> to instantly simulate a price drop notification</li>
          <li>In production, price checks run every 3 hours automatically</li>
        </ol>
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
          <div className="text-gray-400 text-sm text-center py-8 border border-gray-600 rounded">
            <p className="mb-2">No watchlist items found.</p>
            <p className="text-xs">Add items from the <a href="/marketplace" className="text-blue-400 hover:text-blue-300">Marketplace</a> page to start testing!</p>
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
                        <span className="text-yellow-400 ml-2">⚠️ Current Price is below the Target Price</span>
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
                        updatePrice(item.id, newPrice);
                        input.value = '';
                      } else {
                        alert('Please enter a valid price');
                      }
                    }}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors whitespace-nowrap"
                    title="Update the currentPrice in database"
                  >
                    💰 Update Price
                  </button>
                  <button
                    onClick={() => simulatePriceDrop(item.id, item.targetPrice - 0.01)}
                    disabled={loading}
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors whitespace-nowrap"
                    title="Trigger price alert notification immediately"
                  >
                    🔔 Trigger Alert
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