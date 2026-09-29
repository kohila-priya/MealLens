import React, { useEffect, useState } from "react";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  const [meals, setMeals] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    let parsedUser;

    try {
      parsedUser = JSON.parse(storedUser);
    } catch {
      localStorage.removeItem("user");
      navigate("/login");
      return;
    }

    if (!parsedUser?.id) {
      localStorage.removeItem("user");
      navigate("/login");
      return;
    }

    const fetchMeals = async () => {
      try {
        const response = await api.get(`/meals/${parsedUser.id}`);

        console.log("History response:", response.data);

        setMeals(response.data.history || []);
      } catch (error) {
        console.error("Error fetching meal history:", error);
      }
    };

    fetchMeals();
  }, [navigate]);

  const totalCalories = meals.reduce(
    (sum, meal) =>
      sum + Number(meal.total_nutrition?.calories || 0),
    0
  );

  const totalProtein = meals.reduce(
    (sum, meal) =>
      sum + Number(meal.total_nutrition?.protein || 0),
    0
  );

  const totalCarbs = meals.reduce(
    (sum, meal) =>
      sum + Number(meal.total_nutrition?.carbs || 0),
    0
  );

  const totalFat = meals.reduce(
    (sum, meal) =>
      sum + Number(meal.total_nutrition?.fat || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      <nav className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="text-2xl font-bold text-green-400">
            MealLens
          </Link>

          <div className="flex items-center gap-6 text-sm">
            <Link to="/history" className="text-slate-300 hover:text-white">
              History
            </Link>
            <Link to="/analyze" className="text-slate-300 hover:text-white">
              Analyze
            </Link>
            <Link to="/profile" className="text-slate-300 hover:text-white">
              Profile
            </Link>
            <button
              className="text-slate-400 hover:text-red-300"
              onClick={() => {
                localStorage.removeItem("user");
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex items-end justify-between gap-6">

        <div>
          <p className="font-semibold text-green-400">Your nutrition overview</p>
          <h1 className="mt-2 text-4xl font-bold">
            Welcome, {user?.name || "User"}
          </h1>

          <p className="mt-2 text-slate-400">
            Track your meals and nutrition with MealLens.
          </p>
        </div>
        </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm text-slate-400">Calories</h3>
          <p className="mt-2 text-2xl font-bold text-green-400">{Math.round(totalCalories)} kcal</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm text-slate-400">Protein</h3>
          <p className="mt-2 text-2xl font-bold">{totalProtein.toFixed(1)} g</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm text-slate-400">Carbs</h3>
          <p className="mt-2 text-2xl font-bold">{totalCarbs.toFixed(1)} g</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-sm text-slate-400">Fat</h3>
          <p className="mt-2 text-2xl font-bold">{totalFat.toFixed(1)} g</p>
        </div>

      </div>

      <section className="mt-10">

        <h2 className="text-2xl font-bold">Recent Meals</h2>

        {meals.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">No meals analyzed yet.</p>
            <Link to="/analyze" className="mt-5 inline-block rounded-lg bg-green-500 px-5 py-3 font-semibold text-slate-950 hover:bg-green-400">
              Analyze a Meal
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-3">

            {meals.map((meal) => {

              const nutrition = meal.total_nutrition || {};
              const firstFood = meal.foods?.[0];

              return (
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between" key={meal.id}>

                  <div>

                    <h3 className="font-semibold">
                      {firstFood?.name || "Analyzed Meal"}
                    </h3>

                    {meal.foods &&
                      meal.foods.length > 1 && (
                        <p className="mt-1 text-sm text-slate-400">
                          + {meal.foods.length - 1} more food
                          {meal.foods.length - 1 !== 1
                            ? "s"
                            : ""}
                        </p>
                      )}

                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">

                    <span>
                      🔥{" "}
                      {Math.round(
                        Number(nutrition.calories || 0)
                      )}{" "}
                      kcal
                    </span>

                    <span>
                      🥩{" "}
                      {Number(nutrition.protein || 0).toFixed(1)}
                      g protein
                    </span>

                    <span>
                      🍚{" "}
                      {Number(nutrition.carbs || 0).toFixed(1)}
                      g carbs
                    </span>

                    <span>
                      🥑{" "}
                      {Number(nutrition.fat || 0).toFixed(1)}
                      g fat
                    </span>

                  </div>

                </div>
              );
            })}

          </div>
        )}

      </section>

      <div
        className="mt-10 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-100"
      >

        <strong className="block text-yellow-300">
          Accuracy notice
        </strong>

        <p className="mt-2 text-yellow-100/70">
          Nutrition values are estimates based on image analysis,
          estimated portions, and USDA food data. They should not be
          treated as exact medical or dietary measurements.
        </p>

      </div>

      </main>
    </div>
  );
}

export default Dashboard;