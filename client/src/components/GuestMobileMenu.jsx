import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { SignInButton } from "@clerk/clerk-react";

const GuestMobileMenu = ({ isMenuOpen, setIsMenuOpen }) => {
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
            className="fixed inset-0 top-13 z-40 transition-opacity duration-300 animate-in fade-in"
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
              <Link
                to="/problems"
                onClick={() => setIsMenuOpen(false)}
                className="menu-item-animate py-3 px-4 rounded-lg transition text-slate-300 hover:bg-slate-800 hover:text-slate-50"
                style={{
                  animationDelay: "0s",
                }}
              >
                Problems
              </Link>
              <Link
                to="/contests"
                onClick={() => setIsMenuOpen(false)}
                className="menu-item-animate py-3 px-4 rounded-lg transition text-slate-300 hover:bg-slate-800 hover:text-slate-50"
                style={{
                  animationDelay: "0s",
                }}
              >
                Contests
              </Link>

              <div className="flex flex-col gap-3 w-full mt-4 menu-item-animate" style={{ animationDelay: "0.08s" }}>
                <SignInButton mode="modal">
                  <button className="w-full rounded-lg border border-white/30 px-4 py-3 text-slate-50 transition duration-200 hover:border-cyan-400/60 hover:bg-slate-800">
                    Sign In
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="w-full rounded-lg border-none bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 px-6 py-3 transition duration-200">
                    Get Started
                  </button>
                </SignInButton>
              </div>
            </div>
          </nav>
        </>
      )}
    </>
  );
};

export default GuestMobileMenu;
