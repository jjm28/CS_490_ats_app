interface HistoryEntry {
  companyName: string;
  timestamp: string;
  preview: {
    description?: string;
    industry?: string;
    website?: string;
  };
}

export const searchHistory = {
  add(companyName: string, companyData: any) {
    const history = this.getAll();
    
    const newEntry: HistoryEntry = {
      companyName,
      timestamp: new Date().toISOString(),
      preview: {
        description: companyData.basicInfo?.description,
        industry: companyData.basicInfo?.industry,
        website: companyData.basicInfo?.website
      }
    };
    
    // Remove duplicates
    const filtered = history.filter(
      item => item.companyName.toLowerCase() !== companyName.toLowerCase()
    );
    
    // Add to front, keep last 20
    const updated = [newEntry, ...filtered].slice(0, 20);
    
    localStorage.setItem('companySearchHistory', JSON.stringify(updated));
  },
  
  getAll(): HistoryEntry[] {
    const stored = localStorage.getItem('companySearchHistory');
    return stored ? JSON.parse(stored) : [];
  },
  
  clear() {
    localStorage.removeItem('companySearchHistory');
  },
  
  remove(companyName: string) {
    const history = this.getAll();
    const filtered = history.filter(
      item => item.companyName.toLowerCase() !== companyName.toLowerCase()
    );
    localStorage.setItem('companySearchHistory', JSON.stringify(filtered));
  }
};