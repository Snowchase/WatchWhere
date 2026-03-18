import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/sports', label: 'Sports', exact: false },
  { to: '/leaving-soon', label: 'Leaving Soon', exact: false },
];

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery('');
      setMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          className="flex-shrink-0 text-xl font-bold text-brand-600 hover:text-brand-700 transition"
        >
          WatchWhere
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop search */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-sm ml-auto"
        >
          <div className="relative w-full">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles…"
              className="input-base pl-9 pr-3 py-1.5 text-sm"
            />
          </div>
        </form>

        {/* Auth section */}
        <div className="hidden md:flex items-center gap-2 ml-2">
          {isAuthenticated ? (
            <>
              <NavLink
                to="/watchlist"
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                Watchlist
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                Settings
              </NavLink>
              <div className="flex items-center gap-2 ml-2 border-l border-gray-200 pl-4">
                <span className="text-sm text-gray-500 truncate max-w-[140px]">
                  {user?.email}
                </span>
                <button onClick={handleLogout} className="btn-secondary py-1.5 text-xs">
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <Link to="/settings" className="btn-primary py-1.5 text-xs">
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="ml-auto md:hidden rounded-md p-2 text-gray-500 hover:bg-gray-100 transition"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 pb-4 md:hidden">
          <form onSubmit={handleSearchSubmit} className="mt-3">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search titles…"
                className="input-base pl-9"
              />
            </div>
          </form>
          <nav className="mt-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated && (
              <>
                <NavLink
                  to="/watchlist"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  Watchlist
                </NavLink>
                <NavLink
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  Settings
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="mt-2 btn-secondary w-full justify-center text-sm"
                >
                  Sign out
                </button>
              </>
            )}
            {!isAuthenticated && (
              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="mt-2 btn-primary w-full justify-center text-sm"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
