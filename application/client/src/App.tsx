import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import Nav from './components/Nav';
import HomePage from './components/Homepage';
import Registration from './components/Registration';
// import Dashboard from './components/Dashboard';
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
// import JobStatsDashboard from "./components/Jobs/JobStatsDashboard";
import ArchivedJobs from "./components/Jobs/ArchivedJobs";

import EmploymentPage from "./components/Employment/EmploymentPage";
import EmploymentForm from "./components/Employment/EmploymentForm";

// import NewCoverletter from './components/Coverletter/NewCoverletter';
// import CoverletterEditor from './components/Coverletter/CoverletterEditor';
// import Coverletter from './components/Coverletter/Coverletters';
// import ShareView from './components/Coverletter/ShareView';

import PrivateRoute from './components/PrivateRoute';
import Certifications from './components/Certifications/Certifications';
import Projects from "./components/Projects/Projects";

import JobsEntry from './components/Jobs/JobsEntry';
// import NewResume from './components/Resume/NewResume';
// import ResumeEditor from './components/Resume/ResumeEditor';
// import Resumes from './components/Resume/Resumes';
// import ResumeShareView from './components/Resume/ResumeShareView';
// import DeadlineCalendar from './components/Jobs/DeadlineCalendar';
// import ApplicationsPage from './components/Applications/ApplicationsPage';
import JobDetailsPage from './components/Jobs/JobDetailsPage';
// import ApplicationAnalytics from "./components/Applications/ApplicationAnalytics";
import NotificationSettings from './components/Settings/NotificationSettings';

import './App.css';
import CompanyResearch from './components/Job_Tools/CompanyResearch';
import AutomationRules from "./components/AutomationRules/AutomationRules";
import RuleForm from "./components/AutomationRules/RuleForm";

import InterviewHome from './components/Interviews/Interview';
// import InterviewInsightsPage from './components/Interviews/InterviewInsights';

import SalaryResearch from './components/Job_Tools/SalaryResearchPage';

import ManageReferences from './components/Reference/ManageReferences';
import ReferencePortfolio from './components/Reference/ReferencePortfolio';

import PeerGroupsPage from './components/Community/PeerGroup/PeerGroupsPage';
import PeerGroupDiscussionPage from './components/Community/PeerGroup/PeerGroupDiscussionPage';
import ApplicationSuccess from './components/Analytics/ApplicationSuccess';
import GoalTracking from './components/Analytics/GoalTracking';
// import InterviewAnalyticsInsights from './components/Analytics/Interview/InterviewInsights';
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
import CampaignList from './components/Networking/CampaignList';
import AllInteractionsPage from './components/Networking/AllInteractionsPage';
import ImportGoogle from "./components/Networking/ImportGoogle";

import { Toaster } from "react-hot-toast";
// import ReferralDashboard from './components/Referral/ReferralDashboard';
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
import Cohorts from './components/cohorts/Cohorts';
import CohortDetail from './components/cohorts/CohortDetail';
import UserManagement from './components/enterprise/UserManagement';
import BulkOnboardingPage from './components/enterprise/BulkOnboardingPage';
import JobSeekerAcceptInvitePage from './components/enterprise/JobSeekerAcceptInvitePage';
import OrgAnalyticsPage from './components/enterprise/OrgAnalyticsPage';
import CreateCampaign from './components/Networking/CreateCampaign';
import CampaignDetail from './components/Networking/CampaignDetail';
import CampaignAnalytics from './components/Networking/CampaignAnalytics';
import QuickOutreach from './components/Networking/QuickOutreach';
import IndustryNews from './components/Networking/IndustryNews';

