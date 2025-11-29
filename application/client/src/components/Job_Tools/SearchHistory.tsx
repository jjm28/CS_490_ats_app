import React, { useState, useEffect } from 'react';
import { searchHistory } from '../../utils/searchHistory';
import { Clock, X } from 'lucide-react';

interface SearchHistoryProps {
  onSelectCompany: (companyName: string) => void;
}

function SearchHistory({ onSelectCompany }: SearchHistoryProps) {
  const [history, setHistory] = useState(searchHistory.getAll());

  const handleDelete = (companyName: string) => {
    searchHistory.remove(companyName);
    setHistory(searchHistory.getAll());
  };

  const handleClear = () => {
    searchHistory.clear();
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <div className="history-empty">
        <Clock size={48} className="history-empty-icon" />
        <p>No search history yet</p>
        <p className="history-empty-subtitle">Your recent searches will appear here</p>
      </div>
    );
  }

  return (
    <div className="search-history">
      <div className="history-header">
        <h3 className="history-title">
          <Clock size={20} />
          Recent Searches
        </h3>
        <button onClick={handleClear} className="history-clear-btn">
          Clear All
        </button>
      </div>
      
      <div className="history-list">
        {history.map((item, index) => (
          <div 
            key={index}
            className="history-item"
            onClick={() => onSelectCompany(item.companyName)}
          >
            <div className="history-item-content">
              <h4 className="history-item-name">{item.companyName}</h4>
              {item.preview?.industry && (
                <p className="history-item-industry">{item.preview.industry}</p>
              )}
              {item.preview?.description && (
                <p className="history-item-description">
                  {item.preview.description.slice(0, 80)}...
                </p>
              )}
              <p className="history-item-date">
                {new Date(item.timestamp).toLocaleDateString()} at{' '}
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item.companyName);
              }}
              className="history-item-delete"
              aria-label="Remove from history"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchHistory;