import React from "react";
import { Link } from "react-router-dom";
import { 
  Target, 
  Sparkles, 
  LineChart, 
  Users, 
  FileText, 
  Calendar,
  Briefcase,
  TrendingUp,
  CheckCircle2
} from "lucide-react";
import "../App.css";

function HomePage() {
  const features = [
    {
      icon: Target,
      title: "Smart Application Tracking",
      description: "Organize every application with a visual pipeline. Never lose track of deadlines or follow-ups again."
    },
    {
      icon: Sparkles,
      title: "AI-Powered Documents",
      description: "Generate tailored resumes and cover letters for each job in seconds, optimized for ATS systems."
    },
    {
      icon: Calendar,
      title: "Interview Preparation",
      description: "Company research, mock interviews, and curated questions to help you ace every interview."
    },
    {
      icon: Users,
      title: "Networking Hub",
      description: "Track connections, manage referrals, and leverage your network effectively."
    },
    {
      icon: LineChart,
      title: "Success Analytics",
      description: "Data-driven insights on your job search performance and market trends."
    },
    {
      icon: Briefcase,
      title: "Career Collaboration",
      description: "Share progress with mentors, coaches, or accountability partners."
    }
  ];

  const stats = [
    { value: "10x", label: "Faster Application Process" },
    { value: "73%", label: "Higher Response Rate" },
    { value: "30+", label: "Integrated Tools" }
  ];

  return (
    <div className="min-h-screen bg-[#F6F4EF]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--brand-navy)] via-[var(--brand-teal)] to-[var(--brand-teal-light)] text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
              Take Control of Your
              <span className="block text-[var(--brand-sage)] mt-2">Job Search Journey</span>
            </h1>
            
            <p className="mt-6 text-xl sm:text-2xl text-gray-100 max-w-3xl mx-auto leading-relaxed">
              The ATS built for candidates. Track applications, generate AI-powered documents, 
              and land your dream job faster.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/Registration"
                className="inline-flex items-center gap-2 bg-[var(--brand-olive)] hover:bg-[var(--brand-teal-light)] text-white font-semibold px-8 py-4 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Get Started Free
                <CheckCircle2 size={20} />
              </Link>
              
              <Link
                to="/Login"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-8 py-4 rounded-lg text-lg border-2 border-white/30 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
            
            <p className="mt-6 text-sm text-gray-200">
              No credit card required • Set up in under 5 minutes
            </p>
          </div>
          
          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-[var(--brand-sage)]">{stat.value}</div>
                <div className="mt-2 text-sm text-gray-200 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="#F6F4EF"/>
          </svg>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-[var(--brand-navy)] mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional-grade tools that were once only available to employers, 
              now in your hands.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border-l-4 border-[var(--brand-sage)] hover:border-[var(--brand-teal)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--brand-teal)] to-[var(--brand-teal-light)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[var(--brand-navy)] mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-[var(--brand-navy)] mb-4">
              Your Job Search, Simplified
            </h2>
            <p className="text-xl text-gray-600">
              From chaos to clarity in three simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[var(--brand-teal)] to-[var(--brand-teal-light)] text-white text-3xl font-bold mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-2xl font-semibold text-[var(--brand-navy)] mb-4">
                Create Your Profile
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Import your resume or build from scratch. Our AI learns your background and career goals.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[var(--brand-teal)] to-[var(--brand-teal-light)] text-white text-3xl font-bold mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-2xl font-semibold text-[var(--brand-navy)] mb-4">
                Track Applications
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Add jobs, generate custom documents, and manage your entire pipeline in one place.
              </p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[var(--brand-teal)] to-[var(--brand-teal-light)] text-white text-3xl font-bold mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-2xl font-semibold text-[var(--brand-navy)] mb-4">
                Land The Offer
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Get interview-ready with AI prep tools, track success metrics, and optimize your strategy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="bg-gradient-to-br from-[var(--brand-navy)] to-[var(--brand-teal)] rounded-3xl p-12 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Job Searching Shouldn't Feel Like a Full-Time Job
            </h2>
            <p className="text-xl text-gray-100 mb-8 leading-relaxed">
              OnTrac gives you the same powerful tools that employers use to track candidates. 
              Now you can level the playing field and take control of your career.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-[var(--brand-sage)]" />
                <span>Completely Free</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-[var(--brand-sage)]" />
                <span>No Ads</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-[var(--brand-sage)]" />
                <span>Your Data, Your Control</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-[var(--brand-navy)] mb-6">
            Ready to Transform Your Job Search?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join hundreds of job seekers who are already staying OnTrac
          </p>
          <Link
            to="/Registration"
            className="inline-flex items-center gap-2 bg-[var(--brand-olive)] hover:bg-[var(--brand-teal)] text-white font-semibold px-10 py-5 rounded-lg text-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Get Started Free
            <TrendingUp size={24} />
          </Link>
          <p className="mt-6 text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/Login" className="text-[var(--brand-teal)] hover:text-[var(--brand-teal-light)] font-medium underline">
              Sign in here
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;