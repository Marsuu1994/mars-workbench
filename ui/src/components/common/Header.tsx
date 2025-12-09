export const Header = () => {
  return (
    <header className="navbar border-b border-base-200 bg-base-100/80">
      <div className="flex-1">
        <a className="btn btn-ghost text-lg font-semibold tracking-tight">
          <span className="text-success">AI</span> Chat Lab
        </a>
      </div>
      <nav className="hidden items-center gap-2 sm:flex">
        <a href="#features" className="btn btn-ghost btn-sm">
          Features
        </a>
        <a href="#stack" className="btn btn-ghost btn-sm">
          Stack
        </a>
        <a href="#cta" className="btn btn-success btn-sm text-black">
          Start
        </a>
      </nav>
      <div className="sm:hidden">
        <details className="dropdown dropdown-end">
          <summary className="btn btn-ghost btn-square">
            <span className="sr-only">Open navigation</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </summary>
          <ul className="menu dropdown-content menu-sm rounded-box bg-base-200 p-2 shadow">
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#stack">Stack</a>
            </li>
            <li>
              <a href="#cta">Start</a>
            </li>
          </ul>
        </details>
      </div>
    </header>
  );
};
