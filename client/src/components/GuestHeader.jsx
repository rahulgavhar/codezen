import React, { useState } from "react";
import { Link } from "react-router-dom";
import { SignInButton } from "@clerk/clerk-react";
import { RxCross1 } from "react-icons/rx";
import { CiMenuFries } from "react-icons/ci";
import GuestMobileMenu from "./GuestMobileMenu";

const GuestHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  return (
    <div className="relative">
      <nav className="sticky top-0 z-20 backdrop-blur border-b border-white/10 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg font-semibold tracking-tight"
          >
            <span className="grid h-8 sm:h-10 w-8 sm:w-10 place-items-center rounded-lg sm:rounded-xl bg-cyan-500/20 text-cyan-300 font-mono text-xs sm:text-base">
              &gt;_
            </span>
            <span className="text-slate-50 sm:inline">Codezen</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
            <Link
              to="/problems"
              className="text-slate-300 transition hover:text-slate-50 hidden sm:block"
            >
              Problems
            </Link>
            <Link
              to="/contests"
              className="text-slate-300 transition hover:text-slate-50 hidden sm:block"
            >
              Contests
            </Link>
            <SignInButton mode="modal">
              <button className="rounded-full border border-white/30 px-3 sm:px-4 py-1.5 sm:py-2 text-slate-50 transition hover:border-cyan-400/60 hover:bg-white/5 hidden sm:block">
                Sign In
              </button>
            </SignInButton>
            <SignInButton mode="modal">
              <button className="btn btn-xs sm:btn-sm rounded-full max-[600px]:hidden border-none bg-cyan-500 text-slate-950 hover:bg-cyan-400 px-3 sm:px-6">
                Get Started
              </button>
            </SignInButton>
            <button
              onClick={toggleMenu}
              className="sm:hidden text-slate-300 transition hover:text-slate-50 ml-2"
            >
              {isMenuOpen ? <RxCross1 size={24} /> : <CiMenuFries size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <GuestMobileMenu isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
    </div>
  );
};

export default GuestHeader;
