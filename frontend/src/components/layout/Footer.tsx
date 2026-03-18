import { Link } from 'react-router-dom';

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Search', to: '/search' },
  { label: 'Sports', to: '/sports' },
  { label: 'Leaving Soon', to: '/leaving-soon' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Brand */}
          <Link to="/" className="text-lg font-bold text-brand-600 hover:text-brand-700 transition">
            WatchWhere
          </Link>

          {/* Nav */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-gray-500 hover:text-gray-900 transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-sm text-gray-400">
            &copy; {year} WatchWhere. All rights reserved.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Streaming data is updated regularly but may not reflect real-time availability.
          Prices and availability are subject to change.
        </p>
      </div>
    </footer>
  );
}
