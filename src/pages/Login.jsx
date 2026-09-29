import React, { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password: password,
      });

      console.log("LOGIN RESPONSE:", response.data);

      // Check whether backend returned a user ID
      if (!response.data || !response.data.user_id) {
        console.error(
          "Login response does not contain user_id:",
          response.data
        );

        setError("Login succeeded, but user information was not received.");
        return;
      }

      // Create the exact user object Dashboard expects
      const user = {
        id: response.data.user_id,
        name: response.data.name || "",
        email: response.data.email || email.trim(),
      };

      // Save user
      localStorage.setItem("user", JSON.stringify(user));

      // Verify what was saved
      const savedUser = localStorage.getItem("user");

      console.log("USER SAVED:", savedUser);

      if (!savedUser) {
        setError("Could not save login information.");
        return;
      }

      // Make sure saved data is valid
      try {
        JSON.parse(savedUser);
      } catch (storageError) {
        console.error(
          "Saved user data is invalid:",
          storageError
        );

        localStorage.removeItem("user");
        setError("Login information could not be saved correctly.");
        return;
      }

      console.log("LOGIN SUCCESSFUL");
      console.log("REDIRECTING TO DASHBOARD...");

      // Navigate to Dashboard
      navigate("/dashboard");

    } catch (error) {
      console.error("LOGIN ERROR:", error);

      if (error.response) {
        console.error(
          "SERVER RESPONSE:",
          error.response.data
        );

        setError(
          error.response.data?.message ||
          "Invalid email or password."
        );
      } else if (error.request) {
        setError(
          "Cannot connect to MealLens backend. Make sure Flask is running."
        );
      } else {
        setError(
          "Something went wrong while logging in."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">

      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-black/20">

        <button
          type="button"
          className="text-2xl font-bold text-green-400"
          onClick={() => navigate("/")}
        >
          MealLens
        </button>

        <div className="mt-10">
          <h1 className="text-4xl font-bold">Welcome back</h1>
          <p className="mt-2 text-slate-400">Sign in to continue tracking your meals.</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">

          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-slate-300">
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-green-400"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-slate-300">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-green-400"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <p className="mt-6 text-center text-slate-400">
          Don't have an account?{" "}

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="font-semibold text-green-400 hover:underline"
          >
            Register
          </button>

        </p>

      </div>

    </div>
  );
}

export default Login;