import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NewDashboardPage from "./pages/NewDashboardPage";
import ProfilePage from "./pages/ProfilePage";
import HabitsPage from "./pages/HabitsPage";
import SleepPage from "./pages/SleepPage";
import RunningPage from "./pages/RunningPage";
import DietPage from "./pages/DietPage";
import OtherHabitsPage from "./pages/OtherHabitsPage";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useTheme } from "./hooks/useTheme";
import "./styles/global.css";

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout theme={theme} onToggleTheme={toggleTheme} />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<NewDashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/sleep" element={<SleepPage />} />
          <Route path="/running" element={<RunningPage />} />
          <Route path="/diet" element={<DietPage />} />
          <Route path="/other-habits" element={<OtherHabitsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
