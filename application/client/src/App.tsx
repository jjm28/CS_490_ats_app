import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

import { useEffect } from 'react';
import Nav from './components/Nav';
import HomePage from './components/Homepage';
import Registration from './components/Registration';
import Dashboard from './components/Dashboard';
import Skills from './components/Skills/Skills';
import LoginPage from './components/Login_Logout/Login';
import ProfileDashboard from './components/Profile/ProfileDashboard';
import ProfilePage from './components/Profile/ProfilePage';
import ProfileForm from './components/Profile/ProfileForm';
import Logout from './components/Login_Logout/Logout';
import Education from './components/Education/Education';
import AuthCallback from './components/AuthCallback';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import JobStatsDashboard from "./components/Jobs/JobStatsDashboard";
import ArchivedJobs from "./components/Jobs/ArchivedJobs";

import EmploymentPage from "./components/Employment/EmploymentPage";
import EmploymentForm from "./components/Employment/EmploymentForm";

import NewCoverletter from './components/Coverletter/NewCoverletter';
import CoverletterEditor from './components/Coverletter/CoverletterEditor';
import Coverletter from './components/Coverletter/Coverletters';
import ShareView from './components/Coverletter/ShareView';

import PrivateRoute from './components/PrivateRoute';
import Certifications from './components/Certifications/Certifications';
import Projects from "./components/Projects/Projects";

import JobsEntry from './components/Jobs/JobsEntry';
import NewResume from './components/Resume/NewResume';
import ResumeEditor from './components/Resume/ResumeEditor';
import Resumes from './components/Resume/Resumes';
import ResumeShareView from './components/Resume/ResumeShareView';
import DeadlineCalendar from './components/Jobs/DeadlineCalendar';
import ApplicationsPage from './components/Applications/ApplicationsPage';
import JobDetailsPage from './components/Jobs/JobDetailsPage';
import ApplicationAnalytics from "./components/Applications/ApplicationAnalytics";
import NotificationSettings from './components/Settings/NotificationSettings';

import './App.css';
import CompanyResearch from './components/Job_Tools/CompanyResearch';
import AutomationRules from "./components/AutomationRules/AutomationRules";
import RuleForm from "./components/AutomationRules/RuleForm";

import InterviewHome from './components/Interviews/Interview';
import InterviewInsightsPage from './components/Interviews/InterviewInsights';

import SalaryResearch from './components/Job_Tools/SalaryResearchPage';

import ManageReferences from './components/Reference/ManageReferences';
import ReferencePortfolio from './components/Reference/ReferencePortfolio';

import PeerGroupsPage from './components/Community/PeerGroup/PeerGroupsPage';
import PeerGroupDiscussionPage from './components/Community/PeerGroup/PeerGroupDiscussionPage';
import ApplicationSuccess from './components/Analytics/ApplicationSuccess';
import GoalTracking from './components/Analytics/GoalTracking';
import InterviewInsights from './components/Analytics/Interview/InterviewInsights';
import MarketTrends from './components/Analytics/MarketTrends';
import NetworkingROI from './components/Analytics/NetworkingROI';
import Overview from './components/Analytics/Overview';
import SalaryMarket from './components/Analytics/SalaryMarket';
//import SupporterSettings from './components/Support/SupporterSettings';
//import WellbeingCheckinPanel from './components/Support/WellbeingCheckinPanel';
import SupporterDashboard from './components/Support/SupporterDashboard';
import AcceptInvitePage from './components/Support/AcceptInvitePage';
import JobProductivityDashboard from "./components/Jobs/JobProductivityDashboard";
import JobSalaryDetails from "./components/JobSalaryDetails";
import SalaryProgressDetail from "./components/Analytics/Salary/SalaryProgressDetail";
import CompProgressDetail from "./components/Analytics/Salary/CompProgressDetail";
import GoalNew from "./components/Analytics/SmartGoals/GoalNew";
import JobCompetitiveAnalysisDashboard from "./components/Jobs/JobCompetitiveAnalysisDashboard";
import JobSearchSharingPage from './components/JobSearchSharing/JobSearchSharingPage';
import JobSearchSharingPartnerPage from './components/JobSearchSharing/JobSearchSharingPartnerPage';
import SupportPage from './components/Support/SupportPage';
import JobSearchPartnerInviteAcceptPage from './components/JobSearchSharing/JobSearchPartnerInviteAcceptPage';
import NetworkingDashboard from './components/Networking/NetworkingDashboard';
import ContactList from './components/Networking/ContactList';
import ContactDetails from './components/Networking/ContactDetails';
import ContactEditor from './components/Networking/ContactEditor';
import AddInteraction from './components/Networking/AddInteraction';
import AiOutreachGenerator from './components/Networking/AiOutreachGenerator';
import InteractionHistory from './components/Networking/InteractionHistory';
import AllInteractionsPage from './components/Networking/AllInteractionsPage';
import ImportGoogle from "./components/Networking/ImportGoogle";

