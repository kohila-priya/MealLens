import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import api from "../api"

function Analyze() {
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [image, setImage] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleImage = (e) => {
    const selectedFile = e.target.files[0]

    if (!selectedFile) return

    setFile(selectedFile)
    setImage(URL.createObjectURL(selectedFile))
    setResult(null)
    setError("")
  }

  const analyzeMeal = async () => {
    if (!file) {
      setError("Please upload an image first.")
      return
    }

    let user

    try {
      user = JSON.parse(localStorage.getItem("user"))
    } catch {
      localStorage.removeItem("user")
      navigate("/login")
      return
    }

    if (!user) {
      navigate("/login")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    const formData = new FormData()

    formData.append("image", file)
    formData.append("user_id", user.id)

    try {
      const response = await api.post("/meals/analyze", formData)

      setResult(response.data)

    } catch (error) {
      console.error(error)

      if (error.response) {
        if (error.response.status === 429) {
          setError(
            "AI analysis limit reached. Please try again later."
          )
        } else {
          setError(
            error.response.data?.error ||
            error.response.data?.message ||
            "Analysis failed."
          )
        }
      } else if (error.code === "ECONNABORTED") {
        setError(
          "Analysis timed out. The AI service may be busy; please try again."
        )
      } else {
        setError(
          "Could not connect to MealLens backend."
        )
      }

    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = () => {
    if (result?.total_nutrition) {
      return result.total_nutrition
    }

    if (!result?.nutrition_results) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0
      }
    }

    return result.nutrition_results.reduce(
      (total, food) => {
        total.calories += Number(
          food.nutrition?.calories || 0
        )

        total.protein += Number(
          food.nutrition?.protein || 0
        )

        total.carbs += Number(
          food.nutrition?.carbs || 0
        )

        total.fat += Number(
          food.nutrition?.fat || 0
        )

        total.fiber += Number(
          food.nutrition?.fiber || 0
        )

        total.sugar += Number(
          food.nutrition?.sugar || 0
        )

        total.sodium += Number(
          food.nutrition?.sodium || 0
        )

        return total
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0
      }
    )
  }

  const totals = calculateTotals()

  const formatNutrition = (value, decimals = 1) => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return "N/A"
    }

    return Number(value).toFixed(decimals)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      <nav className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <Link
            to="/dashboard"
            className="text-2xl font-bold text-green-400"
          >
            MealLens
          </Link>

          <div className="flex items-center gap-6 text-sm">
            <Link
              to="/dashboard"
              className="text-slate-300 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              to="/history"
              className="text-slate-300 hover:text-white"
            >
              History
            </Link>

            <Link
              to="/profile"
              className="text-slate-300 hover:text-white"
            >
              Profile
            </Link>
          </div>

        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-10">

        <div className="mb-10">
          <h1 className="text-4xl font-bold">
            Analyze Your Meal 🍽️
          </h1>

          <p className="mt-2 text-slate-400">
            Upload a food image and MealLens will analyze
            the visible foods and estimate their nutrition.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h2 className="mb-5 text-xl font-semibold">
              Upload Food Image
            </h2>

            <label className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center hover:border-green-500">

              {image ? (
                <img
                  src={image}
                  alt="Selected food"
                  className="max-h-64 rounded-xl object-contain"
                />
              ) : (
                <>
                  <div className="mb-4 text-5xl">
                    📷
                  </div>

                  <p className="text-lg font-medium">
                    Choose a food image
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    JPG, PNG or other supported image
                  </p>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                className="hidden"
              />

            </label>

            <button
              onClick={analyzeMeal}
              disabled={loading || !file}
              className="mt-6 w-full rounded-xl bg-green-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Analyzing..."
                : "Analyze Meal"}
            </button>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h2 className="mb-5 text-xl font-semibold">
              Analysis Result
            </h2>

            {!result && !loading && (
              <div className="flex min-h-[280px] items-center justify-center text-center text-slate-500">
                <div>
                  <div className="mb-3 text-4xl">
                    🍴
                  </div>

                  <p>
                    Your nutrition analysis will appear here.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex min-h-[280px] items-center justify-center text-center">
                <div>
                  <div className="mb-4 text-4xl">
                    🔍
                  </div>

                  <p className="text-lg font-medium">
                    Analyzing your meal...
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Identifying foods and calculating nutrition.
                  </p>
                </div>
              </div>
            )}

            {result && (
              <div>

                <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                  <p className="font-semibold text-green-400">
                    ✓ Meal analyzed and saved
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    This meal has been automatically added
                    to your History.
                  </p>
                </div>

                <h3 className="mb-4 text-lg font-semibold">
                  Total Meal Nutrition
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                  <div className="rounded-xl bg-slate-950 p-4">
                    <p className="text-sm text-slate-500">
                      Calories
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {Number(totals.calories || 0).toFixed(0)}
                      <span className="ml-1 text-sm font-normal text-slate-500">
                        kcal
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-4">
                    <p className="text-sm text-slate-500">
                      Protein
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {Number(totals.protein || 0).toFixed(1)}
                      <span className="ml-1 text-sm font-normal text-slate-500">
                        g
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-4">
                    <p className="text-sm text-slate-500">
                      Carbs
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {Number(totals.carbs || 0).toFixed(1)}
                      <span className="ml-1 text-sm font-normal text-slate-500">
                        g
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-4">
                    <p className="text-sm text-slate-500">
                      Fat
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {Number(totals.fat || 0).toFixed(1)}
                      <span className="ml-1 text-sm font-normal text-slate-500">
                        g
                      </span>
                    </p>
                  </div>

                </div>

                <h3 className="mb-4 mt-8 text-lg font-semibold">
                  Detected Foods
                </h3>

                <div className="space-y-4">

                  {result.nutrition_results?.map(
                    (food, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div>
                            <h4 className="font-semibold">
                              {food.name}
                            </h4>

                            <p className="mt-1 text-sm text-slate-500">
                              Estimated portion:{" "}
                              {food.portion_grams} g
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              USDA match confidence:{" "}
                              {Number(food.confidence || 0)}%
                              {Number(food.confidence || 0) < 60
                                ? " (low)"
                                : ""}
                            </p>

                          </div>

                          {food.nutrition && (
                            <span className="text-sm text-green-400">
                              {formatNutrition(food.nutrition.calories, 0)}{" "}
                              kcal
                            </span>
                          )}

                        </div>

                        {food.nutrition && (
                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">

                            <div>
                              <span className="text-slate-500">
                                Protein
                              </span>

                              <p className="font-medium">
                                {formatNutrition(food.nutrition.protein)}{" "}
                                g
                              </p>
                            </div>

                            <div>
                              <span className="text-slate-500">
                                Carbs
                              </span>

                              <p className="font-medium">
                                {formatNutrition(food.nutrition.carbs)}{" "}
                                g
                              </p>
                            </div>

                            <div>
                              <span className="text-slate-500">
                                Fat
                              </span>

                              <p className="font-medium">
                                {formatNutrition(food.nutrition.fat)}{" "}
                                g
                              </p>
                            </div>

                            <div>
                              <span className="text-slate-500">
                                Fiber
                              </span>

                              <p className="font-medium">
                                {formatNutrition(food.nutrition.fiber)}{" "}
                                g
                              </p>
                            </div>

                          </div>
                        )}

                      </div>
                    )
                  )}

                </div>

                <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <p className="font-semibold text-yellow-400">
                    🟢 Structurally good, 🟡 accuracy still needs verification.
                  </p>

                  <p className="mt-2 text-sm leading-5 text-slate-400">
                    Nutrition values are estimates based on image analysis,
                    estimated portions, and USDA food data. They should not
                    be treated as exact medical or dietary measurements.
                  </p>
         
                </div>
                

              </div>
            )}

          </div>

        </div>

      </main>

    </div>
  )
}

export default Analyze