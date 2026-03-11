import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import ComparisonDashboard from './components/ComparisonDashboard';
import DataExplorer from './components/DataExplorer';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-white">
        {/* Header */}
        <header className="border-b border-zinc-800 bg-zinc-900">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Rails Perf Lab</h1>
              <p className="text-xs text-zinc-500">API Performance Optimization Showcase</p>
            </div>
            <nav className="flex gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-2 rounded text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`
                }
              >
                Performance
              </NavLink>
              <NavLink
                to="/data"
                className={({ isActive }) =>
                  `px-4 py-2 rounded text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`
                }
              >
                Data Explorer
              </NavLink>
            </nav>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<ComparisonDashboard />} />
            <Route path="/data" element={<DataExplorer />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
