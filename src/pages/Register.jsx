import { useState } from "react"
import { Link } from "react-router-dom"
import api from "../api"

function Register() {

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")

  const handleRegister = async (e) => {

    e.preventDefault()

    if (password !== confirmPassword) {
      setMessage("Passwords do not match")
      return
    }

    try {

      const response = await api.post("/auth/register", {
        name: name,
        email: email,
        password: password
      })

      setMessage(response.data.message)

    } catch (error) {

      if (error.response) {
        setMessage(error.response.data.message)
      } else {
        setMessage("Something went wrong")
      }

    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">

      <div className="w-full max-w-md">

        <Link to="/" className="text-2xl font-bold">
          Meal<span className="text-green-400">Lens</span>
        </Link>

        <div className="mt-10">

          <h1 className="text-4xl font-bold">
            Create your account 🚀
          </h1>

          <p className="text-slate-400 mt-2">
            Start your MealLens journey.
          </p>

        </div>

        <form
          onSubmit={handleRegister}
          className="mt-8 space-y-5"
        >

          <div>
            <label className="block mb-2 text-sm">
              Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 outline-none focus:border-green-400"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 outline-none focus:border-green-400"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 outline-none focus:border-green-400"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 outline-none focus:border-green-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-green-500 text-black font-bold hover:bg-green-400"
          >
            Create Account
          </button>

        </form>

        {message && (
          <p className="text-center text-green-400 mt-5">
            {message}
          </p>
        )}

        <p className="text-center text-slate-400 mt-6">

          Already have an account?{" "}

          <Link
            to="/login"
            className="text-green-400 hover:underline"
          >
            Login
          </Link>

        </p>

      </div>

    </div>
  )
}

export default Register