import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import AuthLayout from '../layouts/AuthLayout'
import DashboardRedirect from '../shared/components/DashboardRedirect'
import ProtectedRoute from '../shared/components/ProtectedRoute'

import Home from '../features/public/Home'
import About from '../features/public/About'
import EditorialBoard from '../features/public/EditorialBoard'
import SubmissionGuidelines from '../features/public/SubmissionGuidelines'
import CurrentIssue from '../features/public/CurrentIssue'
import Archives from '../features/public/Archives'
import PublicationEthics from '../features/public/PublicationEthics'
import Contact from '../features/public/Contact'
import Search from '../features/public/Search'
import Login from '../features/public/Login'
import AuthCallback from '../features/public/AuthCallback'

import CompleteProfile from '../features/auth/CompleteProfile'
import RoleSelect from '../features/auth/RoleSelect'
import Register from '../features/auth/Register'
import VerifyEmail from '../features/auth/VerifyEmail'
import ForgotPassword from '../features/auth/ForgotPassword'
import ResetPassword from '../features/auth/ResetPassword'

import AdminDashboard from '../features/admin/AdminDashboard'
import UserManagement from '../features/admin/UserManagement'
import AuditLogs from '../features/admin/AuditLogs'

import AuthorDashboard from '../features/author/AuthorDashboard'
import NewSubmissionRedirect from '../features/author/NewSubmissionRedirect'
import SubmissionWizard from '../features/author/SubmissionWizard'
import MyManuscripts from '../features/author/MyManuscripts'
import ManuscriptDetail from '../features/author/ManuscriptDetail'
import Revisions from '../features/author/Revisions'
import RevisionResponseForm from '../features/author/RevisionResponseForm'
import Withdrawals from '../features/author/Withdrawals'
import AuthorNotifications from '../features/author/Notifications'
import AuthorHelp from '../features/author/Help'
import TrackManuscript from '../features/author/TrackManuscript'

import ScreeningQueue from '../features/moderator/ScreeningQueue'
import ChecklistForm from '../features/moderator/ChecklistForm'
import ModeratorDashboard from '../features/moderator/ModeratorDashboard'
import ScreeningRules from '../features/moderator/ScreeningRules'
import ModeratorNotifications from '../features/moderator/ModeratorNotifications'

import EditorialQueue from '../features/editor/EditorialQueue'
import EditorDashboard from '../features/editor/EditorDashboard'
import ReviewerSelectionPanel from '../features/editor/ReviewerSelectionPanel'
import EditorManuscriptDetail from '../features/editor/ManuscriptDetail'
import DecisionPanel from '../features/editor/DecisionPanel'
import ReviewerManagement from '../features/editor/ReviewerManagement'
import DecisionQueue from '../features/editor/DecisionQueue'
import EditorNotifications from '../features/editor/EditorNotifications'
import AcceptedManuscripts from '../features/editor/AcceptedManuscripts'

import Invitations from '../features/reviewer/Invitations'
import InvitationDetails from '../features/reviewer/InvitationDetails'
import Assignments from '../features/reviewer/Assignments'
import ReviewForm from '../features/reviewer/ReviewForm'
import ExtensionRequest from '../features/reviewer/ExtensionRequest'
import ExtensionRequests from '../features/reviewer/ExtensionRequests'
import ReviewerDashboard from '../features/reviewer/ReviewerDashboard'
import ReviewerProfile from '../features/reviewer/ReviewerProfile'

