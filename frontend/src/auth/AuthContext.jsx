import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { apiFetch } from "./authApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(() => {

    try {

      const stored = window.localStorage.getItem(
        "cortex.user"
      );

      return stored
        ? JSON.parse(stored)
        : null;

    } catch {

      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {

    setLoading(true);

    try {

      const data = await apiFetch("/auth/me");

      setUser(data.user);

      window.localStorage.setItem(
        "cortex.user",
        JSON.stringify(data.user)
      );

      return data.user;

    } catch (err) {

      if (err.status === 401) {

        try {

          await apiFetch(
            "/auth/refresh",
            {
              method: "POST"
            }
          );

          const refreshed = await apiFetch(
            "/auth/me"
          );

          setUser(refreshed.user);

          window.localStorage.setItem(
            "cortex.user",
            JSON.stringify(refreshed.user)
          );

          return refreshed.user;

        } catch {

          // KEEP existing localStorage user
          // instead of logging out instantly

          const stored = window.localStorage.getItem(
            "cortex.user"
          );

          if (stored) {

            setUser(JSON.parse(stored));

          } else {

            setUser(null);
          }
        }

      } else {

        const stored = window.localStorage.getItem(
          "cortex.user"
        );

        if (stored) {

          setUser(JSON.parse(stored));

        } else {

          setUser(null);
        }
      }

      return null;

    } finally {

      setLoading(false);
    }

  }, []);

  useEffect(() => {

    loadSession();

  }, [loadSession]);

  const login = async (payload) => {

    const data = await apiFetch(
      "/auth/login",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(payload),
      }
    );

    setUser(data.user);

    window.localStorage.setItem(
      "cortex.user",
      JSON.stringify(data.user)
    );

    return data.user;
  };

  const signup = async (payload) => {

    const data = await apiFetch(
      "/auth/signup",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(payload),
      }
    );

    return data.user;
  };

  const logout = async () => {

    try {

      await apiFetch(
        "/auth/logout",
        {
          method: "POST"
        }
      );

    } catch {

      // Ignore server logout failure
    }

    setUser(null);

    window.localStorage.removeItem(
      "cortex.user"
    );
  };

  const forgotPassword = async (email) => {

    return apiFetch(
      "/auth/forgot-password",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({ email }),
      }
    );
  };

  const resetPassword = async (
    token,
    newPassword
  ) => {

    return apiFetch(
      "/auth/reset-password",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          token,
          new_password: newPassword
        }),
      }
    );
  };

  const verifyEmail = async (token) => {

    return apiFetch(
      "/auth/verify-email",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({ token }),
      }
    );
  };

  const resendVerification = async (email) => {

    return apiFetch(
      "/auth/resend-verification",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({ email }),
      }
    );
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      forgotPassword,
      resetPassword,
      verifyEmail,
      resendVerification,
      refresh: loadSession,
    }),

    [user, loading, loadSession]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);