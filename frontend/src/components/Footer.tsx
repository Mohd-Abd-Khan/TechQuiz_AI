import React from 'react';
import { Code, ExternalLink, Terminal } from 'lucide-react';

const Footer: React.FC = () => {
  const techTags = [
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Node.js / Express',
    'MongoDB / Mongoose',
    'Gemini 2.5 Flash',
    'Puppeteer PDF',
    'Framer Motion',
  ];

  return (
    <footer className="bg-[#0d0f1a] border-t border-white/[0.06] w-full mt-auto relative z-10">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Section 1: Project Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-black tracking-wider text-glow bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                TechQuiz AI
              </h3>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
              An advanced cognitive developer learning platform utilizing generative AI for automated practice quiz generation, interactive AI tutoring, and server-side PDF study guide compilation.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {techTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 text-[10px] font-medium border border-purple-500/15 bg-purple-500/5 text-purple-300 rounded-full hover:bg-purple-500/15 hover:border-purple-500/40 hover:text-white transition-all duration-200 cursor-default"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Section 2: Developer Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              DEVELOPER
            </h4>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white tracking-wide">
                Mohd Abdullah Khan
              </p>
              <p className="text-xs text-purple-400 font-semibold">
                Full Stack Developer
              </p>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-xs">
              Passionate about building scalable systems, highly polished user interfaces, and reliable API services.
            </p>
          </div>

          {/* Section 3: Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              LINKS
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/Mohd-Abd-Khan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 text-xs text-gray-400 hover:text-purple-400 transition-colors duration-200 w-fit cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 group-hover:scale-110 transition-transform duration-200"
                  >
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                  <span>GitHub Profile</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/mohd-abdullah-khan-18407537b/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 text-xs text-gray-400 hover:text-purple-400 transition-colors duration-200 w-fit cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 group-hover:scale-110 transition-transform duration-200"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect width="4" height="12" x="2" y="9" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                  <span>LinkedIn Profile</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </a>
              </li>
              <li>
                <span
                  className="group flex items-center gap-2.5 text-xs text-gray-500 hover:text-gray-400 transition-colors duration-200 w-fit cursor-default"
                  title="Source code repo details available post-launch"
                >
                  <Code className="w-4 h-4" />
                  <span>Source Code (Private Repo)</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer Bar */}
        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center text-[10px] sm:text-xs text-gray-500 gap-4">
          <div className="font-medium">
            &copy; 2026 - Mohd Abdullah Khan. All rights reserved.
          </div>
          <div className="flex items-center gap-1 font-semibold tracking-wider uppercase">
            Designed &amp; Developed by <span className="text-purple-400/80 hover:text-purple-400 transition-colors duration-200">MAK</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
