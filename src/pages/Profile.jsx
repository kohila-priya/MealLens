import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import api from "../api"

function Profile() {

  const navigate = useNavigate()

  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null
    } catch {
      return null
    }
  })
  const [mealCount, setMealCount] = useState(0)

  useEffect(() => {

    const storedUser = localStorage.getItem("user")

    if (!storedUser) {
      navigate("/login")
      return
    }

    let loggedInUser

    try {
      loggedInUser = JSON.parse(storedUser)
    } catch {
      localStorage.removeItem("user")
      navigate("/login")
      return
    }

    if (!loggedInUser?.id) {
      localStorage.removeItem("user")
      navigate("/login")
      return
    }

    // Get user's saved meals
    const loadMeals = async () => {

      try {

        const response = await api.get(`/meals/${loggedInUser.id}`)

        setMealCount(response.data.history?.length || 0)

      } catch (error) {

        console.error("Could not load meal count:", error)

      }

    }

    loadMeals()

  }, [navigate])


  const handleLogout = () => {

    localStorage.removeItem("user")

    navigate("/")

  }


  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">
          Loading profile...
        </p>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* NAVBAR */}

      <nav className="border-b border-slate-800">

        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">

          <Link
            to="/"
            className="text-2xl font-bold"
          >
            Meal<span className="text-green-400">Lens</span>
          </Link>


          <div className="flex items-center gap-6">

            <Link
              to="/dashboard"
              className="text-slate-300 hover:text-green-400 transition"
            >
              Dashboard
            </Link>

            <Link
              to="/analyze"
              className="text-slate-300 hover:text-green-400 transition"
            >
              Analyze
            </Link>

            <Link
              to="/profile"
              className="text-green-400 font-medium"
            >
              Profile
            </Link>

          </div>

        </div>

      </nav>


      {/* PROFILE */}

      <main className="max-w-4xl mx-auto px-6 py-12">

        {/* HEADER */}

        <div className="mb-10">

          <p className="text-green-400 font-medium">
            Your Account
          </p>

          <h1 className="text-4xl font-bold mt-2">
            Profile
          </h1>

          <p className="text-slate-400 mt-2">
            Manage your MealLens account.
          </p>

        </div>


        {/* PROFILE CARD */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">

          {/* AVATAR */}

          <div className="flex items-center gap-5 mb-8">

            <div className="w-20 h-20 rounded-full bg-green-500 text-black flex items-center justify-center text-3xl font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>

            <div>

              <h2 className="text-2xl font-bold">
                {user.name}
              </h2>

              <p className="text-slate-400">
                MealLens member
              </p>

            </div>

          </div>


          {/* USER DETAILS */}

          <div className="space-y-5">

            <div className="border-b border-slate-800 pb-5">

              <p className="text-sm text-slate-500">
                Full Name
              </p>

              <p className="text-lg mt-1">
                {user.name}
              </p>

            </div>


            <div className="border-b border-slate-800 pb-5">

              <p className="text-sm text-slate-500">
                Email
              </p>

              <p className="text-lg mt-1">
                {user.email}
              </p>

            </div>


            <div className="border-b border-slate-800 pb-5">

              <p className="text-sm text-slate-500">
                User ID
              </p>

              <p className="text-lg mt-1">
                {user.id}
              </p>

            </div>

          </div>


          {/* STAT */}

          <div className="mt-8 bg-slate-950 border border-slate-800 rounded-xl p-5">

            <p className="text-slate-400 text-sm">
              Meals Saved
            </p>

            <p className="text-3xl font-bold mt-2 text-green-400">
              {mealCount}
            </p>

          </div>


          {/* ACTIONS */}

          <div className="mt-8 flex flex-col sm:flex-row gap-4">

            <Link
              to="/dashboard"
              className="flex-1 text-center py-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition font-medium"
            >
              ← Dashboard
            </Link>


            <Link
              to="/analyze"
              className="flex-1 text-center py-3 rounded-lg bg-green-500 hover:bg-green-400 text-black transition font-bold"
            >
              Analyze Meal
            </Link>

          </div>


          {/* LOGOUT */}

          <button
            onClick={handleLogout}
            className="w-full mt-4 py-3 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition font-medium"
          >
            Log Out
          </button>

        </div>


        {/* DISCLAIMER */}

        <p className="text-xs text-slate-500 mt-8 text-center">
          Your account information is stored locally by MealLens.
        </p>

      </main>

    </div>
  )
}

export default Profile