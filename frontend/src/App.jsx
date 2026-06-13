import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Nav from "./components/Nav"
import Login from "./pages/Login"
import Register from "./pages/Register"
import VerifyEmail from "./pages/VerifyEmail"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import ConfirmDelete from "./pages/ConfirmDelete"
import Dashboard from "./pages/Dashboard"
import Passes from "./pages/Passes"
import Admin from "./pages/Admin"
import Profile from "./pages/Profile"

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token")
  return token ? children : <Navigate to="/login" replace />
}

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Nav />
      {children}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/confirm-delete" element={<ConfirmDelete />} />
        <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/passes" element={<PrivateRoute><Layout><Passes /></Layout></PrivateRoute>} />
        <Route path="/passes/add" element={<PrivateRoute><Layout><Passes add /></Layout></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Layout><Admin /></Layout></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/passes" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
