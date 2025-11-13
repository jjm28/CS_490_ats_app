// services/job-scraper.service.js
// NOTE: This requires installing Puppeteer: npm install puppeteer
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import TurndownService from "turndown";

// --- HELPER FUNCTIONS ---

// Helper function to safely extract a field from the Schema.org structure
function safeSchemaExtract(data, path) {
  let current = data;
  for (const key of path) {
    if (!current || typeof current !== "object") return "";
    current = current[key];
  }
  return typeof current === "string" ? current.trim() : current || "";
}

/**
 * Helper to safely extract and trim text from a Cheerio element.
 * Fixes: $(...).first(...).trim is not a function
 */
const safeText = ($, selector) => {
  const element = $(selector).first();
  // Only call .text() and .trim() if the element exists and has content
  return element.length ? element.text().trim() : "";
};

function detectJobBoard(url) {
  const urlLower = url.toLowerCase();

  if (urlLower.includes("linkedin.com/jobs")) return "linkedin";
  if (urlLower.includes("indeed.com")) return "indeed";
  if (urlLower.includes("glassdoor.com")) return "glassdoor";

  return "unknown";
}

function extractSchemaData(html, url) {
  const $ = cheerio.load(html);
  let jobData = null;

  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const jsonText = $(el).text();
      const json = JSON.parse(jsonText);

      const findJobPosting = (item) => {
        if (item && item["@type"] === "JobPosting") return item;
        if (
          item &&
          item.mainEntity &&
          item.mainEntity["@type"] === "JobPosting"
        )
          return item.mainEntity;
        return null;
      };

      jobData = findJobPosting(json);

      if (!jobData && Array.isArray(json)) {
        jobData = json.find(findJobPosting);
      }

      if (jobData) {
        return false;
      }
    } catch (e) {
      // Silently ignore malformed JSON
    }
  });

  if (!jobData) {
    return null;
  }

  return {
    jobTitle: safeSchemaExtract(jobData, ["title"]),
    company:
      safeSchemaExtract(jobData, ["hiringOrganization", "name"]) ||
      safeSchemaExtract(jobData, ["employerName"]),
    location:
      safeSchemaExtract(jobData, [
        "jobLocation",
        "address",
        "addressLocality",
      ]) ||
      safeSchemaExtract(jobData, ["jobLocation", "address", "addressRegion"]) ||
      safeSchemaExtract(jobData, ["jobLocation", "address", "addressCountry"]),
    description: safeSchemaExtract(jobData, ["description"]),
    jobPostingUrl: url,
  };
}

// --- CSS FALLBACK FUNCTIONS USING safeText HELPER ---
// Add this import at the top of your file (or in a new section):
/**
 * Cleans HTML content using Turndown to convert it to Markdown,
 * which automatically handles spacing, lists, and paragraphs.
 * @param {string} htmlString - The raw HTML description.
 * @returns {string} Cleaned plaintext description.
 */
function cleanJobDescription(htmlString) {
  if (!htmlString) return "";

  // Initialize Turndown Service
  const turndownService = new TurndownService({
    headingStyle: "atx", // Use # Heading
    codeBlockStyle: "fenced", // Use ``` for code blocks
  });

  // 1. Convert HTML to Markdown
  let markdownText = turndownService.turndown(htmlString);

  // 2. Normalize and Final Cleanup (specific to job board artifacts)

  // Remove any remaining HTML entities
  markdownText = markdownText.replace(/&nbsp;/gi, " ");

  // Collapse excessive newlines into two (paragraph break)
  markdownText = markdownText.replace(/(\n[ \t]*){3,}/g, "\n\n");

  // Remove residual bolding markers from Turndown if you only want plaintext
  // If you want Markdown formatting (bold/lists), skip these lines:
  markdownText = markdownText.replace(/\*\*/g, "");
  markdownText = markdownText.replace(/__/g, "");

  // Remove trailing whitespace
  markdownText = markdownText.trim();

  return markdownText;
}

// NOTE: You would keep your existing `extractIndeedData`, `extractLinkedInData`, etc.,
// but ensure they use the raw HTML (`.html()`) and pipe it through this new function.

function extractLinkedInData(html, url) {
  const $ = cheerio.load(html);

  // ... (existing extraction for title, company, location) ...
  let jobTitle =
    safeText($, ".top-card-layout__title") ||
    safeText($, "h1.topcard__title") ||
    safeText($, 'h1[class*="job-title"]') ||
    safeText($, "h1");
  let company =
    safeText($, ".topcard__org-name-link") ||
    safeText($, ".top-card-layout__entity-info a") ||
    safeText(
      $,
      'a[data-tracking-control-name="public_jobs_topcard-org-name"]'
    ) ||
    safeText($, "a.topcard__org-name-link");
  let location =
    safeText($, ".topcard__flavor--bullet") ||
    safeText($, ".top-card-layout__entity-info .topcard__flavor--metadata") ||
    safeText($, "span.topcard__flavor--bullet");

  // Get raw HTML and clean it
  let rawDescriptionHtml =
    $(".show-more-less-html__markup").first().html() ||
    $(".description__text").first().html() ||
    $('div[class*="description"]').first().html();
  let description = cleanJobDescription(rawDescriptionHtml);

  if (description.length > 2000) {
    description = description.substring(0, 1997) + "...";
  }
  return {
    jobTitle: jobTitle || "",
    company: company || "",
    location: location || "",
    description: description || "",
    jobPostingUrl: url,
  };
}

