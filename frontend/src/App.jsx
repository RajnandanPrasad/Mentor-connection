import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import MentorDashboard from "./pages/MentorDashboard";
import MentorMatching from "./pages/MentorMatching";
import Chat from "./pages/Chat";
import Connections from "./pages/Connections";
import Groups from "./pages/Groups";
import FindMentor from "./pages/FindMentor";
import ProtectedRoute from "./components/ProtectedRoute";
import MentorProfile from './components/MentorProfile/MentorProfile';
import { AuthProvider } from './context/AuthContext';

function App() {
  console.log("App is rendering"); // Debug log

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={
              <Suspense fallback={<div>Loading Home...</div>}>
                <Home />
              </Suspense>
            } />
            <Route path="/login" element={
              <Suspense fallback={<div>Loading Login...</div>}>
                <Login />
              </Suspense>
            } />
            <Route path="/signup" element={
              <Suspense fallback={<div>Loading Signup...</div>}>
                <Signup />
              </Suspense>
            } />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/mentor-dashboard" element={<MentorDashboard />} />
              <Route path="/mentor-matching" element={<MentorMatching />} />
              <Route path="/find-mentor" element={<FindMentor />} />
              <Route path="/chat/:chatId" element={<Chat />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/groups" element={<Groups />} />
            </Route>

            <Route path="/mentor/:mentorId" element={<MentorProfile />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
