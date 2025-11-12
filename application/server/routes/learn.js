import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

/**
 * GET /api/learn?skill=javascript
 * Returns dynamically generated learning links for a given skill
 */
router.get("/", async (req, res) => {
  const skill = req.query.skill;
  if (!skill) {
    return res.status(400).json({ error: "Missing skill parameter" });
  }

  try {
    const query = `${skill} programming tutorial site:w3schools.com OR site:coursera.org OR site:freecodecamp.org OR site:udemy.com OR site:developer.mozilla.org`;
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
      query
    )}&key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) {
      return res.json({ skill, results: [] });
    }

    const links = data.items.slice(0, 5).map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    }));

    res.json({ skill, results: links });
  } catch (err) {
    console.error("❌ Error fetching learning links:", err);
    res.status(500).json({ error: "Failed to fetch learning resources" });
  }
});

export default router;
