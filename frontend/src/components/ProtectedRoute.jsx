import { Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";

const ProtectedRoute = () => {
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    console.log("🔐 Checking Protected Route - Token:", storedToken);
    setToken(storedToken);
  }, []);

  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
