"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function LoginForm() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  const successMsg = searchParams.get("success");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password || password.length < 6) {
      setError(
        !name
          ? "Please enter your name"
          : "Password must be at least 6 characters",
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password, rememberMe }),
      });
      const data = await res.json();
      if (res.ok) {
        setLoading(false);
        router.push(`dashboard/${data.username}`);
        return;
      }
      const { error: apiError } = data;
      setError(apiError || "Login failed");
    } catch (err) {
      setError("Network error—check connection.");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        background: "linear-gradient(to bottom right, #f8fafc, white, #f8fafc)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        position: "relative",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          position: "absolute",
          top: "1.5rem",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            color: "#000",
            transition: "color 0.2s",
            cursor: "pointer",
            pointerEvents: "auto",
            fontFamily: "Oswald, sans-serif",
            userSelect: "none",
          }}
          onMouseOver={(e: React.MouseEvent<HTMLHeadingElement>) => {
            (e.target as HTMLElement).style.color = "#10b981";
          }}
          onMouseOut={(e: React.MouseEvent<HTMLHeadingElement>) => {
            (e.target as HTMLElement).style.color = "#000";
          }}
        >
          HydraWatch
        </h1>
      </nav>
      {/* Main */}
      <main
        style={{
          width: "100%",
          maxWidth: "24rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          marginTop: "-2rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            textAlign: "center",
            color: "#111827",
            marginBottom: "2rem",
          }}
        >
          Log In
        </h2>
        {successMsg && (
          <div
            style={{
              color: "#10b981",
              fontSize: "0.875rem",
              textAlign: "center",
              backgroundColor: "#f0fdf4",
              padding: "0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #bbf7d0",
            }}
          >
            {successMsg}
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {error && (
            <div
              style={{
                color: "#ef4444",
                fontSize: "0.875rem",
                textAlign: "center",
                backgroundColor: "#fef2f2",
                padding: "0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #fecaca",
              }}
              role="alert"
            >
              {error}
            </div>
          )}
          <div style={{ position: "relative" }}>
            <label
              htmlFor="name"
              style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                padding: 0,
                margin: "-1px",
                overflow: "hidden",
                clip: "rect(0, 0, 0, 0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              onFocus={(e: React.FocusEvent<HTMLInputElement>) =>
                (e.target.style.borderBottomColor = "#10b981")
              }
              onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
                (e.target.style.borderBottomColor = "#d1d5db")
              }
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "none",
                borderBottom: "2px solid #d1d5db",
                background: "transparent",
                color: "#000",
                fontSize: "1rem",
                outline: "none",
                transition: "border-color 0.2s",
              }}
            />
          </div>
          <div style={{ position: "relative" }}>
            <label
              htmlFor="password"
              style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                padding: 0,
                margin: "-1px",
                overflow: "hidden",
                clip: "rect(0, 0, 0, 0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              onFocus={(e: React.FocusEvent<HTMLInputElement>) =>
                (e.target.style.borderBottomColor = "#10b981")
              }
              onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
                (e.target.style.borderBottomColor = "#d1d5db")
              }
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "none",
                borderBottom: "2px solid #d1d5db",
                background: "transparent",
                color: "#000",
                fontSize: "1rem",
                outline: "none",
                transition: "border-color 0.2s",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: "1rem",
                height: "1rem",
                accentColor: "#10b981",
                border: "1px solid #d1d5db",
                borderRadius: "0.25rem",
              }}
            />
            <label
              htmlFor="rememberMe"
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "#111827",
                cursor: "pointer",
              }}
            >
              Remember me
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (!loading)
                (e.target as HTMLElement).style.backgroundColor = "#059669";
            }}
            onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (!loading)
                (e.target as HTMLElement).style.backgroundColor = "#10b981";
            }}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: loading ? "#9ca3af" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
            }}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        {/* Footer Links */}
        <div
          style={{ textAlign: "center", fontSize: "0.75rem", color: "#4b5563" }}
        >
          <a
            href="/signup"
            style={{
              color: "#4b5563",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseOver={(e: React.MouseEvent<HTMLAnchorElement>) =>
              ((e.target as HTMLElement).style.color = "#10b981")
            }
            onMouseOut={(e: React.MouseEvent<HTMLAnchorElement>) =>
              ((e.target as HTMLElement).style.color = "#4b5563")
            }
          >
            Don&apos;t have an account? Sign up
          </a>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