function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/board" element={<EditorialBoard />} />
        <Route path="/guidelines" element={<SubmissionGuidelines />} />
        <Route path="/current-issue" element={<CurrentIssue />} />
        <Route path="/archives" element={<Archives />} />
        <Route path="/ethics" element={<PublicationEthics />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/search" element={<Search />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Route>

      <Route path="/reviewer/invitations/:id" element={<InvitationDetails />} />

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardRedirect />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
        <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />

        {/* Author Routes */}
        <Route path="/author" element={<Navigate to="/author/dashboard" replace />} />
        <Route path="/author/dashboard" element={<ProtectedRoute allowedRoles={['author']} requireProfileComplete={false}><AuthorDashboard /></ProtectedRoute>} />
        <Route path="/author/submit/new" element={<ProtectedRoute allowedRoles={['author']}><NewSubmissionRedirect /></ProtectedRoute>} />
        <Route path="/author/submit/:id" element={<ProtectedRoute allowedRoles={['author']}><SubmissionWizard /></ProtectedRoute>} />
        <Route path="/author/submissions/new" element={<ProtectedRoute allowedRoles={['author']}><NewSubmissionRedirect /></ProtectedRoute>} />
        <Route path="/author/submissions/:id/edit" element={<ProtectedRoute allowedRoles={['author']}><SubmissionWizard /></ProtectedRoute>} />
        <Route path="/author/manuscripts" element={<ProtectedRoute allowedRoles={['author']}><MyManuscripts /></ProtectedRoute>} />
        <Route path="/author/manuscripts/:id" element={<ProtectedRoute allowedRoles={['author']}><ManuscriptDetail /></ProtectedRoute>} />
        <Route path="/author/track" element={<ProtectedRoute allowedRoles={['author']}><TrackManuscript /></ProtectedRoute>} />
        <Route path="/author/revisions" element={<ProtectedRoute allowedRoles={['author']}><Revisions /></ProtectedRoute>} />
        <Route path="/author/revisions/:id" element={<ProtectedRoute allowedRoles={['author']}><RevisionResponseForm /></ProtectedRoute>} />
        <Route path="/author/withdrawals" element={<ProtectedRoute allowedRoles={['author']}><Withdrawals /></ProtectedRoute>} />
        <Route path="/author/notifications" element={<ProtectedRoute allowedRoles={['author']}><AuthorNotifications /></ProtectedRoute>} />
        <Route path="/author/help" element={<ProtectedRoute allowedRoles={['author']}><AuthorHelp /></ProtectedRoute>} />

        {/* Moderator Routes */}
        <Route path="/moderator" element={<Navigate to="/moderator/dashboard" replace />} />
        <Route path="/moderator/dashboard" element={<ProtectedRoute allowedRoles={['moderator']}><ModeratorDashboard /></ProtectedRoute>} />
        <Route path="/moderator/screening" element={<ProtectedRoute allowedRoles={['moderator']}><ScreeningQueue /></ProtectedRoute>} />
        <Route path="/moderator/screening/:id" element={<ProtectedRoute allowedRoles={['moderator']}><ChecklistForm /></ProtectedRoute>} />
        <Route path="/moderator/rules" element={<ProtectedRoute allowedRoles={['moderator']}><ScreeningRules /></ProtectedRoute>} />
        <Route path="/moderator/notifications" element={<ProtectedRoute allowedRoles={['moderator']}><ModeratorNotifications /></ProtectedRoute>} />

        {/* Editor Routes */}
        <Route path="/editor/dashboard" element={<ProtectedRoute allowedRoles={['editor']}><EditorDashboard /></ProtectedRoute>} />
        <Route path="/editor/queue" element={<ProtectedRoute allowedRoles={['editor']}><EditorialQueue /></ProtectedRoute>} />
        <Route path="/editor/reviewers" element={<ProtectedRoute allowedRoles={['editor']}><ReviewerManagement /></ProtectedRoute>} />
        <Route path="/editor/decisions" element={<ProtectedRoute allowedRoles={['editor']}><DecisionQueue /></ProtectedRoute>} />
        <Route path="/editor/notifications" element={<ProtectedRoute allowedRoles={['editor']}><EditorNotifications /></ProtectedRoute>} />
        <Route path="/editor/accepted" element={<ProtectedRoute allowedRoles={['editor']}><AcceptedManuscripts /></ProtectedRoute>} />
        <Route path="/editor/manuscripts/:id" element={<ProtectedRoute allowedRoles={['editor']}><EditorManuscriptDetail /></ProtectedRoute>} />
        <Route path="/editor/manuscripts/:id/invite" element={<ProtectedRoute allowedRoles={['editor']}><ReviewerSelectionPanel /></ProtectedRoute>} />
        <Route path="/editor/manuscripts/:id/decision" element={<ProtectedRoute allowedRoles={['editor']}><DecisionPanel /></ProtectedRoute>} />

        {/* Reviewer Routes */}
        <Route path="/reviewer/dashboard" element={<ProtectedRoute allowedRoles={['reviewer']}><ReviewerDashboard /></ProtectedRoute>} />
        <Route path="/reviewer/invitations" element={<ProtectedRoute allowedRoles={['reviewer']}><Invitations /></ProtectedRoute>} />
        <Route path="/reviewer/assignments" element={<ProtectedRoute allowedRoles={['reviewer']}><Assignments /></ProtectedRoute>} />
        <Route path="/reviewer/extensions" element={<ProtectedRoute allowedRoles={['reviewer']}><ExtensionRequests /></ProtectedRoute>} />
        <Route path="/reviewer/assignments/:assignmentId/review" element={<ProtectedRoute allowedRoles={['reviewer']}><ReviewForm /></ProtectedRoute>} />
        <Route path="/reviewer/assignments/:id/extension" element={<ProtectedRoute allowedRoles={['reviewer']}><ExtensionRequest /></ProtectedRoute>} />

        {/* Shared Profile Route (all dashboard roles) */}
        <Route path="/profile" element={<ProtectedRoute requireProfileComplete={false}><ReviewerProfile /></ProtectedRoute>} />
      </Route>

      <Route path="/profile/complete" element={<ProtectedRoute requireProfileComplete={false}><CompleteProfile /></ProtectedRoute>} />
      <Route path="/auth/select-role" element={<RoleSelect />} />
      <Route path="*" element={<div>404 Not Found</div>} />
    </Routes>
  )
}

export default AppRouter
