// server/routes/companyResearch.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// FREE Google Custom Search API
// Get your free keys at: https://developers.google.com/custom-search/v1/introduction
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

router.post('/api/company/research', async (req, res) => {
  try {
    const { companyName } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
      return res.status(500).json({ 
        error: 'API keys not configured. Please add GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID to .env file' 
      });
    }

    console.log(`Researching: ${companyName}`);

    // Run all searches in parallel for speed
    const [
      basicInfo,
      newsResults,
      leadershipInfo,
      socialMedia,
      competitorInfo
    ] = await Promise.all([
      searchCompanyBasicInfo(companyName),
      searchCompanyNews(companyName),
      searchLeadership(companyName),
      searchSocialMedia(companyName),
      searchCompetitors(companyName)
    ]);

    // Compile results
    const companyData = {
      name: companyName,
      basicInfo,
      news: newsResults,
      leadership: leadershipInfo,
      socialMedia,
      competitors: competitorInfo,
      lastUpdated: new Date().toISOString()
    };

    res.json(companyData);

  } catch (error) {
    console.error('Error researching company:', error.message);
    res.status(500).json({ 
      error: 'Failed to research company',
      details: error.message 
    });
  }
});

// Helper: Google Custom Search
async function googleSearch(query, numResults = 10) {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_API_KEY,
        cx: SEARCH_ENGINE_ID,
        q: query,
        num: numResults
      }
    });

    return response.data.items || [];
  } catch (error) {
    console.error(`Search error for "${query}":`, error.response?.data?.error?.message || error.message);
    return [];
  }
}

// Search basic company info
async function searchCompanyBasicInfo(companyName) {
  const results = await googleSearch(`${companyName} company about headquarters industry`, 5);
  
  if (results.length === 0) {
    return {
      description: 'No information available',
      website: '',
      searchResults: []
    };
  }

  return {
    description: results[0]?.snippet || 'No description available',
    website: results[0]?.link || '',
    searchResults: results.slice(0, 3).map(r => ({
      title: r.title,
      snippet: r.snippet,
      link: r.link
    }))
  };
}

// Search company news
async function searchCompanyNews(companyName) {
  const results = await googleSearch(`${companyName} news press release announcement`, 8);
  
  // Filter for recent news
  return results
    .filter(r => r.snippet && r.title)
    .slice(0, 5)
    .map(article => ({
      title: article.title,
      snippet: article.snippet,
      link: article.link,
      source: new URL(article.link).hostname.replace('www.', '')
    }));
}

// Search leadership team
async function searchLeadership(companyName) {
  const results = await googleSearch(`${companyName} CEO founder executives leadership team`, 5);
  
  return {
    searchResults: results.slice(0, 3).map(r => ({
      title: r.title,
      snippet: r.snippet,
      link: r.link
    }))
  };
}

// Search social media
async function searchSocialMedia(companyName) {
  const socialMedia = {};
  
  // Search for each platform
  const platforms = [
    { name: 'linkedin', query: `${companyName} site:linkedin.com/company` },
    { name: 'twitter', query: `${companyName} site:twitter.com OR site:x.com` },
    { name: 'facebook', query: `${companyName} site:facebook.com` },
    { name: 'instagram', query: `${companyName} site:instagram.com` }
  ];

  // Run social searches in parallel
  const socialResults = await Promise.all(
    platforms.map(async (platform) => {
      const results = await googleSearch(platform.query, 1);
      return { name: platform.name, url: results[0]?.link };
    })
  );

  // Map results
  socialResults.forEach(result => {
    if (result.url) {
      socialMedia[result.name] = result.url;
    }
  });

  return socialMedia;
}

// Search competitors
async function searchCompetitors(companyName) {
  const results = await googleSearch(`${companyName} competitors alternatives similar companies`, 5);
  
  return results.slice(0, 3).map(r => ({
    title: r.title,
    snippet: r.snippet,
    link: r.link
  }));
}

export default router;