import LinkedInTools from "./components/Networking/LinkedIn/LinkedInTools";
import MessageTemplates from "./components/Networking/LinkedIn/MessageTemplates";
import ConnectionTemplates from "./components/Networking/LinkedIn/ConnectionTemplates";
import ProfileOptimization from "./components/Networking/LinkedIn/ProfileOptimization";
import ContentStrategyPage from "./components/Networking/LinkedIn/ContentStrategy";
import CampaignTemplates from "./components/Networking/LinkedIn/CampaignTemplates";
import TeamsPage from "./components/Teams/TeamsPage";
import TeamDetailPage from "./components/Teams/TeamDetailPage";
import CreateTeamPage from "./components/Teams/CreateTeamPage";
// import TeamReviewPage from "./components/Teams/TeamReviewPage";
import CandidateSharingPage from "./components/Teams/CandidateSharingPage";
import TeamFeedbackPage from "./components/Teams/TeamFeedbackPage";
import TeamCommentsPage from "./components/Teams/TeamCommentsPage";
import SuccessOverviewDashboard from './components/Analytics/SuccessOverviewDashboard';
import SuccessPatternsDashboard from './components/Analytics/SuccessPatternsDashboard';
import CustomReportPage from "./components/Analytics/CustomReportPage";
import NetworkingEventsPage from './components/Networking/NetworkingEventsPage';
import DiscoverEvents from './components/Networking/DiscoverEvents';
import EventDetailsPage from './components/Networking/EventDetails';
// import NetworkingAnalyticsPage from './components/Networking/NetworkingAnalyticsPage';
import InformationalInterviews from './components/Networking/InformationalInterviews';
import NewInformationalInterview from './components/Networking/NewInformationalInterview';
import InformationalInterviewDetails from './components/Networking/InformationalInterviewDetails';
import MentorInvitePage from './components/Networking/MentorInvitePage';
import MentorInvite from './components/Networking/MentorInvite';
import MentorDashboard from './components/Networking/MentorDashboard';
import MentorDetails from './components/Networking/MentorDetails';
import SkillCertifications from './components/Certifications/SkillCertifications';
// import CommuterPlannerPage from './components/Jobs/CommutePlanner/CommuterPlannerPage';

// Lazy loaded components
// Resume
const ResumeEditor = lazy(() => import('./components/Resume/ResumeEditor'));
const NewResume = lazy(() => import('./components/Resume/NewResume'));
const Resumes = lazy(() => import('./components/Resume/Resumes'));
const ResumeShareView = lazy(() => import('./components/Resume/ResumeShareView'));

// Coverletter
const NewCoverletter = lazy(() => import('./components/Coverletter/NewCoverletter'));
const CoverletterEditor = lazy(() => import('./components/Coverletter/CoverletterEditor'));
const Coverletter = lazy(() => import('./components/Coverletter/Coverletters'));
const ShareView = lazy(() => import('./components/Coverletter/ShareView'));

// Teams
const TeamReviewPage = lazy(() => import('./components/Teams/TeamReviewPage'));

// Analytics/Charts
const ApplicationAnalytics = lazy(() => import('./components/Applications/ApplicationAnalytics'));
const JobStatsDashboard = lazy(() => import('./components/Jobs/JobStatsDashboard'));
const InterviewAnalyticsInsights = lazy(() => import('./components/Analytics/Interview/InterviewInsights'));
const NetworkingAnalyticsPage = lazy(() => import('./components/Networking/NetworkingAnalyticsPage'));

// Commuter Planner
const CommuterPlannerPage = lazy(() => import('./components/Jobs/CommutePlanner/CommuterPlannerPage'));

// Jobs
// const JobDetailsPage = lazy(() => import('./components/Jobs/JobDetailsPage'));
const DeadlineCalendar = lazy(() => import('./components/Jobs/DeadlineCalendar'));
const ApplicationsPage = lazy(() => import('./components/Applications/ApplicationsPage'));

// Interviews
const InterviewInsightsPage = lazy(() => import('./components/Interviews/InterviewInsights'));

