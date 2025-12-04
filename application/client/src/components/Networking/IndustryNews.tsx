import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Newspaper, Search, Share2, X } from "lucide-react";
import { getContacts } from "../../api/contact";
import type { Contact } from "../../api/contact";
import API_BASE from "../../utils/apiBase";

export default function IndustryNews() {
  const navigate = useNavigate();
  const [industry, setIndustry] = useState("");
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [searchContact, setSearchContact] = useState("");

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  }

  async function searchNews() {
    if (!industry.trim()) {
      alert("Please enter an industry");
      return;
    }

    setLoading(true);

    try {
      const token = JSON.parse(localStorage.getItem("authUser") || "{}").token;

      const res = await fetch(
        `${API_BASE}/api/networking/industry-news?industry=${encodeURIComponent(
          industry
        )}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch news");
      }

      const data = await res.json();
      setNews(data.articles || []);

      if (data.articles.length === 0) {
        alert("No news found for this industry. Try a different search term.");
      }
    } catch (err) {
      console.error("Failed to fetch news:", err);
      alert("Failed to fetch news. Please try again.");
      setNews([]);
    } finally {
      setLoading(false);
    }
  }

  function handleShareClick(article: any) {
    setSelectedArticle(article);
    setShowShareModal(true);
  }

  function handleSelectContact(contact: Contact) {
    // Create share template
    const shareTemplate = {
      subject: `Thought you might find this interesting`,
      message: `Hi ${contact.name.split(" ")[0]},

I came across this article and immediately thought of you${
        contact.industry ? ` given your work in ${contact.industry}` : ""
      }:

${selectedArticle.title}
${selectedArticle.url}

${selectedArticle.description || ""}

Hope you find it valuable! Let me know what you think.

Best regards`,
    };

    // Store in localStorage
    localStorage.setItem(
      "pendingShare",
      JSON.stringify({
        template: shareTemplate,
        article: selectedArticle,
      })
    );

    // Navigate to quick outreach for this contact
    navigate(`/networking/contacts/${contact._id}/outreach`);
  }

  const filteredContacts = contacts.filter((c) =>
    c.name?.toLowerCase().includes(searchContact.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate("/networking")}
        className="mb-8 flex items-center gap-2 px-4 py-2 text-sm font-medium
                   text-white bg-emerald-600 rounded-lg shadow hover:bg-emerald-700 transition"
      >
        ← Back to Dashboard
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Newspaper className="w-8 h-8 text-emerald-600" />
          Industry News Sharing
        </h1>
        <p className="text-gray-600 mt-2">
          Find relevant industry news to share with your network
        </p>
      </div>

      {/* Search */}
      {/* Search */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Search Industry News
        </h2>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && searchNews()}
            placeholder="Enter industry (e.g., Technology, Finance, Healthcare)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg 
                 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            onClick={searchNews}
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg 
                 hover:bg-emerald-700 transition flex items-center gap-2
                 disabled:opacity-50"
          >
            <Search className="w-5 h-5" />
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Quick Industry Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <p className="text-sm text-gray-600 w-full mb-2">Quick searches:</p>
          {[
            "Technology",
            "Finance",
            "Healthcare",
            "Education",
            "Retail",
            "Manufacturing",
            "Consulting",
            "Marketing",
            "Engineering",
            "Design",
          ].map((ind) => (
            <button
              key={ind}
              onClick={() => {
                setIndustry(ind);
                // Auto-search after a brief delay
                setTimeout(() => {
                  setIndustry(ind);
                  // Trigger search
                  const token = JSON.parse(
                    localStorage.getItem("authUser") || "{}"
                  ).token;

                  setLoading(true);
                  fetch(
                    `${API_BASE}/api/networking/industry-news?industry=${encodeURIComponent(
                      ind
                    )}`,
                    {
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                    }
                  )
                    .then((res) => res.json())
                    .then((data) => {
                      setNews(data.articles || []);
                      if (data.articles.length === 0) {
                        alert("No news found for this industry.");
                      }
                    })
                    .catch((err) => {
                      console.error("Failed to fetch news:", err);
                      alert("Failed to fetch news. Please try again.");
                      setNews([]);
                    })
                    .finally(() => setLoading(false));
                }, 100);
              }}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full 
                   hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              {ind}
            </button>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Share relevant industry news to add value
            to your network and stay top-of-mind with your contacts.
          </p>
        </div>
      </div>

      {/* News Results */}
      {news.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Latest {industry} News ({news.length} articles)
            </h2>
            <button
              onClick={() => {
                setNews([]);
                setIndustry("");
              }}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear Results
            </button>
          </div>

          {news.map((article, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-6 
                         hover:shadow-lg transition"
            >
              <div className="flex gap-4">
                {/* Article Image */}
                {article.urlToImage && (
                  <img
                    src={article.urlToImage}
                    alt={article.title}
                    className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}

                {/* Article Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {article.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span>{article.source}</span>
                    <span>•</span>
                    <span>
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-sm border border-gray-300 text-gray-700 
                                 rounded-lg hover:bg-gray-50 transition"
                    >
                      Read Article →
                    </a>

                    <button
                      onClick={() => handleShareClick(article)}
                      className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg 
                                 hover:bg-emerald-700 transition flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3" />
                      Share with Contact
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && news.length === 0 && (
        <div className="text-center py-20">
          <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            Search for industry news to share with your network
          </p>
        </div>
      )}

      {/* How to Use Section */}
      <div className="mt-12 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200 p-6">
        <h3 className="font-semibold text-emerald-900 mb-3">
          📰 How to Use Industry News Sharing
        </h3>
        <ul className="text-sm text-emerald-800 space-y-2">
          <li>• Search for news in your contacts' industries</li>
          <li>• Click "Share with Contact" to select a recipient</li>
          <li>• The outreach message will be pre-filled with the article</li>
          <li>• Add your personal insights to make it more valuable</li>
          <li>• Sharing relevant content keeps you top-of-mind</li>
          <li>
            • Aim to share 1-2 valuable articles per month with key contacts
          </li>
        </ul>
      </div>

      {/* Select Contact Modal */}
      {showShareModal && selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Share with Contact
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedArticle.title}
                </p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Contacts */}
            <div className="p-6 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredContacts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No contacts found
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact._id}
                      onClick={() => handleSelectContact(contact)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg 
                                 hover:bg-emerald-50 hover:border-emerald-300 transition"
                    >
                      <p className="font-semibold text-gray-800">
                        {contact.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {contact.jobTitle || "Unknown role"} @{" "}
                        {contact.company || "Unknown company"}
                      </p>
                      {contact.industry && (
                        <p className="text-xs text-gray-500 mt-1">
                          Industry: {contact.industry}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
