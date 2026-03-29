import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import { RxCross1 } from "react-icons/rx";
import { CiMenuFries } from "react-icons/ci";
import MobileMenu from "./MobileMenu";
import { useSelector } from "react-redux";

const Header = () => {
  const { user, isSignedIn } = useUser();
  const reduxProfile = useSelector((state) => state.user?.profile);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Use Redux profile username, fallback to Clerk username, then to ''
  const username = reduxProfile?.username || user?.username || '';
  const isStaff = reduxProfile?.app_role === 'staff';

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  React.useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  const menuItems = isStaff
    ? [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Profile", path: "/staff/profile" },
        { label: "My Contests", path: "/staff/contests" },
        { label: "My Interviews", path: "/staff/interviews" },
        { label: "Problems", path: "/problems" },
        { label: "/health", path: "/judge0-health" },
      ]
    : [
        { label: "Dashboard", path: "/" },
        { label: "Contests", path: "/contests" },
        { label: "Practice", path: "/problems" },
        { label: "IDE", path: "/ide" },
        { label: "Profile", path: `/profile/${username}` },
        { label: "/health", path: "/judge0-health" },
      ];

  return (
    <div className="relative">
      <header className="sticky top-0 border-b border-white/10 bg-slate-950/80 backdrop-blur z-100">
        <style>{`
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes menuItemSlideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .menu-item-animate {
          animation: menuItemSlideIn 0.3s ease-out forwards;
        }
        
        .mobile-menu {
          position: relative;
        }
        
        .mobile-menu::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          background: transparent;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}</style>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg font-semibold tracking-tight"
          >
            <span className="grid h-8 sm:h-10 w-8 sm:w-10 place-items-center rounded-lg sm:rounded-xl bg-cyan-500/20 text-cyan-300 font-mono text-xs sm:text-base">
              &gt;_
            </span>
            <span className="text-slate-50">Codezen</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-3 sm:gap-6 text-sm font-medium">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`transition ${
                  item.label === "/health"
                    ? "text-cyan-300 hover:text-slate-50"
                    : "text-slate-300 hover:text-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <UserButton afterSignOutUrl="/" />
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="sm:hidden flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <button
              onClick={toggleMenu}
              className="text-slate-300 transition hover:text-slate-50"
            >
              {isMenuOpen ? <RxCross1 size={24} /> : <CiMenuFries size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
      </header>
      <MobileMenu
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        menuItems={menuItems}
      />
    </div>
  );
};

export default Header;
