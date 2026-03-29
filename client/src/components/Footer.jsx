import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-slate-900/50 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-50">Platform</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link to="/problems" className="hover:text-cyan-200">
                  Problem Bank
                </Link>
              </li>
              <li>
                <Link to="/ide" className="hover:text-cyan-200">
                  Code Editor
                </Link>
              </li>
              <li>
                <Link to="/judge0-health" className="hover:text-cyan-200">
                  System Status
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-50">Resources</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <a href="#" className="hover:text-cyan-200">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-200">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-200">
                  Tutorials
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-50">Company</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <a href="#" className="hover:text-cyan-200">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-200">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-200">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-50">Legal</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <a href="#" className="hover:text-cyan-200">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-200">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cyan-200">
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
          <p>© 2026 Codezen. Built for developers who code with purpose.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
