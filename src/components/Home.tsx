import { Settings, Edit3, Sparkles, Play, ChevronRight, Sprout } from 'lucide-react';

export default function Home({ onContinueReading }: { onContinueReading?: () => void }) {
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <div style={{ padding: '60px 20px 90px 20px', height: '100%' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <Sprout size={14} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              CULTIVATE
            </h2>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-1px' }}>
            Good {greeting()}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <IconButton icon={<Sparkles size={16} color="var(--text-secondary)" />} disabled />
          <IconButton icon={<Edit3 size={16} color="var(--text-secondary)" />} disabled />
          <IconButton icon={<Settings size={16} color="var(--text-secondary)" />} disabled />
        </div>
      </div>

      {/* Streak */}
      <div style={{ marginBottom: '16px' }}>
        <div className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Current Streak
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
            12 Days
          </div>
        </div>
      </div>

      {/* Daily Reflection */}
      <div style={{ marginBottom: '22px' }}>
        <div className="glass" style={{ padding: '18px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Daily Reflection
          </div>
          <p style={{ fontSize: '0.9rem', fontStyle: 'italic', fontFamily: 'Georgia, serif', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '4px' }}>
            "The light shines in the darkness, and the darkness has not overcome it."
          </p>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>
            John 1:5
          </div>
        </div>
      </div>

      {/* Continue Reading */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-secondary)' }}>
            Continue Reading
          </h3>
        </div>
        <button 
          onClick={onContinueReading}
          className="glass" 
          style={{ padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '14px', width: '100%', textAlign: 'left' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
              NEW TESTAMENT
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '2px' }}>
              Matthew 5
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Gospel Principles Plan
            </div>
          </div>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '17px',
            backgroundColor: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Play size={16} fill="white" color="white" style={{ marginLeft: '2px' }} />
          </div>
        </button>
      </div>

      {/* Active Plans */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-secondary)' }}>
            Active Plans
          </h3>
          <ChevronRight size={18} color="var(--text-secondary)" />
        </div>
        <div className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, flex: 1 }}>Gospel Principles</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>14 days left</div>
          </div>
          
          <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginBottom: '10px', overflow: 'hidden' }}>
            <div style={{ width: '45%', height: '100%', backgroundColor: 'var(--accent-primary)', borderRadius: '3px' }} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>45% Complete</div>
            <div style={{ 
              borderRadius: '14px', 
              padding: '6px 12px', 
              border: '1px solid rgba(108, 92, 231, 0.4)',
              color: 'var(--accent-primary)',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              Due Today
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function IconButton({ icon, disabled }: { icon: React.ReactNode, disabled?: boolean }) {
  return (
    <button 
      disabled={disabled}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '18px',
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      {icon}
    </button>
  );
}
