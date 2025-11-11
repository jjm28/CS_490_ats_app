import express from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// API Keys
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
        competitorInfo,
        financialHealth
        ] = await Promise.all([
        searchCompanyBasicInfo(companyName),
        searchCompanyNews(companyName),
        searchLeadership(companyName),
        searchSocialMedia(companyName),
        searchCompetitors(companyName),
        searchFinancialHealth(companyName)
    ]);

    // Compile results
    const companyData = {
        name: companyName,
        basicInfo,
        news: newsResults,
        leadership: leadershipInfo,
        socialMedia,
        competitors: competitorInfo,
        financialHealth,
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

// UPDATED: Use Gemini for basic company info
async function searchCompanyBasicInfo(companyName) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    // Improved prompt
    const prompt = `Research the company "${companyName}" using your general knowledge about well-known companies. Return ONLY valid JSON (no markdown, no preamble, no backticks) with this exact structure:

{
  "description": "1-2 sentence company overview",
  "website": "official company website URL (full URL with https://)",
  "size": "employee count with 'employees' (e.g., '50,000 employees'). Use your best estimate from general knowledge for large public companies. If unknown, return 'Not specified'",
  "industry": "primary industry (e.g., 'Financial Services', 'Technology', 'Healthcare'). Use your best knowledge. If unknown, return 'Not specified'",
  "headquarters": "city and state/country (e.g., 'Newark, New Jersey', 'Cupertino, California', 'London, United Kingdom'). Use your best knowledge. If unknown, return 'Not specified'",
  "mission": "company mission statement (1-2 sentences) if commonly known. If unknown, return 'Not specified'",
  "values": "2-4 core company values, comma-separated if commonly known. If unknown, return 'Not specified'",
  "culture": "brief company culture description (1-2 sentences) if commonly known. If unknown, return 'Not specified'"
}

Important:
- Use your general knowledge first. For well-known companies like Microsoft, Apple, Google, etc., you should know their headquarters, industry, and often their mission.
- Return ONLY the JSON object, nothing else.
- For website, include the full URL starting with https://
- Do NOT return "Not specified" for headquarters, industry, or size for major, well-known public companies unless you are absolutely certain the information is not part of general knowledge.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();

    console.log('Gemini Raw Response:', rawText); // Debug log

    // Clean and parse JSON
    const cleanText = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    console.log('Gemini Cleaned Text for Parsing:', cleanText); // Debug log

    const parsed = JSON.parse(cleanText);

    // Return in the format your existing code expects
    return {
      description: parsed.description || 'No information found',
      website: parsed.website || '',
      size: parsed.size || 'Not specified',
      industry: parsed.industry || 'Not specified',
      headquarters: parsed.headquarters || 'Not specified',
      mission: parsed.mission || 'Not specified',
      values: parsed.values || 'Not specified',
      culture: parsed.culture || 'Not specified',
      searchResults: [{
        title: `${companyName} - AI Research`,
        snippet: parsed.description || '',
        link: parsed.website || ''
      }]
    };

  } catch (error) {
    console.error('Gemini API error:', error.message);

    // Fallback to Google search if Gemini fails
    console.log(`Gemini failed for ${companyName}, falling back to Google...`);

    const query = `"${companyName}" company overview headquarters industry`;
    const sites = 'site:linkedin.com/company OR site:crunchbase.com OR site:wikipedia.org';
    const results = await googleSearch(`${query} (${sites})`, 3);

    if (results.length > 0) {
      const snippet = results[0].snippet || '';

      return {
        description: snippet,
        website: results[0].link || '',
        size: 'Not specified',
        industry: 'Not specified',
        headquarters: 'Not specified',
        mission: 'Not specified',
        values: 'Not specified',
        culture: 'Not specified',
        searchResults: results.slice(0, 3).map(r => ({
          title: r.title,
          snippet: r.snippet,
          link: r.link
        }))
      };
    }

    // No results found anywhere
    return {
      description: 'No public information found.',
      website: '',
      size: 'Not specified',
      industry: 'Not specified',
      headquarters: 'Not specified',
      mission: 'Not specified',
      values: 'Not specified',
      culture: 'Not specified',
      searchResults: []
    };
  }
}

function categorizeArticle(article) {
  const categories = {
  funding: ['funding', 'investment', 'raised', 'venture', 'series a', 'series b'],
  hiring: ['hiring', 'recruitment', 'job openings', 'expanding team'],
  layoffs: ['layoffs', 'job cuts', 'downsizing', 'restructuring'],
  financial: ['earnings', 'revenue', 'profit', 'loss', 'quarter', 'IPO', 'merger', 'acquisition'],
  leadership: ['CEO', 'executive', 'founder', 'leadership change'],
  strategy: ['expansion', 'new market', 'pivot', 'growth strategy']
};

  const text = `${article.title} ${article.description}`.toLowerCase();
  for (const [type, keywords] of Object.entries(categories)) {
    if (keywords.some(k => text.includes(k))) return type;
  }
  return 'general';
}

function scoreRelevance(article, companyName) {
  const text = `${article.title} ${article.description}`.toLowerCase();
  let score = 0;
  if (text.includes(companyName.toLowerCase())) score += 2;
  if (article.source.name) score += 1;
  if (article.publishedAt) {
    const daysOld = (Date.now() - new Date(article.publishedAt)) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - Math.floor(daysOld)); // newer = higher score
  }
  return score;
}

function extractSummary(article) {
  const sentences = article.description?.split('. ') || [];
  return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '...' : '');
}

function extractKeyPoints(article) {
  const points = [];
  const text = `${article.title} ${article.description}`.toLowerCase();
  if (text.includes('funding')) points.push('Funding event');
  if (text.includes('launch')) points.push('Product launch');
  if (text.includes('hiring')) points.push('Hiring activity');
  return points;
}

async function searchCompanyNews(companyName) {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  if (!NEWS_API_KEY) {
    console.error('Missing NEWS_API_KEY in environment');
    return [];
  }

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: `"${companyName}" AND (funding OR hiring OR layoffs OR revenue OR acquisition OR CEO OR leadership OR expansion OR job openings OR IPO OR merger OR restructuring OR earnings)`,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: 10,
        domains: 'techcrunch.com,bloomberg.com,forbes.com,finance.yahoo.com,businessinsider.com',
        apiKey: NEWS_API_KEY
    }

    });

    const articles = response.data.articles || [];

    const enriched = articles.map(article => ({
    title: article.title,
    snippet: article.description || '',
    link: article.url,
    source: article.source.name,
    publishedAt: article.publishedAt,
    category: categorizeArticle(article),
    relevanceScore: scoreRelevance(article, companyName),
    summary: extractSummary(article),
    keyPoints: extractKeyPoints(article)
    }));

    const allowedCategories = ['funding', 'hiring', 'leadership', 'financial', 'strategy'];

    const filtered = enriched.filter(article =>
    article.relevanceScore >= 3 &&
    allowedCategories.includes(article.category)
    );

    return filtered.map(article => ({
        title: article.title,
        snippet: article.description || '',
        link: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt,
        category: categorizeArticle(article),
        relevanceScore: scoreRelevance(article, companyName),
        summary: extractSummary(article),
        keyPoints: extractKeyPoints(article)
    }));

  } catch (error) {
    console.error('News API error:', error.response?.data || error.message);
    return [];
  }
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
  const query = [
    `site:linkedin.com/company "${companyName}"`,
    `site:twitter.com "${companyName}" OR site:x.com "${companyName}"`,
    `site:facebook.com "${companyName}"`,
    `site:instagram.com "${companyName}"`
  ].join(' OR ');

  const results = await googleSearch(query, 10);

  const socialMedia = {};

  results.forEach(item => {
    const url = item.link;
    if (!url) return;
    if (url.includes('linkedin.com/company')) socialMedia.linkedin = url;
    else if (url.includes('twitter.com') || url.includes('x.com')) socialMedia.twitter = url;
    else if (url.includes('facebook.com')) socialMedia.facebook = url;
    else if (url.includes('instagram.com')) socialMedia.instagram = url;
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

async function searchFinancialHealth(companyName) {
  return await googleSearch(`"${companyName}" earnings OR revenue OR investor relations OR quarterly results site:finance.yahoo.com OR site:investors.${companyName.toLowerCase().replace(/\s+/g, '')}.com`, 5);
}

export default router;