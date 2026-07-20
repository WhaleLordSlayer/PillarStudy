import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, GraduationCap, Search, Bookmark, Clock } from 'lucide-react';
import Home from './components/Home';
import Reader from './components/Reader';

type Tab = 'read' | 'study' | 'search' | 'saved' | 'log' | 'reader';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('read');
  const [autoPlaySwipeTrigger, setAutoPlaySwipeTrigger] = useState(0);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    let aborted = false;
    let currentTimeout: NodeJS.Timeout;

    const wait = (ms: number) => new Promise(resolve => {
      currentTimeout = setTimeout(resolve, ms);
    });

    const runSequence = async () => {
      if (userInteractedRef.current) return;
      
      // Initial idle delay before starting demo loop
      await wait(4000);
      
      while (!aborted && !userInteractedRef.current) {
        // Switch to Reader
        setActiveTab('reader');
        
        await wait(2000);
        if (aborted || userInteractedRef.current) break;
        setAutoPlaySwipeTrigger(prev => prev + 1);

        await wait(2000);
        if (aborted || userInteractedRef.current) break;
        setAutoPlaySwipeTrigger(prev => prev + 1);

        await wait(3000);
        if (aborted || userInteractedRef.current) break;
        // Switch back to Home
        setActiveTab('read');
        
        // Wait on Home before looping again
        await wait(4000);
      }
    };

    runSequence();

    return () => {
      aborted = true;
      clearTimeout(currentTimeout);
    };
  }, []);

  const handleInteraction = () => {
    userInteractedRef.current = true;
  };

  return (
    <div 
      className="app-container"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      onWheel={handleInteraction}
    >
      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'read' && <Home onContinueReading={() => setActiveTab('reader')} />}
        {activeTab === 'reader' && <Reader onClose={() => setActiveTab('read')} autoPlayTrigger={autoPlaySwipeTrigger} />}
        {activeTab === 'study' && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Study Hub</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Coming soon.</p>
          </div>
        )}
        {activeTab === 'search' && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Search</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Coming soon.</p>
          </div>
        )}
        {activeTab === 'saved' && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Saved</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Coming soon.</p>
          </div>
        )}
        {activeTab === 'log' && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Log</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Coming soon.</p>
          </div>
        )}
      </main>

      {/* Floating Pill Navigation */}
      {activeTab !== 'reader' && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
        <nav 
          className="glass"
          style={{
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            borderRadius: '32px',
            pointerEvents: 'auto',
            background: 'rgba(24, 24, 30, 0.62)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          }}
        >
          <NavButton 
            icon={<BookOpen size={24} />} 
            isActive={activeTab === 'read'} 
            onClick={() => setActiveTab('read')} 
          />
          <NavButton 
            icon={<GraduationCap size={24} />} 
            isActive={activeTab === 'study'} 
            onClick={() => {}} 
            disabled
          />
          <NavButton 
            icon={<Search size={24} />} 
            isActive={activeTab === 'search'} 
            onClick={() => {}} 
            disabled
          />
          <NavButton 
            icon={<Bookmark size={24} />} 
            isActive={activeTab === 'saved'} 
            onClick={() => {}} 
            disabled
          />
          <NavButton 
            icon={<Clock size={24} />} 
            isActive={activeTab === 'log'} 
            onClick={() => {}} 
            disabled
          />
        </nav>
      </div>
      )}
    </div>
  );
}

function NavButton({ icon, isActive, onClick, disabled }: { icon: React.ReactNode, isActive: boolean, onClick: () => void, disabled?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '11px 18px',
        margin: '0 2px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isActive ? 'var(--accent-primary)' : 'var(--text-tertiary)',
        backgroundColor: isActive ? 'rgba(132, 163, 136, 0.12)' : 'transparent',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {icon}
    </button>
  );
}
