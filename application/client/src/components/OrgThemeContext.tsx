import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuthMeta } from "../types/cohort";
import logo from "../assets/img/logos/ontrac-trans-2.png";

interface OrgTheme {
  orgName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  poweredBy: boolean;
  isOrgBranded: boolean;
}

const DEFAULT_THEME: OrgTheme = {
  orgName: "ATS for Candidates",
  logoUrl: logo,
  primaryColor: "#2563eb",
  secondaryColor: "#e5e7eb",
  poweredBy: true,
  isOrgBranded: false,
};

const OrgThemeContext = createContext({
  theme: DEFAULT_THEME,
  reloadTheme: () => {},
});
  const { userId, role, organizationId } = getAuthMeta();

export const useOrgTheme = () => useContext(OrgThemeContext);

export const OrgThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  async function loadTheme() {
    try {
      const res = await fetch("/api/org/branding/me", {
        credentials: "include",   headers: {
            ...(userId
              ? {
                  "x-user-id": userId,
                  "x-user-role": role,
                  "x-org-id": organizationId || "",
                }
              : {}),
          },
      });
      console.log(res)
      const json = await res.json();
      setTheme({ ...DEFAULT_THEME, ...json });
      applyTheme(json);
    } catch (err) {
      console.error("Theme load failed:", err);
      setTheme(DEFAULT_THEME);
    }
  }

  function applyTheme(theme: OrgTheme) {
    document.documentElement.style.setProperty(
      "--org-primary",
      theme.primaryColor
    );
    document.documentElement.style.setProperty(
      "--org-secondary",
      theme.secondaryColor
    );
  } 

  useEffect(() => {
    loadTheme();
  }, []);

  return (
    <OrgThemeContext.Provider value={{ theme, reloadTheme: loadTheme }}>
      {children}
    </OrgThemeContext.Provider>
  );
};
