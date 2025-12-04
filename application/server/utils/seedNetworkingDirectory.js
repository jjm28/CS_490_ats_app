import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import NetworkingDirectory from "../models/Networking/NetworkingDirectory.model.js";

// Handle relative env path correctly
dotenv.config({ path: path.join(process.cwd(), ".env") });

// Debug log
console.log("Loaded ATLAS_URI:", process.env.ATLAS_URI);

mongoose.connect(process.env.ATLAS_URI, {
  dbName: process.env.DB_NAME,
})
  .then(() => console.log("Connected to Mongo!"))
  .catch(err => console.error("MongoDB Connection Error:", err));

const contacts = [
  // ⭐ Target Company & SWE Roles
  {
    name: "Alicia Rivera",
    email: "alicia.rivera@google.com",
    company: "Google",
    role: "Software Engineer",
    location: "New York, NY",
    tags: ["Tech", "WomenInTech"],
    source: "Target Company"
  },
  {
    name: "Jonah Patel",
    email: "jonah.patel@meta.com",
    company: "Meta",
    role: "Frontend Engineer",
    location: "Menlo Park, CA",
    tags: ["WebDev"],
    source: "Target Company"
  },
//   {
//     name: "Marcus Zhao",
//     email: "marcus.zhao@microsoft.com",
//     company: "Microsoft",
//     role: "Cloud Solutions Architect",
//     location: "Seattle, WA",
//     tags: ["Cloud", "Azure"],
//     source: "Target Company"
//   },
//   {
//     name: "Ivy Nguyen",
//     email: "ivy.nguyen@nvidia.com",
//     company: "NVIDIA",
//     role: "AI Research Engineer",
//     location: "San Jose, CA",
//     tags: ["AI", "GPU"],
//     source: "Industry Leader"
//   },

  // 🎯 Recruiters & Referral Warm Leads
  {
    name: "Sophia Kim",
    email: "sophia.kim@linkedin.com",
    company: "LinkedIn",
    role: "Technical Recruiter",
    location: "Sunnyvale, CA",
    tags: ["Recruiter"],
    source: "Warm Introduction"
  },
  {
    name: "Kevin Rodgers",
    email: "krodgers@amazon.com",
    company: "Amazon",
    role: "Recruiting Coordinator",
    location: "New York, NY",
    tags: ["Recruiter"],
    source: "Opportunity Fit"
  },

  // 📊 Business / Product Roles (aligned w/ companies you saved)
//   {
//     name: "Dina Jacobs",
//     email: "dina.jacobs@accenture.com",
//     company: "Accenture",
//     role: "Technology Consultant",
//     location: "New York, NY",
//     tags: ["Consulting"],
//     source: "Market Fit"
//   },
//   {
//     name: "Rachel Torres",
//     email: "rachel.torres@oracle.com",
//     company: "Oracle",
//     role: "Cloud Engineer",
//     location: "Austin, TX",
//     tags: ["Cloud", "WomenInTech"],
//     source: "Industry Fit"
//   },
  {
    name: "Adam Gomez",
    email: "adam.gomez@jpmorgan.com",
    company: "JPMorgan Chase",
    role: "Cybersecurity Analyst",
    location: "New York, NY",
    tags: ["Cybersecurity"],
    source: "Opportunity Fit"
  },

  // 🎓 Alumni for warm intros
//   {
//     name: "Michael Cho",
//     email: "mcho@alumni.njit.edu",
//     company: "Citi",
//     role: "Software Engineer",
//     location: "New Jersey",
//     tags: ["Alumni", "FinanceTech"],
//     source: "Alumni"
//   },
  {
    name: "Emily Zafar",
    email: "ezafar@alumni.njit.edu",
    company: "Spotify",
    role: "Data Engineer",
    location: "New York, NY",
    tags: ["Alumni", "Analytics"],
    source: "Alumni"
  },

  // 🎤 Event Speakers + Industry Leaders to follow
  {
    name: "Laura Stanton",
    email: "laura.stanton@techsummit.com",
    company: "Tech Leadership Summit",
    role: "Keynote Speaker",
    location: "Remote",
    tags: ["Speaker", "Leadership"],
    source: "Industry Event"
  },
  {
    name: "Carlos Vega",
    email: "carlos@cybercon.org",
    company: "CyberCon",
    role: "Security Researcher",
    location: "Boston, MA",
    tags: ["Cybersecurity", "Speaker"],
    source: "Industry Event"
  },

  // 🌍 DEI & Community Networking
  {
    name: "Jessica Brooks",
    email: "jsbrooks@latinasintech.org",
    company: "Latinas in Tech",
    role: "Community Manager",
    location: "Remote",
    tags: ["DEI", "WomenInTech", "Community"],
    source: "Networking Equity"
  },
//   {
//     name: "Samuel Osei",
//     email: "samuel@blacksintechnology.net",
//     company: "Blacks in Technology",
//     role: "Technical Program Coordinator",
//     location: "Remote",
//     tags: ["DEI", "Community"],
//     source: "Networking Equity"
//   }
];

async function seed() {
  try {
    await NetworkingDirectory.deleteMany({});
    await NetworkingDirectory.insertMany(contacts);
    console.log("NetworkingDirectory seeded! ✔");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    mongoose.connection.close();
  }
}

seed();
