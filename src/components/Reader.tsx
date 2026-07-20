import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Bookmark, Edit3, Share, GitBranch } from 'lucide-react';

interface ReaderProps {
  onClose: () => void;
  autoPlayTrigger?: number;
}

const verses = [
  { num: 1, text: "And seeing the multitudes, he went up into a mountain: and when he was set, his disciples came unto him:" },
  { num: 2, text: "And he opened his mouth, and taught them, saying," },
  { num: 3, text: "Blessed are the poor in spirit: for theirs is the kingdom of heaven." },
  { num: 4, text: "Blessed are they that mourn: for they shall be comforted." },
  { num: 5, text: "Blessed are the meek: for they shall inherit the earth." }
];

export default function Reader({ onClose, autoPlayTrigger = 0 }: ReaderProps) {
  const accentColor = '#6E93B0'; // New Testament Blue
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (autoPlayTrigger > 0) {
      setCurrentIndex(prev => Math.min(prev + 1, verses.length - 1));
    }
  }, [autoPlayTrigger]);
  
  // Wheel debounce logic
  const isWheeling = useRef(false);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (isWheeling.current) return;
    isWheeling.current = true;
    
    if (e.deltaY > 20 && currentIndex < verses.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (e.deltaY < -20 && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
    
    setTimeout(() => {
      isWheeling.current = false;
    }, 400); // 400ms debounce
  }, [currentIndex]);

  // Keyboard logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentIndex(prev => Math.min(prev + 1, verses.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Touch swipe logic
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    
    if (diff > 50 && currentIndex < verses.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (diff < -50 && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
    touchStartY.current = null;
  };

  return (
    <div style={{ 
      flex: 1,
      height: '100%', 
      width: '100%', 
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: 'var(--bg-primary)'
    }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Fixed Back Button */}
      <button 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '50px',
          left: '20px',
          width: '40px', height: '40px',
          borderRadius: '20px',
          backgroundColor: 'rgba(0,0,0,0.4)',
          border: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 50,
          cursor: 'pointer',
          color: 'white'
        }}
      >
        <ChevronLeft size={20} color="var(--text-primary)" />
      </button>

      {/* Swipe Container */}
      <div style={{
        height: '100%',
        width: '100%',
        transform: `translateY(-${currentIndex * 100}%)`,
        transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
      }}>
        {verses.map((v, index) => (
          <div 
            key={v.num}
            style={{
              position: 'relative',
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Background Gradient for each card */}
            <div 
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: `radial-gradient(circle at center, ${accentColor}1A 0%, transparent 60%)`,
                pointerEvents: 'none',
                zIndex: 0
              }}
            />

            {/* Chapter Badge (First Verse Only) */}
            {index === 0 && (
              <div style={{
                position: 'absolute',
                top: '70px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2,
              }}>
                <div style={{
                  padding: '5px 16px',
                  borderRadius: '20px',
                  backgroundColor: `${accentColor}18`,
                  border: `1px solid ${accentColor}50`,
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: accentColor }}>
                    Matthew 5
                  </span>
                </div>
              </div>
            )}

            {/* Verse Area */}
            <div style={{ 
              flex: 1, 
              width: '100%', 
              maxWidth: '480px', 
              padding: '120px 28px 16px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              position: 'relative',
              zIndex: 1
            }}>
              {/* Testament Pill */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '16px',
                  backgroundColor: `${accentColor}1A`,
                  border: `1px solid ${accentColor}33`
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '3px', backgroundColor: accentColor }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: accentColor }}>
                    New Testament
                  </span>
                </div>
              </div>

              {/* Verse Text */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: 700, 
                    color: 'var(--text-secondary)',
                    marginTop: '8px',
                    minWidth: '20px'
                  }}>
                    {v.num}
                  </span>
                  <p style={{
                    fontSize: '22px',
                    lineHeight: 1.7,
                    fontFamily: 'Georgia, serif',
                    color: 'var(--text-primary)',
                    letterSpacing: '0.1px',
                    margin: 0,
                    textAlign: 'left'
                  }}>
                    {v.text}
                  </p>
                </div>
              </div>

              {/* Bottom Metadata */}
              <div style={{ marginTop: 'auto', marginBottom: '20px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: accentColor, marginBottom: '8px' }}>
                  Matthew 5:{v.num}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {index + 1} of {verses.length}
                </div>
              </div>
            </div>

            {/* Footer Pill */}
            <div 
              className="glass"
              style={{
                width: 'calc(100% - 40px)',
                maxWidth: '440px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '12px 8px',
                borderRadius: '28px',
                background: 'rgba(24, 24, 30, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                marginBottom: '40px',
                zIndex: 2
              }}
            >
              <ActionButton icon={<Bookmark size={24} />} label="Save" />
              <ActionButton icon={<Edit3 size={24} />} label="Note" />
              <ActionButton icon={<GitBranch size={24} />} label="Link" />
              <ActionButton icon={<Share size={24} />} label="Share" />
            </div>

            {/* Swipe Hint */}
            <div style={{ position: 'absolute', bottom: '10px', width: '100%', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)' }}>
                Swipe to navigate
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
      <div style={{ color: 'var(--text-secondary)' }}>{icon}</div>
      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
    </button>
  );
}