import { Toaster } from "react-hot-toast";
import ReferralDashboard from './components/Referral/ReferralDashboard';
import ReferralTimeline from './components/Referral/ReferralTimeline';
import ReferralRequestPage from "./components/Referral/ReferralRequestPage";
import ReferralInsights from './components/Referral/ReferralInsights';


import AdvisorsPage from './components/Advisors/AdvisorsPage';
import AdvisorAcceptInvitePage from './components/Advisors/AdvisorAcceptInvitePage';
import AdvisorClientsPage from './components/Advisors/AdvisorClientsPage';
import AdvisorClientProfilePage from './components/Advisors/AdvisorClientProfilePage';
import AdvisorMessagesPage from './components/Advisors/AdvisorMessaging/AdvisorMessagesPage';
import AdvisorClientMessagesPage from './components/Advisors/AdvisorMessaging/AdvisorClientMessagesPage';
import AdvisorRecommendationsPage from './components/Advisors/AdvisorRecommendationsPage';
import AdvisorSessionsPage from './components/Advisors/AdvisorSessionsPage';
import AdvisorAvailabilityPage from './components/Advisors/AdvisorAvailabilityPage';

function App() {
  const location = useLocation();
  const hideNavbarRoutes = ["/Login", "/Registration", "/forgot-password", "/reset-password", "/login"];
  const showNavbar = !hideNavbarRoutes.includes(location.pathname);
  const getAuthUserId = () => {
    try {
      const authUser = localStorage.getItem("authUser");
      return authUser ? JSON.parse(authUser).user?._id : null;
    } catch (error) {
      console.error("Error parsing authUser:", error);
      return null;
    }
  };
  const userId = getAuthUserId();
  useEffect(() => {
    // Adjust condition to only clear if leaving *this* page
    if (location.pathname === "/coverletter/editor") {
      // we are currently ON the editor page → don't clear yet
      return;
    }
    console.log("working")
    // leaving the editor → clear
    sessionStorage.removeItem("CoverletterID");
  }, [location.pathname]);
  return (
    <>
      {showNavbar && <Nav />}

      <Toaster position="top-center" />

      <div className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/Registration" element={<Registration />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/Dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} /> {/* Protected Routes */}
          <Route path="/Projects" element={<PrivateRoute><Projects /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/Skills" element={<PrivateRoute><Skills /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/Login" element={<LoginPage />} />
          <Route path="/ProfileDashboard" element={<PrivateRoute><ProfileDashboard /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/ProfilePage" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/ProfileForm" element={<PrivateRoute><ProfileForm /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/ProfileForm/:id" element={<PrivateRoute><ProfileForm /></PrivateRoute>} />
          <Route path="/EmploymentPage" element={<PrivateRoute><EmploymentPage /></PrivateRoute>} />
          <Route path="/EmploymentForm" element={<PrivateRoute><EmploymentForm /></PrivateRoute>} />
          <Route path="/EmploymentForm/:id" element={<PrivateRoute><EmploymentForm /></PrivateRoute>} />
          <Route path="/Logout" element={<Logout />} />
          <Route path="/Education" element={<PrivateRoute><Education /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/Education" element={<PrivateRoute><Education /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/Certifications" element={<PrivateRoute><Certifications /></PrivateRoute>} /> {/* Protected Routes */}
          <Route path="/company-research" element={<PrivateRoute><CompanyResearch /></PrivateRoute>} />
          <Route path="/Jobs" element={<PrivateRoute><JobsEntry /></PrivateRoute>} />
          <Route path="/Jobs/Pipeline" element={<PrivateRoute><Navigate to="/Applications" replace /></PrivateRoute>} />
          <Route path="/Jobs/Calendar" element={<PrivateRoute><DeadlineCalendar /></PrivateRoute>} />
          <Route path="/coverletter" element={<PrivateRoute><Coverletter /></PrivateRoute>} />
          <Route path="/newcoverletter" element={<PrivateRoute><NewCoverletter /></PrivateRoute>} />
          <Route path="/coverletter/editor/:id?" element={<PrivateRoute><CoverletterEditor /></PrivateRoute>} />
          <Route path="/coverletter/share/:shareid?" element={<PrivateRoute><ShareView /></PrivateRoute>} />
          <Route path="/resumes" element={<PrivateRoute><Resumes /></PrivateRoute>} />
          <Route path="/resumes/new" element={<PrivateRoute><NewResume /></PrivateRoute>} />
          <Route path="/resumes/editor" element={<PrivateRoute><ResumeEditor /></PrivateRoute>} />
          <Route path="/resumes/share" element={<PrivateRoute><ResumeShareView /></PrivateRoute>} />
          <Route path="/Jobs/Stats" element={<PrivateRoute><JobStatsDashboard /></PrivateRoute>} />
          <Route path="/Jobs/Archived" element={<PrivateRoute><ArchivedJobs /></PrivateRoute>} />
          <Route path="/networking/import" element={<ImportGoogle />} />
          <Route
            path="/networking"
            element={
              <PrivateRoute>
                <NetworkingDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/networking/contacts"
            element={
              <PrivateRoute>
                <ContactList />
              </PrivateRoute>
            }
          />

          <Route
            path="/networking/contacts/new"
            element={
              <PrivateRoute>
                <ContactEditor />
              </PrivateRoute>
            }
          />

          <Route
            path="/networking/contacts/:id"
            element={
              <PrivateRoute>
                <ContactDetails />
              </PrivateRoute>
            }
          />


          <Route
            path="/networking/interactions/:id"
            element={<InteractionHistory />}
          />

          <Route
            path="/networking/contacts/:id/edit"
            element={
              <PrivateRoute>
                <ContactEditor />
              </PrivateRoute>
            }
          />


          <Route
            path="/networking/interactions/:id/add"
            element={
              <PrivateRoute>
                <AddInteraction />
              </PrivateRoute>
            }
          />

          <Route
            path="/networking/interactions"
            element={<AllInteractionsPage />}
          />

          <Route
            path="/networking/outreach"
            element={
              <PrivateRoute>
                <AiOutreachGenerator />
              </PrivateRoute>
            }
          />

<Route
  path="/referrals/request"
  element={
    <PrivateRoute>
      <ReferralRequestPage />
    </PrivateRoute>
  }
/>


<Route
  path="/referrals/insights"
  element={
    <PrivateRoute>
      <ReferralInsights jobTitle={''} relationship={''} />
    </PrivateRoute>
  }
/>

          <Route path="/referrals" element={<ReferralDashboard />} />
          <Route path="/referrals/timeline/:id" element={<ReferralTimeline />} />

          <Route
            path="/Applications"
            element={<PrivateRoute><ApplicationsPage /></PrivateRoute>}
          />
          <Route path="/Jobs/:id" element={<PrivateRoute><JobDetailsPage /></PrivateRoute>} />
          <Route path="/SalaryResearch" element={<PrivateRoute><SalaryResearch /></PrivateRoute>} />
          <Route
            path="/Applications/Analytics"
            element={<PrivateRoute><ApplicationAnalytics /></PrivateRoute>}
          />
          <Route
            path="/automation"
            element={<PrivateRoute><AutomationRules /></PrivateRoute>}
          />

          <Route
            path="/automation/new"
            element={<PrivateRoute><RuleForm /></PrivateRoute>}
          />

          <Route
            path="/automation/:id/edit"
            element={<PrivateRoute><RuleForm /></PrivateRoute>}
          />

          <Route path="/Notifications" element={<PrivateRoute><NotificationSettings /></PrivateRoute>} />
          <Route
            path="/interview-insights"
            element={<InterviewInsightsPage/>}
          />
          <Route
            path="/Interview-Prep"
            element={<InterviewHome/>}
          />
          <Route path="/manage-references" element={<PrivateRoute><ManageReferences /></PrivateRoute>} />
          <Route path="/references/portfolio" element={<PrivateRoute><ReferencePortfolio /></PrivateRoute>} />
          <Route path="/peer-groups" element={<PrivateRoute><PeerGroupsPage /></PrivateRoute>} />
          <Route path="/peer-groups/:groupId" element={<PrivateRoute><PeerGroupDiscussionPage /></PrivateRoute>} />

          <Route
            path="/analytics/overview"
            element={<PrivateRoute><Overview /></PrivateRoute>}
          />
          <Route
            path="/analytics/application-success"
            element={<PrivateRoute><ApplicationSuccess /></PrivateRoute>}
          />
          <Route
            path="/analytics/interview-insights"
            element={<PrivateRoute><InterviewInsights /></PrivateRoute>}
          />
          <Route
            path="/analytics/networking-roi"
            element={<PrivateRoute><NetworkingROI /></PrivateRoute>}
          />
          <Route
            path="/analytics/salary-market"
            element={<PrivateRoute><SalaryMarket /></PrivateRoute>}
          />
          <Route
            path="/analytics/goal-tracking"
            element={<PrivateRoute><GoalTracking /></PrivateRoute>}
          />
          <Route path="/analytics/goals/new" element={<GoalNew />} />
          <Route
            path="/analytics/market-trends"
            element={<PrivateRoute><MarketTrends /></PrivateRoute>}
          />
          
<Route
  path="/support"
  element={
    <PrivateRoute>
      <SupportPage/>
    </PrivateRoute>
  }
/>

      {/* Job seeker preview */}
      <Route
        path="/supporters/preview/:supporterId"
        element={<PrivateRoute><SupporterDashboard /></PrivateRoute>}
      />

      {/* Supporter side (magic link) */}
      <Route
        path="/supporter/accept"
        element={<PrivateRoute><AcceptInvitePage /></PrivateRoute>}
      />
      <Route
        path="/supporter/dashboard/:supporterId"
        element={<PrivateRoute><SupporterDashboard /></PrivateRoute>}
      />

          <Route 
          path="/Jobs/Productivity" 
          element={<PrivateRoute><JobProductivityDashboard /></PrivateRoute>}
          />
          <Route path="/analytics/productivity" 
          element={<PrivateRoute><JobProductivityDashboard /></PrivateRoute>} />
          <Route path="/jobs/:jobId/salary" element={<JobSalaryDetails />} />
          <Route path="/analytics/salary-progress/:jobId" element={<SalaryProgressDetail />} />
          <Route
            path="/analytics/comp-progress/:jobId"
            element={
              <PrivateRoute>
                <CompProgressDetail />
              </PrivateRoute>
            }
          />
          <Route 
          path="/analytics/productivity" 
          element={<PrivateRoute><JobProductivityDashboard /></PrivateRoute>} 
          />
          <Route
            path="/Jobs/CompetitiveAnalysis"
            element={<PrivateRoute><JobCompetitiveAnalysisDashboard /></PrivateRoute>}
          />
        <Route
          path="/job-search/sharing"
          element={
            <PrivateRoute>
              <JobSearchSharingPage />
            </PrivateRoute>
          }/>
          <Route
  path="/job-sharing/:ownerId"
  element={
    <PrivateRoute>
      <JobSearchSharingPartnerPage />
    </PrivateRoute>
  }
  />
  <Route
  path="/job-sharing/accept"
  element={
    <PrivateRoute>
      <JobSearchPartnerInviteAcceptPage />
    </PrivateRoute>
  }
/>
  <Route
  path="/advisors"
  element={
    <PrivateRoute>
      <AdvisorsPage />
    </PrivateRoute>
  }
/>
      <Route
        path="/advisor/accept"
        element={ <PrivateRoute><AdvisorAcceptInvitePage /></PrivateRoute>}
      />
      <Route
        path="/advisor/clients"
        element={ <PrivateRoute><AdvisorClientsPage /></PrivateRoute>}
      />
      <Route
        path="/advisor/clients/:relationshipId"
        element={ <PrivateRoute><AdvisorClientProfilePage /></PrivateRoute>}
      />
      <Route
  path="/advisors/:relationshipId/messages"
  element={<PrivateRoute><AdvisorMessagesPage /></PrivateRoute>}
/>
<Route
  path="/advisors/:relationshipId/sessions"
  element={<PrivateRoute><AdvisorSessionsPage /></PrivateRoute>}
/>
// advisor side
<Route
  path="/advisor/clients/:relationshipId/messages"
  element={<PrivateRoute><AdvisorClientMessagesPage /></PrivateRoute>}
/>
<Route
  path="/advisors/:relationshipId/recommendations"
  element={<AdvisorRecommendationsPage />}
/>
<Route path="/advisor/availability" element={<AdvisorAvailabilityPage />} />

        </Routes>

      </div>
    </>
  );
}

export default App;