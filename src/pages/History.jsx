import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import api from "../api"

function History() {

  const navigate = useNavigate()

  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")


  useEffect(() => {

    // Get the currently logged-in user
    let user

    try {
      user = JSON.parse(
        localStorage.getItem("user")
      )
    } catch {
      localStorage.removeItem("user")
    }

    // If there is no logged-in user,
    // send them to Login
    if (!user) {

      navigate("/login")

      return
    }


    const fetchMeals = async () => {

      try {

        setLoading(true)
        setError("")


        // Get meals belonging ONLY
        // to the logged-in user
        const response = await api.get(`/meals/${user.id}`)


        console.log(
          "History response:",
          response.data
        )


        setMeals(
          response.data.history || []
        )


      } catch (error) {

        console.error(
          "HISTORY ERROR:",
          error
        )


        if (error.response) {

          setError(
            error.response.data?.message ||
            `Server error: ${error.response.status}`
          )

        } else if (error.request) {

          setError(
            "Could not connect to MealLens backend. Make sure Flask is running."
          )

        } else {

          setError(
            "Could not load meal history."
          )

        }


      } finally {

        setLoading(false)

      }

    }


    fetchMeals()

  }, [navigate])


  return (

    <div className="min-h-screen bg-slate-950 text-white">


      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="border-b border-slate-800 px-8 py-5 flex justify-between items-center">


        <Link
          to="/"
          className="text-2xl font-bold"
        >
          Meal<span className="text-green-400">Lens</span>
        </Link>


        <div className="flex gap-6 text-slate-300">


          <Link
            to="/dashboard"
            className="hover:text-white"
          >
            Dashboard
          </Link>


          <Link
            to="/analyze"
            className="hover:text-green-400"
          >
            Analyze
          </Link>


          <Link
            to="/profile"
            className="hover:text-green-400"
          >
            Profile
          </Link>


        </div>

      </nav>



      {/* =========================
          MAIN
      ========================= */}

      <main className="max-w-6xl mx-auto px-6 py-12">


        {/* HEADER */}

        <div>

          <p className="text-green-400 font-semibold">
            Your nutrition journey 📋
          </p>

          <h1 className="text-4xl font-bold mt-2">
            Meal History
          </h1>

          <p className="text-slate-400 mt-2">
            View all your previously saved meals.
          </p>

        </div>



        {/* =========================
            LOADING
        ========================= */}

        {loading && (

          <div className="mt-10 text-center">

            <p className="text-slate-400">
              Loading your meals... 🍽️
            </p>

          </div>

        )}



        {/* =========================
            ERROR
        ========================= */}

        {!loading && error && (

          <div className="mt-10 bg-red-950 border border-red-800 text-red-300 rounded-xl p-5">

            {error}

          </div>

        )}



        {/* =========================
            NO MEALS
        ========================= */}

        {!loading &&
          !error &&
          meals.length === 0 && (

          <div className="mt-10 bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">


            <div className="text-5xl">
              🍽️
            </div>


            <h2 className="text-2xl font-bold mt-4">
              No meals yet
            </h2>


            <p className="text-slate-400 mt-2">
              Analyze and save your first meal
              to start building your history.
            </p>


            <Link
              to="/analyze"
              className="inline-block mt-6 px-6 py-3 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400"
            >
              Analyze a Meal
            </Link>


          </div>

        )}



        {/* =========================
            MEAL HISTORY
        ========================= */}

        {!loading &&
          !error &&
          meals.length > 0 && (

          <div className="grid md:grid-cols-2 gap-6 mt-10">


            {meals.map((meal) => (

              (() => {
                const nutrition = meal.total_nutrition || {}
                const firstFood = meal.foods?.[0]

                return (
                  <div
                    key={meal.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition"
                  >


                {/* MEAL HEADER */}

                <div className="flex justify-between items-start">


                  <div>

                    <p className="text-green-400 text-sm font-semibold">
                      Saved Meal
                    </p>


                    <h2 className="text-2xl font-bold mt-1">
                      {firstFood?.name || "Analyzed Meal"}
                    </h2>

                  </div>


                  <span className="text-slate-500 text-sm">
                    #{meal.id}
                  </span>


                </div>



                {/* NUTRITION */}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">


                  {/* CALORIES */}

                  <div className="bg-slate-800 rounded-xl p-4">

                    <p className="text-slate-400 text-xs">
                      Calories
                    </p>

                    <p className="font-bold mt-1">
                      {Number(
                        nutrition.calories || 0
                      ).toFixed(0)}{" "}
                      kcal
                    </p>

                  </div>



                  {/* PROTEIN */}

                  <div className="bg-slate-800 rounded-xl p-4">

                    <p className="text-slate-400 text-xs">
                      Protein
                    </p>

                    <p className="font-bold mt-1">
                      {Number(
                        nutrition.protein || 0
                      ).toFixed(1)}{" "}
                      g
                    </p>

                  </div>



                  {/* CARBS */}

                  <div className="bg-slate-800 rounded-xl p-4">

                    <p className="text-slate-400 text-xs">
                      Carbs
                    </p>

                    <p className="font-bold mt-1">
                      {Number(
                        nutrition.carbs || 0
                      ).toFixed(1)}{" "}
                      g
                    </p>

                  </div>



                  {/* FAT */}

                  <div className="bg-slate-800 rounded-xl p-4">

                    <p className="text-slate-400 text-xs">
                      Fat
                    </p>

                    <p className="font-bold mt-1">
                      {Number(
                        nutrition.fat || 0
                      ).toFixed(1)}{" "}
                      g
                    </p>

                  </div>



                  {/* FIBER */}

                  <div className="bg-slate-800 rounded-xl p-4">

                    <p className="text-slate-400 text-xs">
                      Fiber
                    </p>

                    <p className="font-bold mt-1">
                      {Number(
                        nutrition.fiber || 0
                      ).toFixed(1)}{" "}
                      g
                    </p>

                  </div>



                  {/* SUGAR */}

                  <div className="bg-slate-800 rounded-xl p-4">

                    <p className="text-slate-400 text-xs">
                      Sugar
                    </p>

                    <p className="font-bold mt-1">
                      {Number(
                        nutrition.sugar || 0
                      ).toFixed(1)}{" "}
                      g
                    </p>

                  </div>



                  {/* SODIUM */}

                  <div className="bg-slate-800 rounded-xl p-4">

                    <p className="text-slate-400 text-xs">
                      Sodium
                    </p>

                    <p className="font-bold mt-1">
                      {Number(
                        nutrition.sodium || 0
                      ).toFixed(1)}{" "}
                      mg
                    </p>

                  </div>


                </div>



                {/* DATE */}

                <p className="text-slate-500 text-sm mt-6">

                  Saved:{" "}

                  {meal.created_at
                    ? new Date(
                        meal.created_at
                      ).toLocaleString()
                    : "Date unavailable"
                  }

                </p>


                  </div>
                )
              })()

            ))}


          </div>

        )}


      </main>

    </div>

  )

}

export default History