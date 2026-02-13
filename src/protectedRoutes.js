import { Navigate } from "react-router";
import { useAuth } from "./AuthContext";

export default function ProtectedRoutes({ children }) {
  const { user } = useAuth(); 

return user ? children : <Navigate to="/auth" />;
}