import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Nav from "./components/Nav"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Passes from "./pages/Passes"
import Admin from "./pages/Admin"

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
        <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/passes" element={<PrivateRoute><Layout><Passes /></Layout></PrivateRoute>} />
        <Route path="/passes/add" element={<PrivateRoute><Layout><Passes add /></Layout></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Layout><Admin /></Layout></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/passes" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App