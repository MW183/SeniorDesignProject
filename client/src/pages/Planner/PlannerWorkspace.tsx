import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PlannerTasks from './PlannerTasks';
import WeddingDetailsEditor from '../../components/WeddingDetailsEditor';
import VendorEditor from '../../components/VendorEditor';

export default function PlannerWorkspace({ currentUser }: { currentUser?: any }) {
  const { weddingId } = useParams<{ weddingId?: string }>();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isNarrowScreen, setIsNarrowScreen] = useState(window.innerWidth < 1200);

  // Handle sidebar opening on narrow screens (only one open at a time)
    const handleRightSidebarToggle = () => {
    if (isNarrowScreen && leftSidebarOpen) {
      setLeftSidebarOpen(false);
    }
    setRightSidebarOpen(!rightSidebarOpen);
  };


  const handleLeftSidebarToggle = () => {
    if (isNarrowScreen && rightSidebarOpen) {
      setRightSidebarOpen(false);
    }
    setLeftSidebarOpen(!leftSidebarOpen);
  };



  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      const narrow = window.innerWidth < 1200;
      setIsMobile(mobile);
      setIsNarrowScreen(narrow);
      // Close sidebars on mobile, or close right sidebar on narrow screens
      if (mobile) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      } else if (narrow) {
        setRightSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On initial load, handle narrow screen
  useEffect(() => {
    if (isNarrowScreen && !isMobile) {
      setRightSidebarOpen(false);
    }
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
    <div className="w-auto flex bg-background min-h-[calc(100vh-120px)]">
      {/* Left Sidebar - Wedding Details */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden bg-background border-r flex flex-col shrink-0 ${
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
      <div className="flex-1 overflow-auto bg-background min-w-0 w-full"> 
        <div className="max-w-7xl mx-auto w-full px-4 py-6 md:px-6 md:py-8">
          <PlannerTasks currentUser={currentUser} hideBackButton={true} />
        </div>
      </div>

      {/* Right Sidebar - Vendors */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden bg-background border-l flex flex-col shrink-0 ${
          rightSidebarOpen ? 'w-80' : 'w-12'
        }`}
      >
        {rightSidebarOpen && weddingId && (
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground sticky top-0">Vendors</h3>
            <VendorEditor weddingId={weddingId} />
          </div>
        )}
      </div>

      {/* Left Toggle Button - Fixed Position */}
      <button
        onClick={handleLeftSidebarToggle}
        className="w-6 h-12 flex items-center justify-center hover:bg-primary/80 transition-discrete duration-300 ease-in-out text-primary-foreground bg-primary fixed top-1/2  z-50 rounded-r"
        title={leftSidebarOpen ? 'Hide wedding details' : 'Show wedding details'}
        style={{ left: leftSidebarOpen ? '320px' : '48px' }}
      >
        {leftSidebarOpen ? '◄' : '►'}
      </button>

      {/* Right Toggle Button - Fixed Position */}
      <button
        onClick={handleRightSidebarToggle}
        className="w-6 h-12 flex items-center justify-center hover:bg-primary/80 transition-discrete duration-300 ease-in-out text-primary-foreground bg-primary fixed top-1/2  z-50 rounded-l"
        title={rightSidebarOpen ? 'Hide vendors' : 'Show vendors'}
        style={{ right: rightSidebarOpen ? '320px' : '48px' }}
      >
        {rightSidebarOpen ? '►' : '◄'}
      </button>
    </div>
  );
}