// Secondary Dashboards
const Dashboard = lazy(() => import('./components/Dashboard'));
// const NetworkingDashboard = lazy(() => import('./components/Networking/NetworkingDashboard'));
const ReferralDashboard = lazy(() => import('./components/Referral/ReferralDashboard'));
//import CommuterPlannerPage from './components/Jobs/CommutePlanner/CommuterPlannerPage';
import ApplicationSchedulerPage from "./components/Applications/ApplicationSchedulerPage";

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
          <Route path="/Dashboard" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><Dashboard /></Suspense></PrivateRoute>} />
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
          <Route path="/Jobs/Calendar" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><DeadlineCalendar /></Suspense></PrivateRoute>} />
          <Route path="/coverletter" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><Coverletter /></Suspense></PrivateRoute>} />
          <Route path="/newcoverletter" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><NewCoverletter /></Suspense></PrivateRoute>} />
          <Route path="/coverletter/editor/:id?" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><CoverletterEditor /></Suspense></PrivateRoute>} />
          <Route path="/coverletter/share/:shareid?" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><ShareView /></Suspense></PrivateRoute>} />
          <Route path="/resumes" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><Resumes /></Suspense></PrivateRoute>} />
          <Route path="/resumes/new" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><NewResume /></Suspense></PrivateRoute>} />
          <Route path="/resumes/share" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><ResumeShareView /></Suspense></PrivateRoute>} />
          <Route 
            path="/resumes/editor" 
            element={
              <PrivateRoute>
                <Suspense fallback={<div>Loading...</div>}>
                  <ResumeEditor />
                </Suspense>
              </PrivateRoute>
            } 
          />
          <Route path="/Jobs/Stats" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><JobStatsDashboard /></Suspense></PrivateRoute>} />
          <Route path="/Jobs/Archived" element={<PrivateRoute><ArchivedJobs /></PrivateRoute>} />
          <Route path="/networking/import" element={<ImportGoogle />} />
          <Route path="/networking" element={<PrivateRoute><NetworkingDashboard /></PrivateRoute>} />

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

          <Route path="/networking/campaigns" element={<PrivateRoute><CampaignList /></PrivateRoute>} />
          <Route path="/networking/campaigns/create" element={<PrivateRoute><CreateCampaign /></PrivateRoute>} />
          <Route path="/networking/campaigns/:id" element={<PrivateRoute><CampaignDetail /></PrivateRoute>} />
          <Route path="/networking/campaigns/analytics" element={<PrivateRoute><CampaignAnalytics /></PrivateRoute>} />
          <Route path="/networking/contacts/:id/outreach" element={<PrivateRoute><QuickOutreach /></PrivateRoute>} />
          <Route path="/networking/industry-news" element={<PrivateRoute><IndustryNews /></PrivateRoute>} />

          <Route
            path="/networking/outreach"
            element={
              <PrivateRoute>
                <AiOutreachGenerator />
              </PrivateRoute>
            }
          />
                   
          <Route
            path="/networking/informational"
            element={<InformationalInterviews />}
          />
          
          <Route
            path="/networking/informational/new"
            element={<NewInformationalInterview />}
          />

          <Route
            path="/networking/informational/:id"
            element={<InformationalInterviewDetails />}
          />

          <Route path="/networking/events" element={<NetworkingEventsPage />} />
          <Route path="/networking/discover" element={<DiscoverEvents />} />
          <Route path="/networking/events/:eventId" element={<EventDetailsPage />} />
          <Route path="/networking/analytics" element={<Suspense fallback={<div>Loading...</div>}><NetworkingAnalyticsPage /></Suspense>} />
          <Route path="/networking/mentors/invite" element={<MentorInvitePage />} />
          <Route path="/networking/mentors/invite" element={<MentorInvite />} />
          <Route path="/networking/mentors" element={<MentorDashboard />} />
          <Route path="/networking/mentors/:id" element={<MentorDetails />} />

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

          <Route path="/referrals" element={<Suspense fallback={<div>Loading...</div>}><ReferralDashboard /></Suspense>} />
          <Route path="/referrals/timeline/:id" element={<ReferralTimeline />} />
          <Route path="/networking/linkedin" element={<PrivateRoute><LinkedInTools /></PrivateRoute>} />
          <Route path="/networking/linkedin/messages" element={<PrivateRoute><MessageTemplates /></PrivateRoute>} />
          <Route path="/networking/linkedin/connections" element={<PrivateRoute><ConnectionTemplates /></PrivateRoute>} />
          <Route path="/networking/linkedin/optimize" element={<PrivateRoute><ProfileOptimization /></PrivateRoute>} />
          <Route path="/networking/linkedin/content" element={<PrivateRoute><ContentStrategyPage /></PrivateRoute>} />
          <Route path="/networking/linkedin/campaigns" element={<PrivateRoute><CampaignTemplates /></PrivateRoute>} />

          <Route
            path="/Applications"
            element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><ApplicationsPage /></Suspense></PrivateRoute>}
          />
          <Route path="/Jobs/:id" element={<PrivateRoute><JobDetailsPage /></PrivateRoute>} />
          <Route path="/SalaryResearch" element={<PrivateRoute><SalaryResearch /></PrivateRoute>} />
          <Route path="/Applications/Analytics" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><ApplicationAnalytics /></Suspense></PrivateRoute>} />
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
            element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><InterviewInsightsPage jobId={''} /></Suspense></PrivateRoute>}
          />
          <Route
            path="/Interview-Prep"
            element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><InterviewHome /></Suspense></PrivateRoute>}
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
          <Route path="/analytics/interview-insights" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><InterviewAnalyticsInsights /></Suspense></PrivateRoute>} />

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
                <SupportPage />
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
<Route path="/advisor/availability" element={<PrivateRoute><AdvisorAvailabilityPage /></PrivateRoute>} />
<Route path="/enterprise/cohorts" element={<Cohorts />} />
<Route path="/enterprise/cohorts/:cohortId" element={<CohortDetail />} />
<Route path="/not-authorized" element={<div>Not authorized</div>} />
<Route path="/enterprise/users" element={<UserManagement />} />
<Route path="/enterprise/onboarding" element={<BulkOnboardingPage />} />
<Route
  path="/jobseeker/accept-invite"
  element={<PrivateRoute><JobSeekerAcceptInvitePage /></PrivateRoute>}
