import express from 'express';
import axios from 'axios';
import NodeCache from 'node-cache';
import { GoogleGenerativeAI } from '@google/generative-ai';
import InterviewPrep from '../models/interviewPrep.js';
import { logApiCall } from '../middleware/apiLogger.js'; // ← ADD THIS

const router = express.Router();

// API Keys
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const cache = new NodeCache({ 
  stdTTL: 86400,
  checkperiod: 3600 
});

function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req); 
    const { companyName } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
      return res.status(500).json({ 
        error: 'API keys not configured. Please add GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID to .env file' 
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `company:${companyName.toLowerCase()}:${today}`;
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Cache HIT for ${companyName}`);
      return res.json(cachedData);
    }

    console.log(`🔄 Cache MISS - Researching: ${companyName}`);

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

    const companyData = {
        name: companyName,
        basicInfo,
        news: Array.isArray(newsResults) ? newsResults : [],
        leadership: leadershipInfo,
        socialMedia,
        competitors: competitorInfo,
        financialHealth,
        lastUpdated: new Date().toISOString()
    };

    cache.set(cacheKey, companyData);
    console.log(`💾 Cached data for ${companyName}`);

    res.json(companyData);

  } catch (error) {
    console.error('Error researching company:', error.message);
    res.status(500).json({ 
      error: 'Failed to research company',
      details: error.message 
    });
  }
});

// Helper: Google Custom Search - WITH LOGGING
async function googleSearch(query, numResults = 10) {
  const startTime = Date.now(); // ← ADD THIS
  
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_API_KEY,
        cx: SEARCH_ENGINE_ID,
        q: query,
        num: numResults
      }
    });
    
    // ← ADD THIS - Log successful search
    await logApiCall('google-search', '/customsearch/v1', response.status, Date.now() - startTime);
    
    return response.data.items || [];
  } catch (error) {
    // ← ADD THIS - Log failed search
    await logApiCall('google-search', '/customsearch/v1', error.response?.status || 500, Date.now() - startTime, error.message);
    
    console.error(`Search error for "${query}":`, error.response?.data?.error?.message || error.message);
    return [];
  }
}

// UPDATED: Use Gemini for basic company info - WITH LOGGING
async function searchCompanyBasicInfo(companyName) {
  const startTime = Date.now(); // ← ADD THIS
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Research the company "${companyName}" using your general knowledge about well-known companies. Return ONLY valid JSON (no markdown, no preamble, no backticks) with this exact structure:

{
  "description": "1-2 sentence company overview",
  "website": "official company website URL (full URL with https://)",
  "size": "employee count with 'employees' (e.g., '50,000 employees'). Use your best estimate from general knowledge for large public companies. If unknown, return 'Not specified'",
  "industry": "primary industry (e.g., 'Financial Services', 'Technology', 'Healthcare'). Use your best knowledge. If unknown, return 'Not specified'",
  "headquarters": "city and state/country (e.g., 'Newark, New Jersey', 'Cupertino, California', 'London, United Kingdom'). Use your best knowledge. If unknown, return 'Not specified'",
  "mission": "company mission statement (1-2 sentences) if commonly known. If unknown, return 'Not specified'",
  "values": "2-4 core company values, comma-separated if commonly known. If unknown, return 'Not specified'",
  "culture": "brief company culture description (1-2 sentences) if commonly known. If unknown, return 'Not specified'",
  "logoUrl": "direct URL to the company's logo image if known. If unknown, use an empty string.",
  "contactEmail": "general contact or careers email if commonly known. If unknown, use an empty string.",
  "contactPhone": "main phone number if commonly known. If unknown, use an empty string.",
  "contactAddress": "full mailing address or HQ address if commonly known. If unknown, return 'Not specified'",
  "glassdoorRating": "Glassdoor rating between 0 and 5 as a number if commonly known. If unknown, use null.",
  "glassdoorReviewsCount": "approximate number of Glassdoor reviews as an integer if commonly known. If unknown, use null.",
  "glassdoorUrl": "URL to the company's Glassdoor profile if commonly known. If unknown, use an empty string."
}`;

    const result = await model.generateContent(prompt);
    
    // ← ADD THIS - Log successful Gemini call
    await logApiCall('gemini', '/generateContent', 200, Date.now() - startTime);
    
    const response = await result.response;
    const rawText = response.text();

    console.log('Gemini Raw Response:', rawText);

    const cleanText = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    console.log('Gemini Cleaned Text for Parsing:', cleanText);

    const parsed = JSON.parse(cleanText);

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
      }],
      logoUrl: parsed.logoUrl || null,
      contactEmail: parsed.contactEmail || "",
      contactPhone: parsed.contactPhone || "",
      contactAddress: parsed.contactAddress || "Not specified",
      glassdoorRating:
          typeof parsed.glassdoorRating === "number"
            ? parsed.glassdoorRating
            : undefined,
      glassdoorReviewsCount:
          typeof parsed.glassdoorReviewsCount === "number"
            ? parsed.glassdoorReviewsCount
            : undefined,
      glassdoorUrl: parsed.glassdoorUrl || "",
    };

  } catch (error) {
    // ← ADD THIS - Log failed Gemini call
    await logApiCall('gemini', '/generateContent', 500, Date.now() - startTime, error.message);
    
    console.error('Gemini API error:', error.message);
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
        })),
        logoUrl: "",
        contactEmail: "",
        contactPhone: "",
        contactAddress: "Not specified",
        glassdoorRating: undefined,
        glassdoorReviewsCount: undefined,
        glassdoorUrl: "",
      };
    }

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
    financial: [
      'earnings', 'revenue', 'profit', 'loss', 'quarter', 'IPO', 'merger', 'acquisition', 
      'stock', 'shares', 'market', 'trading', 'valuation', 'dividend', 'balance sheet'
    ],
    strategy: [
      'expansion', 'new market', 'pivot', 'growth', 'partnership', 'launch', 'product',
      'technology', 'innovation', 'digital transformation', 'AI'
    ],
    leadership: [
      'CEO', 'executive', 'founder', 'leadership', 'board', 'director', 'management', 
      'appointment', 'resignation', 'hire'
    ],
    funding: [
      'funding', 'investment', 'raised', 'venture', 'capital', 'round', 'investor', 
      'backing', 'seed'
    ],
    hiring: [
      'hiring', 'recruitment', 'job openings', 'expanding team', 'talent', 'workforce'
    ],
    layoffs: [
      'layoffs', 'job cuts', 'downsizing', 'restructuring', 'layoff'
    ]
  };

  const text = `${article.title} ${article.description}`.toLowerCase();

  for (const [type, keywords] of Object.entries(categories)) {
    if (keywords.some(k => text.includes(k))) return type;
  }
  return 'general';
}

