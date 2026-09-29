import { Link } from "react-router-dom"
function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Navbar */}

      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-800">

        <h1 className="text-2xl font-bold">
          Meal<span className="text-green-400">Lens</span>
        </h1>

        <div className="flex items-center gap-8">

          <a href="#features" className="text-slate-300 hover:text-white">
            Features
          </a>

          <a href="#how-it-works" className="text-slate-300 hover:text-white">
            How it works
          </a>

          <Link to="/login"className="px-5 py-2 rounded-lg border border-slate-600 hover:bg-slate-800">
                Login
          </Link>

          <Link to="/register"className="px-5 py-2 rounded-lg bg-green-500 text-black font-semibold hover:bg-green-400">
                 Get Started
          </Link>

        </div>

      </nav>


      {/* Hero Section */}

      <section className="px-8 py-24 text-center">

        <div className="max-w-4xl mx-auto">

          <p className="text-green-400 font-semibold mb-4">
            AI-POWERED NUTRITION
          </p>

          <h2 className="text-5xl md:text-7xl font-bold leading-tight">
            Understand your food
            <span className="text-green-400"> at a glance.</span>
          </h2>

          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
            Upload a photo of your meal and MealLens uses AI to identify
            your food and estimate its nutritional information.
          </p>

          <div className="mt-10 flex justify-center gap-4">

            <Link to="/analyze" className="px-8 py-4 rounded-xl border border-slate-700 text-lg hover:bg-slate-900">
                Analyze a Meal
            </Link>

            <Link to="/dashboard" className="px-8 py-4 rounded-xl border border-slate-700 text-lg hover:bg-slate-900">
              Explore Dashboard
            </Link>

          </div>

        </div>

      </section>


      {/* Features */}

      <section id="features" className="px-8 py-20 bg-slate-900">

        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">

            <p className="text-green-400 font-semibold">
              FEATURES
            </p>

            <h2 className="text-4xl font-bold mt-3">
              Your food, understood.
            </h2>

          </div>


          <div className="grid md:grid-cols-3 gap-6">


            {/* Feature 1 */}

            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800">

              <div className="text-4xl mb-5">
                📸
              </div>

              <h3 className="text-xl font-bold mb-3">
                AI Food Analysis
              </h3>

              <p className="text-slate-400">
                Upload a meal photo and let AI identify the food and
                estimate its portion.
              </p>

            </div>


            {/* Feature 2 */}

            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800">

              <div className="text-4xl mb-5">
                📊
              </div>

              <h3 className="text-xl font-bold mb-3">
                Nutrition Breakdown
              </h3>

              <p className="text-slate-400">
                See calories, protein, carbohydrates, fat, fiber,
                sugar and sodium in one place.
              </p>

            </div>


            {/* Feature 3 */}

            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800">

              <div className="text-4xl mb-5">
                🧠
              </div>

              <h3 className="text-xl font-bold mb-3">
                Smart Insights
              </h3>

              <p className="text-slate-400">
                Discover patterns in your meals and get useful
                AI-generated insights.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* How It Works */}

      <section id="how-it-works" className="px-8 py-20">

        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">

            <p className="text-green-400 font-semibold">
              HOW IT WORKS
            </p>

            <h2 className="text-4xl font-bold mt-3">
              Three simple steps.
            </h2>

          </div>


          <div className="grid md:grid-cols-3 gap-8">


            <div className="text-center">

              <div className="w-16 h-16 mx-auto rounded-full bg-green-500 text-black flex items-center justify-center text-2xl font-bold">
                1
              </div>

              <h3 className="text-xl font-bold mt-5">
                Upload
              </h3>

              <p className="text-slate-400 mt-3">
                Take a photo or upload an image of your meal.
              </p>

            </div>


            <div className="text-center">

              <div className="w-16 h-16 mx-auto rounded-full bg-green-500 text-black flex items-center justify-center text-2xl font-bold">
                2
              </div>

              <h3 className="text-xl font-bold mt-5">
                Analyze
              </h3>

              <p className="text-slate-400 mt-3">
                MealLens identifies your food and estimates its nutrition.
              </p>

            </div>


            <div className="text-center">

              <div className="w-16 h-16 mx-auto rounded-full bg-green-500 text-black flex items-center justify-center text-2xl font-bold">
                3
              </div>

              <h3 className="text-xl font-bold mt-5">
                Understand
              </h3>

              <p className="text-slate-400 mt-3">
                View your nutrition breakdown and track your meals over time.
              </p>

            </div>


          </div>

        </div>

      </section>


      {/* CTA */}

      <section className="px-8 py-24 bg-green-500 text-black text-center">

        <h2 className="text-4xl font-bold">
          See what's really on your plate.
        </h2>

        <p className="mt-4 text-lg">
          Turn a simple food photo into useful nutrition insights.
        </p>

        <button className="mt-8 px-8 py-4 rounded-xl bg-black text-white font-bold hover:bg-slate-900">
          Start Analyzing
        </button>

      </section>


      {/* Footer */}

      <footer className="px-8 py-8 bg-slate-950 text-center text-slate-500">

        <p>
          © 2026 MealLens. Built with React, AI and a suspicious amount of coffee ☕
        </p>

      </footer>

    </div>
  )
}

export default Home