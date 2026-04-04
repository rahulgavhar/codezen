import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useSelector } from "react-redux";

const MobileMenu = ({ isMenuOpen, setIsMenuOpen }) => {
  const { user } = useUser();
  const reduxProfile = useSelector((state) => state.user?.profile);
  
  // Use Redux profile username, fallback to Clerk username, then to ''
  const username = reduxProfile?.username || user?.username || '';
  const isStaff = reduxProfile?.app_role === 'staff';
  
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (isMenuOpen) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    } else {
      html.style.overflow = "";
      body.style.overflow = "";
    }

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
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
        { label: "Jobs", path: "/jobs/recommendations" },
        { label: "Practice", path: "/problems" },
        { label: "IDE", path: "/ide" },
        { label: "Profile", path: `/profile/${username}` },
        { label: "/health", path: "/judge0-health" },
      ];

  return (
    <>
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
          position: absolute;
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

      {isMenuOpen && (
        <>
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 top-12.5 z-40 transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Slide-in Menu from Right */}
          <nav
            className="mobile-menu absolute right-0 backdrop-blur-2xl top-12.5 h-[calc(100vh-50px)] w-full sm:hidden z-50 border-l border-white/10"
            style={{
              animation: "slideInFromRight 0.3s ease-out forwards",
            }}
          >
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
              {menuItems.map((item, index) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`py-3 px-4 rounded-lg transition menu-item-animate ${
                    item.label === "/health"
                      ? "text-cyan-300 hover:bg-slate-800 hover:text-slate-50"
                      : "text-slate-300 hover:bg-slate-800 hover:text-slate-50"
                  }`}
                  style={{
                    animationDelay: `${index * 0.08}s`,
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </>
  );
};

export default MobileMenu;