// --- FULL extractIndeedData function using the robust cleaner ---

function extractIndeedData(html, url) {
  const $ = cheerio.load(html);

  // Use safeText for extraction (as fixed previously)
  let jobTitle =
    safeText($, "h1.jobsearch-JobInfoHeader-title") ||
    safeText($, 'h1[class*="jobTitle"]') ||
    safeText($, "h1");
  let company =
    safeText($, 'div[data-company-name="true"]') ||
    safeText($, 'a[data-tn-element="companyName"]') ||
    safeText($, 'span[class*="companyName"]');
  let location =
    safeText($, 'div[data-testid="inlineHeader-companyLocation"]') ||
    safeText($, 'div[class*="companyLocation"]') ||
    safeText($, 'span[class*="location"]');

  // Get the RAW HTML of the description container
  let rawDescriptionHtml =
    $("#jobDescriptionText").first().html() ||
    $('div[id*="jobDescription"]').first().html() ||
    $('div[class*="jobDescription"]').first().html();

  // 1. Clean the RAW HTML into readable plaintext
  let description = cleanJobDescription(rawDescriptionHtml);

  // 2. Clean up description (limit length)
  if (description.length > 2000) {
    description = description.substring(0, 1997) + "...";
  }

  return {
    jobTitle: jobTitle || "",
    company: company || "",
    location: location || "",
    description: description || "", // Use the cleaned description
    jobPostingUrl: url,
  };
}

function extractGlassdoorData(html, url) {
  const $ = cheerio.load(html);

  // ... (existing extraction for title, company, location) ...
  let jobTitle =
    safeText($, 'h1[data-test="job-title"]') ||
    safeText($, 'div[class*="JobDetails_jobTitle"]') ||
    safeText($, "h1");
  let company =
    safeText($, 'div[data-test="employer-name"]') ||
    safeText($, 'span[class*="EmployerProfile_employerName"]') ||
    safeText($, 'div[class*="companyName"]');
  let location =
    safeText($, 'div[data-test="location"]') ||
    safeText($, 'span[class*="JobDetails_location"]') ||
    safeText($, 'div[class*="location"]');

  // Get raw HTML and clean it
  let rawDescriptionHtml =
    $('div[class*="JobDetails_jobDescription"]').first().html() ||
    $('div[class*="desc"]').first().html() ||
    $('section[class*="description"]').first().html();
  let description = cleanJobDescription(rawDescriptionHtml);

  if (description.length > 2000) {
    description = description.substring(0, 1997) + "...";
  }
  return {
    jobTitle: jobTitle || "",
    company: company || "",
    location: location || "",
    description: description || "",
    jobPostingUrl: url,
  };
}

function extractGenericData(html, url) {
  const $ = cheerio.load(html);

  // ... (existing extraction for title, company, location) ...
  let jobTitle =
    safeText($, "h1") ||
    safeText($, '[class*="job-title"]') ||
    safeText($, '[class*="title"]') ||
    safeText($, "title");
  let company =
    safeText($, '[class*="company"]') || safeText($, '[class*="employer"]');
  let location = safeText($, '[class*="location"]');

  // Get raw HTML and clean it
  let rawDescriptionHtml =
    $('[class*="description"]').first().html() ||
    $("article").first().html() ||
    $("main").first().html();
  let description = cleanJobDescription(rawDescriptionHtml);

  if (description.length > 2000) {
    description = description.substring(0, 1997) + "...";
  }
  return {
    jobTitle: jobTitle || "",
    company: company || "",
    location: location || "",
    description: description || "",
    jobPostingUrl: url,
  };
}

/**
 * Main function to scrape job data from a URL
 * * @param {string} url - Job posting URL
 * @returns {Promise<Object>} Extracted job data with import status
 */