function scoreRelevance(article, companyName) {
  const title = (article.title || '').toLowerCase();
  const description = (article.description || '').toLowerCase();
  const lowerCompany = companyName.toLowerCase();
  
  const cleanCompanyName = lowerCompany
    .replace(/,?\s*(inc\.?|llc|corporation|corp\.?|ltd\.?|limited)/gi, '')
    .trim();

  let score = 0;

  if (title.includes(lowerCompany) || title.includes(cleanCompanyName)) {
    score += 5;
  }

  if (description.includes(lowerCompany) || description.includes(cleanCompanyName)) {
    score += 3;
  }

  const reputableSources = ['bloomberg', 'reuters', 'forbes', 'wsj', 'financial times', 'cnbc'];
  const sourceName = (article.source?.name || '').toLowerCase();
  if (reputableSources.some(s => sourceName.includes(s))) {
    score += 2;
  }

  if (article.publishedAt) {
    const daysOld = (Date.now() - new Date(article.publishedAt)) / (1000 * 60 * 60 * 24);
    if (daysOld <= 7) score += 2;
    else if (daysOld <= 30) score += 1;
  }

  return score;
}

function extractSummary(article) {
  const description = article.description || '';
  const sentences = description.split('. ');
  return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '');
}

function extractKeyPoints(article) {
  const points = [];
  const text = `${article.title} ${article.description}`.toLowerCase();
  
  if (text.includes('funding') || text.includes('raised') || text.includes('investment')) {
    points.push('Funding event');
  }
  if (text.includes('launch') || text.includes('release') || text.includes('unveil')) {
    points.push('Product launch');
  }
  if (text.includes('hiring') || text.includes('job') || text.includes('recruitment')) {
    points.push('Hiring activity');
  }
  if (text.includes('layoff') || text.includes('job cuts') || text.includes('downsizing')) {
    points.push('Job cuts');
  }
  if (text.includes('acquisition') || text.includes('merger') || text.includes('bought')) {
    points.push('M&A activity');
  }
  if (text.includes('CEO') || text.includes('executive') || text.includes('leadership')) {
    points.push('Leadership news');
  }
  
  return points;
}

