import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-lowest py-8 sm:py-10 md:py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="internconPH Logo" className="h-8 w-auto object-contain shrink-0 transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
            <div className="flex flex-col text-left">
              <span className="text-lg font-bold tracking-tight leading-tight text-on-surface">
                interncon<span className="text-[#F59E0B]">ph</span>
              </span>
              <span className="text-[9px] font-semibold tracking-wider text-teal-500 uppercase leading-none mt-0.5">
                INTERNSHIP CONNECTIVITY
              </span>
            </div>
          </Link>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Connecting aspiring Philippine students with accredited industry employers and leading universities.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-on-surface text-sm uppercase tracking-wider mb-4">Platform</h4>
          <ul className="space-y-2 text-sm text-on-surface-variant">
            <li><Link to="/#how-it-works" className="hover:text-vibrant-orange transition-colors">How It Works</Link></li>
            <li><Link to="/#opportunities" className="hover:text-vibrant-orange transition-colors">Find Internships</Link></li>
            <li><Link to="/#for-students" className="hover:text-vibrant-orange transition-colors">For Students</Link></li>
            <li><Link to="/#for-organizations" className="hover:text-vibrant-orange transition-colors">For Organizations</Link></li>
            <li><Link to="/#policies" className="hover:text-vibrant-orange transition-colors">Policies & Compliance</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-on-surface text-sm uppercase tracking-wider mb-4">Join</h4>
          <ul className="space-y-2 text-sm text-on-surface-variant">
            <li><Link to="/register/student" className="hover:text-vibrant-orange transition-colors">Register as Student</Link></li>
            <li><Link to="/register/organization" className="hover:text-vibrant-orange transition-colors">Partner as Employer</Link></li>
            <li><Link to="/register/institution" className="hover:text-vibrant-orange transition-colors">Accredit Institution</Link></li>
            <li><Link to="/login" className="hover:text-vibrant-orange transition-colors">Member Sign In</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-on-surface text-sm uppercase tracking-wider mb-4">Contact</h4>
          <p className="text-sm text-on-surface-variant">support@interncon.ph</p>
          <p className="text-sm text-on-surface-variant mt-1">+63 (02) 8123-4567</p>
          <p className="text-sm text-on-surface-variant mt-1">Metro Manila, Philippines</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-outline-variant text-center text-xs text-on-surface-variant">
        <p>&copy; {new Date().getFullYear()} InternConPH. Built for Philippine Higher Education and Industry Partners.</p>
      </div>
    </footer>
  );
}