export async function scrapeJobFromUrl(url) {
  let browser = null;

  try {
    // --- 1. STRICT Input Validation ---
    if (!url || typeof url !== "string") {
      return {
        success: false,
        status: "failed",
        error: "Invalid URL provided (must be a non-empty string)",
        data: null,
      };
    }
    let fullUrl = url.trim(); // Trim whitespace from input
    if (fullUrl.length === 0) {
      return {
        success: false,
        status: "failed",
        error: "Invalid URL provided (must be a non-empty string)",
        data: null,
      };
    }

    // --- 2. Protocol Check and Correction ---
    // If the URL is missing a protocol, assume https:// for the scraper,
    // but the strictness requirement suggests rejecting things that don't look like URLs.
    // For maximum compatibility, we'll keep the correction logic but ensure it catches errors.
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      fullUrl = "https://" + fullUrl;
    }
    // --- 3. URL Object Verification (The Strictest Check) ---
    // Use the built-in URL object to verify the URL structure.
    try {
      new URL(fullUrl);
    } catch {
      return {
        success: false,
        status: "failed",
        error: "Invalid URL format (URL structure is malformed)",
        data: null,
      };
    }
    const jobBoard = detectJobBoard(fullUrl);

    // --- URL Cleaning to Remove Tracking Params (Retained) ---
    try {
      const parsedUrl = new URL(fullUrl);

      if (jobBoard === "indeed") {
        const jk = parsedUrl.searchParams.get("jk");
        if (jk) {
          fullUrl = `${parsedUrl.origin}${parsedUrl.pathname}?jk=${jk}`;
        }
      } else if (jobBoard === "glassdoor" || jobBoard === "linkedin") {
        fullUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
      }
    } catch (e) {
      // Fallback to original URL
    }

    // --- HEADLESS BROWSER FETCH (PUPPETEER) ---
    browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    }); 
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
    });

    try {
        // We MUST succeed on the navigation. Networkidle2 helps ensure content is loaded.
        await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 45000 }); 
    } catch(e) {
         // --- CRITICAL FIX: Treat navigation error/timeout as a hard failure ---
         console.error(`Puppeteer failed to navigate to the URL: ${e.message}`);
         
         await browser.close();
         browser = null;

         // Check if the error is related to timeout/unreachable site
         const errorMessage = e.message.toLowerCase();
         let failureReason = "The site could not be reached (DNS error, invalid URL, or network failure).";

         if (errorMessage.includes("timeout")) {
             failureReason = "Navigation timed out. The site may be slow or non-responsive.";
         } else if (errorMessage.includes("net::err")) {
             failureReason = "Network error: The URL is likely invalid or unreachable.";
         }
         
         return { 
             success: false, 
             status: 'failed', 
             error: failureReason,
             data: null,
             jobBoard
         };
    }

    const html = await page.content();
    
    // --- CONTENT SIZE CHECK (This is now a secondary check, but still useful) ---
    // If the HTML content is too small, the navigation succeeded but loaded junk (e.g., a simple redirect or minimal error page).
    if (html.length < 500) {
        await browser.close();
        browser = null;
        return { 
            success: false, 
            status: 'failed', 
            error: `Failed to load a substantial job posting. The page content is too minimal.`, 
            data: null,
            jobBoard
        };
    }

    await browser.close();
    browser = null;

    // --- NEW ANTI-BLOCK CHECK ---
    const $ = cheerio.load(html);
    const titleText = $("title").text().trim().toLowerCase();

    // Check for common signs of a block page (Glassdoor's anti-bot check page title)
    if (
      titleText.includes("protect glassdoor") ||
      titleText.includes("robot check")
    ) {
      return {
        success: false,
        status: "failed",
        error: `Anti-bot check detected. Content blocked by Glassdoor.`,
        data: null,
        jobBoard,
      };
    }
    // --- END ANTI-BLOCK CHECK ---

    // --- EXTRACTION LOGIC (Schema First, then CSS Fallback) ---
    let extractedData = extractSchemaData(html, fullUrl);

    if (!extractedData || !extractedData.jobTitle) {
      const cssData =
        jobBoard === "linkedin"
          ? extractLinkedInData(html, fullUrl)
          : jobBoard === "indeed"
          ? extractIndeedData(html, fullUrl)
          : jobBoard === "glassdoor"
          ? extractGlassdoorData(html, fullUrl)
          : extractGenericData(html, fullUrl);

      extractedData = extractedData
        ? { ...cssData, ...extractedData }
        : cssData;
    }

    extractedData = extractedData || {
      jobTitle: "",
      company: "",
      location: "",
      description: "",
      jobPostingUrl: fullUrl,
    };

    // --- Final Status Determination (Retained) ---
    const hasTitle = extractedData.jobTitle.length > 0;
    const hasCompany = extractedData.company.length > 0;
    const hasDescription = extractedData.description.length > 0;

    let status =
      hasTitle && hasCompany && hasDescription
        ? "success"
        : hasTitle || hasCompany
        ? "partial"
        : "failed";

    return {
      success: status !== "failed",
      status,
      data: extractedData,
      jobBoard,
      extractedFields: {
        jobTitle: hasTitle,
        company: hasCompany,
        location: extractedData.location.length > 0,
        description: hasDescription,
      },
    };
  } catch (error) {
    console.error("Error scraping job URL:", error);

    if (browser !== null) {
      try {
        await browser.close();
      } catch (e) {
        /* ignore close error */
      }
    }

    return {
      success: false,
      status: "failed",
      error: error.message || "Failed to scrape job posting",
      data: null,
    };
  }
}