// News API - WITH LOGGING
async function searchCompanyNews(companyName) {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  if (!NEWS_API_KEY) {
    console.error('Missing NEWS_API_KEY in environment');
    return [];
  }

  const startTime = Date.now(); // ← ADD THIS

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: companyName,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: 50,
        apiKey: NEWS_API_KEY
      }
    });

    // ← ADD THIS - Log successful NewsAPI call
    await logApiCall('newsapi', '/v2/everything', response.status, Date.now() - startTime);

    console.log(`News API returned ${response.data.articles?.length || 0} articles for ${companyName}`);

    if (!response.data || !response.data.articles) {
      console.error('NewsAPI response missing articles:', response.data);
      return [];
    }

    const articles = Array.isArray(response.data.articles) ? response.data.articles : [];

    const enriched = articles.map(article => {
      const category = categorizeArticle(article);
      const relevanceScore = scoreRelevance(article, companyName);
      
      return {
        title: article.title || 'Untitled Article',
        snippet: article.description || article.content || '',
        link: article.url,
        source: article.source?.name || 'Unknown Source',
        publishedAt: article.publishedAt,
        category,
        relevanceScore,
        summary: extractSummary(article),
        keyPoints: extractKeyPoints(article)
      };
    });

    const filtered = enriched
      .filter(article => article.relevanceScore >= 3)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 15);

    console.log(`Filtered to ${filtered.length} relevant articles (score >= 3)`);

    return filtered;

  } catch (error) {
    // ← ADD THIS - Log failed NewsAPI call
    await logApiCall('newsapi', '/v2/everything', error.response?.status || 500, Date.now() - startTime, error.message);
    
    console.error('News API error:', error.response?.data || error.message);
    return [];
  }
}

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

async function searchSocialMedia(companyName) {
  const socialMedia = {};

  const platforms = [
    { name: 'linkedin', query: `${companyName} site:linkedin.com/company` },
    { name: 'twitter', query: `${companyName} site:twitter.com OR site:x.com` },
    { name: 'facebook', query: `${companyName} site:facebook.com` },
    { name: 'instagram', query: `${companyName} site:instagram.com` }
  ];

  const socialResults = await Promise.all(
    platforms.map(async (platform) => {
      const results = await googleSearch(platform.query, 1);
      return { name: platform.name, url: results[0]?.link };
    })
  );

  socialResults.forEach(result => {
    if (result.url) {
      socialMedia[result.name] = result.url;
    }
  });

  return socialMedia;
}

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

router.post("/save-research", async (req, res) => {
  try {
    console.log('=== SAVE RESEARCH DEBUG ===');
    console.log('req.user:', getUserId(req));
    console.log('req.body:', req.body);
    console.log('userId:', req.user?.id);
    console.log('jobId:', req.body.jobId);
    console.log('companyInfo:', req.body.companyInfo);
    console.log('========================');

    const userId = getUserId(req);
    const { jobId, companyInfo } = req.body;

    if (!userId || !jobId || !companyInfo) {
      console.log('FAILED CHECKS:', { 
        hasUserId: !!userId, 
        hasJobId: !!jobId, 
        hasCompanyInfo: !!companyInfo 
      });
      return res.status(400).json({ error: "Missing required fields" });
    }

    const researchData = {
      userId,
      jobId,
      companyName: companyInfo.name,
      basicInfo: companyInfo.basicInfo,
      leadership: {
        searchResults: companyInfo.leadership?.searchResults || []
      },
      financialHealth: companyInfo.financialHealth,
      socialMedia: companyInfo.socialMedia,
      competitors: companyInfo.competitors,
      news: companyInfo.news,
      lastResearched: new Date()
    };

    const research = await InterviewPrep.findOneAndUpdate(
      { userId, jobId },
      researchData,
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ message: research.companyName ? "Research updated" : "Research saved", data: research });
  } catch (err) {
    console.error("Save research error:", err);
    res.status(500).json({ error: "Failed to save research" });
  }
});

router.get("/saved-research/:jobId", async (req, res) => {
  try {
    const userId = getUserId(req);  
    const { jobId } = req.params;

    const research = await InterviewPrep.findOne({ userId, jobId });

    if (!research) {
      return res.status(404).json({ error: "No saved research found" });
    }

    const companyInfo = {
      name: research.companyName,
      basicInfo: research.basicInfo,
      news: research.news,
      leadership: research.leadership, 
      socialMedia: research.socialMedia,
      competitors: research.competitors,
      financialHealth: research.financialHealth,
      lastUpdated: research.lastResearched
    };

    res.json(companyInfo);
  } catch (err) {
    console.error("Get research error:", err);
    res.status(500).json({ error: "Failed to load research" });
  }
});

export default router;