/><Route
  path="/enterprise/analytics"
  element={<OrgAnalyticsPage />}
/>
          <Route
            path="/job-search/sharing"
            element={
              <PrivateRoute>
                <JobSearchSharingPage />
              </PrivateRoute>
            } />
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
            element={<PrivateRoute><AdvisorAcceptInvitePage /></PrivateRoute>}
          />
          <Route
            path="/advisor/clients"
            element={<PrivateRoute><AdvisorClientsPage /></PrivateRoute>}
          />
          <Route
            path="/advisor/clients/:relationshipId"
            element={<PrivateRoute><AdvisorClientProfilePage /></PrivateRoute>}
          />
          <Route
            path="/advisors/:relationshipId/messages"
            element={<PrivateRoute><AdvisorMessagesPage /></PrivateRoute>}
          />
          <Route
            path="/advisors/:relationshipId/sessions"
            element={<PrivateRoute><AdvisorSessionsPage /></PrivateRoute>}
          />
          <Route
            path="/advisor/clients/:relationshipId/messages"
            element={<PrivateRoute><AdvisorClientMessagesPage /></PrivateRoute>}
          />
          <Route
            path="/advisors/:relationshipId/recommendations"
            element={<AdvisorRecommendationsPage />}
          />
          <Route path="/advisor/availability" element={<AdvisorAvailabilityPage />} />
          <Route 
            path="/teams" 
            element={<PrivateRoute><TeamsPage /></PrivateRoute>} 
          />
          <Route 
            path="/teams/:teamId" 
            element={<PrivateRoute><TeamDetailPage /></PrivateRoute>} 
          />
          <Route
           path="/teams/new" 
           element={<PrivateRoute><CreateTeamPage /></PrivateRoute>} 
           />
          <Route 
            path="/teams/:teamId/review" 
            element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><TeamReviewPage /></Suspense></PrivateRoute>} 
          />
           <Route 
           path="/teams/:teamId/share" 
           element={<PrivateRoute><CandidateSharingPage /></PrivateRoute>} 
           />
           <Route 
           path="/teams/:teamId/feedback" 
           element={<PrivateRoute><TeamFeedbackPage /></PrivateRoute>} 
           />

          <Route 
          path="/teams/:teamId/comments" 
          element={<PrivateRoute><TeamCommentsPage /></PrivateRoute>} />

          <Route
            path="/analytics/success-overview"
            element={<PrivateRoute><SuccessOverviewDashboard /></PrivateRoute>}
          />

          <Route
            path="/analytics/success-patterns"
            element={<PrivateRoute><SuccessPatternsDashboard /></PrivateRoute>}
          />

          <Route
            path="/analytics/custom-report"
            element={<PrivateRoute><CustomReportPage /></PrivateRoute>}
          />
          <Route path="/skill-certifications" element={<PrivateRoute><SkillCertifications /></PrivateRoute>} />
          <Route path="/commuter-planner" element={<PrivateRoute><Suspense fallback={<div>Loading...</div>}><CommuterPlannerPage /></Suspense></PrivateRoute>} />        
          

          <Route
            path="/Applications/Scheduler"
            element={<PrivateRoute><ApplicationSchedulerPage /></PrivateRoute>}
          />
        </Routes>
      </div>
    </>
  );
}

export default App;