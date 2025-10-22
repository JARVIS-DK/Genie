import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken, getRefreshToken } from "@/services/api_request";

interface Props {
  children: ReactNode;
}

export default function RequireAuth({ children }: Props) {
  // const token = getAccessToken();
  const token = getRefreshToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
