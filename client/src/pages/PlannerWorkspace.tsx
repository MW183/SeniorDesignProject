import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import PlannerTasks from './PlannerTasks';
import WeddingDetailsEditor from '../components/WeddingDetailsEditor';
import VendorEditor from '../components/VendorEditor';

export default function PlannerWorkspace({ currentUser }: { currentUser?: any }) {
  const { weddingId } = useParams<{ weddingId?: string }>();
  const navigate = useNavigate();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isNarrowScreen, setIsNarrowScreen] = useState(window.innerWidth < 1200);

  // Handle sidebar opening on narrow screens (only one open at a time)
  const handleLeftSidebarToggle = () => {
    if (isNarrowScreen && rightSidebarOpen) {
      setRightSidebarOpen(false);
    }
    setLeftSidebarOpen(!leftSidebarOpen);
  };

  const handleRightSidebarToggle = () => {
    if (isNarrowScreen && leftSidebarOpen) {
      setLeftSidebarOpen(false);
    }
    setRightSidebarOpen(!rightSidebarOpen);
  };

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      const narrow = window.innerWidth < 1200;
      setIsMobile(mobile);
      setIsNarrowScreen(narrow);
      // Close sidebars on mobile
      if (mobile) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile view - tasks only
  if (isMobile) {
    return (
      <div className="w-full">
        <PlannerTasks currentUser={currentUser} />
      </div>
    );
  }

  // Desktop view - three column layout with flexible sizing
  return (
    <div className="w-full flex bg-slate-900 min-h-[calc(100vh-120px)]">
      {/* Left Sidebar - Wedding Details */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 ${
          leftSidebarOpen ? 'w-80' : 'w-12'
        }`}
      >
        {leftSidebarOpen && weddingId && (
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <WeddingDetailsEditor
              weddingId={weddingId}
              currentUser={currentUser}
              showTitle={true}
            />
          </div>
        )}
      </div>
        
      {/* Center - Tasks (Main Content) */}
      <div className="flex-1 overflow-auto bg-slate-900 min-w-0 w-full"> 
        <div className="max-w-7xl mx-auto w-full px-4 py-6 md:px-6 md:py-8">
          <PlannerTasks currentUser={currentUser} hideBackButton={true} />
        </div>
      </div>

      {/* Right Sidebar - Vendors */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden bg-slate-800 border-l border-slate-700 flex flex-col shrink-0 ${
          rightSidebarOpen ? 'w-80' : 'w-12'
        }`}
      >
        {rightSidebarOpen && weddingId && (
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 sticky top-0">Vendors</h3>
            <VendorEditor weddingId={weddingId} />
          </div>
        )}
      </div>

      {/* Left Toggle Button - Fixed Position */}
      <button
        onClick={handleLeftSidebarToggle}
        className="w-6 h-12 flex items-center justify-center hover:bg-slate-600 transition text-white bg-slate-700 fixed top-1/2 -translate-y-1/2 z-50 rounded-r border border-l-0 border-slate-700"
        title={leftSidebarOpen ? 'Hide wedding details' : 'Show wedding details'}
        style={{ left: leftSidebarOpen ? '320px' : '48px' }}
      >
        {leftSidebarOpen ? '◄' : '►'}
      </button>

      {/* Right Toggle Button - Fixed Position */}
      <button
        onClick={handleRightSidebarToggle}
        className="w-6 h-12 flex items-center justify-center hover:bg-slate-600 transition text-white bg-slate-700 fixed top-1/2 -translate-y-1/2 z-50 rounded-l border border-r-0 border-slate-700"
        title={rightSidebarOpen ? 'Hide vendors' : 'Show vendors'}
        style={{ right: rightSidebarOpen ? '320px' : '48px' }}
      >
        {rightSidebarOpen ? '►' : '◄'}
      </button>
    </div>
  );
}
