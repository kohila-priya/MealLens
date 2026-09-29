import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import api from "../api"

function Insights() {

  const navigate = useNavigate()

  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {

    const fetchMeals = async () => {

      try {

        let user

        try {
          user = JSON.parse(localStorage.getItem("user"))
        } catch {
          localStorage.removeItem("user")
        }

        if (!user?.id) {
          navigate("/login")
          return
        }

        const response = await api.get(`/meals/${user.id}`)

        setMeals(response.data.history || [])

      } catch (error) {

        console.error(error)

        setError(
          "Could not load insights."
        )

      } finally {

        setLoading(false)

      }

    }

    fetchMeals()

  }, [navigate])


  // =========================
  // TOTALS
  // =========================

  const totalCalories = meals.reduce(
    (sum, meal) => sum + Number(meal.total_nutrition?.calories || 0),
    0
  )

  const totalProtein = meals.reduce(
    (sum, meal) => sum + Number(meal.total_nutrition?.protein || 0),
    0
  )

  const totalCarbs = meals.reduce(
    (sum, meal) => sum + Number(meal.total_nutrition?.carbs || 0),
    0
  )

  const totalFat = meals.reduce(
    (sum, meal) => sum + Number(meal.total_nutrition?.fat || 0),
    0
  )

  const totalFiber = meals.reduce(
    (sum, meal) => sum + Number(meal.total_nutrition?.fiber || 0),
    0
  )


  // =========================
  // AVERAGES
  // =========================

  const averageCalories =
    meals.length > 0
      ? totalCalories / meals.length
      : 0

  const averageProtein =
    meals.length > 0
      ? totalProtein / meals.length
      : 0


  // =========================
  // MOST LOGGED FOOD
  // =========================

  const foodCounts = {}

  meals.forEach((meal) => {

    const name = meal.foods?.[0]?.name || "Analyzed Meal"

    foodCounts[name] =
      (foodCounts[name] || 0) + 1

  })

  let mostLoggedFood = "None yet"

  let highestCount = 0

  Object.entries(foodCounts).forEach(
    ([food, count]) => {

      if (count > highestCount) {

        highestCount = count

        mostLoggedFood = food

      }

    }
  )


  // =========================
  // RECENT MEALS
  // =========================

  const recentMeals = meals.slice(0, 5)


  // =========================
  // INSIGHT MESSAGE
  // =========================

  let insightMessage =
    "Start logging meals to discover patterns in your food data."

  if (meals.length > 0) {

    insightMessage =
      `You have logged ${meals.length} meal${
        meals.length === 1 ? "" : "s"
      }. Your average logged meal contains approximately ${
        Math.round(averageCalories)
      } kcal and ${
        averageProtein.toFixed(1)
      } g of protein.`

  }


  return (

    <div className="min-h-screen bg-slate-950 text-white">

      {/* NAVBAR */}

      <nav className="border-b border-slate-800 px-8 py-5 flex justify-between items-center">

        <Link
          to="/"
          className="text-2xl font-bold"
        >
          Meal<span className="text-green-400">Lens</span>
        </Link>

        <div className="flex gap-6">

          <Link
            to="/dashboard"
            className="text-slate-300 hover:text-white"
          >
            Dashboard
          </Link>

          <Link
            to="/analyze"
            className="text-slate-300 hover:text-white"
          >
            Analyze
          </Link>

          <Link
            to="/history"
            className="text-slate-300 hover:text-white"
          >
            History
          </Link>

        </div>

      </nav>


      {/* MAIN */}

      <main className="max-w-7xl mx-auto px-6 py-12">

        <p className="text-green-400 font-semibold">
          MealLens Analytics 📈
        </p>

        <h1 className="text-4xl font-bold mt-2">
          Your Insights
        </h1>

        <p className="text-slate-400 mt-2">
          Understand your logged nutrition data.
        </p>


        {/* LOADING */}

        {loading && (

          <div className="mt-10 text-slate-400">
            Loading insights...
          </div>

        )}


        {/* ERROR */}

        {error && (

          <div className="mt-10 bg-red-950 border border-red-800 text-red-300 rounded-xl p-5">
            {error}
          </div>

        )}


        {!loading && !error && (

          <>

            {/* =========================
                OVERVIEW
            ========================== */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">


              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <p className="text-slate-400 text-sm">
                  Meals Logged
                </p>

                <p className="text-3xl font-bold mt-2">
                  {meals.length}
                </p>

              </div>


              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <p className="text-slate-400 text-sm">
                  Avg Calories / Meal
                </p>

                <p className="text-3xl font-bold mt-2">
                  {Math.round(averageCalories)}
                </p>

                <p className="text-slate-500 text-sm">
                  kcal
                </p>

              </div>


              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <p className="text-slate-400 text-sm">
                  Avg Protein / Meal
                </p>

                <p className="text-3xl font-bold mt-2">
                  {averageProtein.toFixed(1)}
                </p>

                <p className="text-slate-500 text-sm">
                  grams
                </p>

              </div>


              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <p className="text-slate-400 text-sm">
                  Most Logged Food
                </p>

                <p className="text-xl font-bold mt-3">
                  {mostLoggedFood}
                </p>

                {highestCount > 0 && (

                  <p className="text-slate-500 text-sm mt-1">
                    Logged {highestCount} time
                    {highestCount === 1 ? "" : "s"}
                  </p>

                )}

              </div>

            </div>


            {/* =========================
                NUTRITION SUMMARY
            ========================== */}

            <div className="grid lg:grid-cols-2 gap-6 mt-8">


              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">

                <h2 className="text-2xl font-bold">
                  Nutrition Summary 🥗
                </h2>

                <p className="text-slate-400 mt-1">
                  Total nutrition from your logged meals.
                </p>


                <div className="space-y-5 mt-8">


                  <div>

                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Calories
                      </span>

                      <span className="font-bold">
                        {Math.round(totalCalories)} kcal
                      </span>

                    </div>

                    <div className="h-2 bg-slate-800 rounded-full mt-2">

                      <div
                        className="h-2 bg-green-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            totalCalories / 10,
                            100
                          )}%`
                        }}
                      />

                    </div>

                  </div>


                  <div>

                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Protein
                      </span>

                      <span className="font-bold">
                        {totalProtein.toFixed(1)} g
                      </span>

                    </div>

                    <div className="h-2 bg-slate-800 rounded-full mt-2">

                      <div
                        className="h-2 bg-blue-400 rounded-full"
                        style={{
                          width: `${Math.min(
                            totalProtein,
                            100
                          )}%`
                        }}
                      />

                    </div>

                  </div>


                  <div>

                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Carbohydrates
                      </span>

                      <span className="font-bold">
                        {totalCarbs.toFixed(1)} g
                      </span>

                    </div>

                    <div className="h-2 bg-slate-800 rounded-full mt-2">

                      <div
                        className="h-2 bg-yellow-400 rounded-full"
                        style={{
                          width: `${Math.min(
                            totalCarbs / 2,
                            100
                          )}%`
                        }}
                      />

                    </div>

                  </div>


                  <div>

                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Fat
                      </span>

                      <span className="font-bold">
                        {totalFat.toFixed(1)} g
                      </span>

                    </div>

                    <div className="h-2 bg-slate-800 rounded-full mt-2">

                      <div
                        className="h-2 bg-orange-400 rounded-full"
                        style={{
                          width: `${Math.min(
                            totalFat,
                            100
                          )}%`
                        }}
                      />

                    </div>

                  </div>


                  <div>

                    <div className="flex justify-between">

                      <span className="text-slate-400">
                        Fiber
                      </span>

                      <span className="font-bold">
                        {totalFiber.toFixed(1)} g
                      </span>

                    </div>

                    <div className="h-2 bg-slate-800 rounded-full mt-2">

                      <div
                        className="h-2 bg-purple-400 rounded-full"
                        style={{
                          width: `${Math.min(
                            totalFiber * 2,
                            100
                          )}%`
                        }}
                      />

                    </div>

                  </div>

                </div>

              </div>


              {/* INSIGHT CARD */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">

                <h2 className="text-2xl font-bold">
                  MealLens Insight 💡
                </h2>

                <div className="mt-8 bg-slate-800 rounded-xl p-6">

                  <div className="text-4xl">
                    🧠
                  </div>

                  <p className="text-lg leading-relaxed mt-4">
                    {insightMessage}
                  </p>

                </div>


                <div className="mt-6 bg-slate-800 rounded-xl p-6">

                  <p className="text-slate-400 text-sm">
                    Important
                  </p>

                  <p className="text-slate-300 mt-2 text-sm leading-relaxed">
                    Nutrition values are estimates based on
                    logged food data and database matches.
                    They should be treated as informational,
                    not as medical advice.
                  </p>

                </div>

              </div>

            </div>


            {/* =========================
                RECENT DATA
            ========================== */}

            <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-8">

              <div className="flex justify-between items-center">

                <div>

                  <h2 className="text-2xl font-bold">
                    Recent Nutrition Data
                  </h2>

                  <p className="text-slate-400 mt-1">
                    Your latest logged meals.
                  </p>

                </div>

                <Link
                  to="/history"
                  className="text-green-400 hover:text-green-300"
                >
                  View history →
                </Link>

              </div>


              {recentMeals.length === 0 ? (

                <div className="text-center py-10">

                  <div className="text-5xl">
                    📊
                  </div>

                  <p className="text-slate-400 mt-4">
                    No data available yet.
                  </p>

                </div>

              ) : (

                <div className="overflow-x-auto mt-6">

                  <table className="w-full text-left">

                    <thead>

                      <tr className="border-b border-slate-800">

                        <th className="py-4 text-slate-400 font-medium">
                          Food
                        </th>

                        <th className="py-4 text-slate-400 font-medium">
                          Calories
                        </th>

                        <th className="py-4 text-slate-400 font-medium">
                          Protein
                        </th>

                        <th className="py-4 text-slate-400 font-medium">
                          Carbs
                        </th>

                        <th className="py-4 text-slate-400 font-medium">
                          Fat
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {recentMeals.map(
                        (meal) => (
                          (() => {
                            const nutrition = meal.total_nutrition || {}

                            return (

                          <tr
                            key={meal.id}
                            className="border-b border-slate-800"
                          >

                            <td className="py-4 font-semibold">
                              {meal.foods?.[0]?.name || "Analyzed Meal"}
                            </td>

                            <td className="py-4">
                              {Number(nutrition.calories || 0).toFixed(0)} kcal
                            </td>

                            <td className="py-4">
                              {Number(nutrition.protein || 0).toFixed(1)} g
                            </td>

                            <td className="py-4">
                              {Number(nutrition.carbs || 0).toFixed(1)} g
                            </td>

                            <td className="py-4">
                              {Number(nutrition.fat || 0).toFixed(1)} g
                            </td>

                          </tr>
                            )
                          })()

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>


            {/* BUTTON */}

            <div className="mt-8 text-center">

              <Link
                to="/analyze"
                className="inline-block bg-green-500 text-black font-bold px-8 py-3 rounded-lg hover:bg-green-400"
              >
                📷 Analyze Another Meal
              </Link>

            </div>

          </>

        )}

      </main>

    </div>

  )
}

export default Insights