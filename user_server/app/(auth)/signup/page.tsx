// app/(auth)/signup/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password || name.length < 3 || password.length < 6) {
      setError("Name min 3 chars, password min 6");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json(); // ← ADD THIS

      if (res.ok) {
        router.push(`dashboard/${data.username}`); // ← CHANGE THIS LINE ONLY
      } else {
        const { error } = data;
        setError(error);
      }
    } catch (err) {
      setError("Signup failed—try again.");
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
          }}
          onMouseOver={(e: React.MouseEvent<HTMLHeadingElement>) => {
            (e.target as HTMLElement).style.color = "#10b981";
          }}
          onMouseOut={(e: React.MouseEvent<HTMLHeadingElement>) => {
            (e.target as HTMLElement).style.color = "#000";
          }}
          onClick={() => router.push("/")} // Added: Navigates to home
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
          Sign Up
        </h2>
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
              placeholder="Choose a name"
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
              placeholder="Choose a password"
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
          <button
            type="submit"
            disabled={loading}
            onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (!loading) {
                (e.target as HTMLElement).style.backgroundColor = "#059669";
              }
            }}
            onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (!loading) {
                (e.target as HTMLElement).style.backgroundColor = "#10b981";
              }
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
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>
        {/* Footer Links */}
        <div
          style={{ textAlign: "center", fontSize: "0.75rem", color: "#4b5563" }}
        >
          <a
            href="/login"
            style={{
              color: "#4b5563",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseOver={(e: React.MouseEvent<HTMLAnchorElement>) => {
              (e.target as HTMLElement).style.color = "#10b981";
            }}
            onMouseOut={(e: React.MouseEvent<HTMLAnchorElement>) => {
              (e.target as HTMLElement).style.color = "#4b5563";
            }}
          >
            Already have an account? Log in
          </a>
        </div>
      </main>
    </div>
  );
}
