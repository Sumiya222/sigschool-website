import { createContext, useContext } from "react";
import type { DashboardSession } from "@/lib/dashboard-auth";

export const SchoolSessionContext = createContext<DashboardSession | null>(null);

export function useSchoolSession(): DashboardSession {
  const ctx = useContext(SchoolSessionContext);
  if (!ctx) throw new Error("SchoolSessionContext missing");
  return ctx;
}
