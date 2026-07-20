import { BookOpen, CheckCircle, ChevronRight, Play } from 'lucide-react';

export default function StudyPlans() {
  return (
    <div style={{ padding: '24px 16px', height: '100%', overflowY: 'auto' }} className="animate-fade-in">
      <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '8px' }}>Study Plans</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Curate, combine, and conquer your materials.</p>

      {/* Active Plans */}
      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Active Plans</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <PlanCard 
          title="New Testament Foundations" 
          progress={45} 
          image="/assets/study_plan.png" 
          active={true}
        />
        <PlanCard 
          title="Daily Proverbs" 
          progress={12} 
          image="/assets/dashboard.png"
          active={true}
        />
      </div>

      {/* Discover / Available Bundles */}
      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Discover Bundles</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <DiscoverCard title="Old Testament" icon={<BookOpen size={24}/>} color="#e74c3c" />
        <DiscoverCard title="Gospel Principles" icon={<BookOpen size={24}/>} color="#3498db" />
        <DiscoverCard title="Prophets" icon={<BookOpen size={24}/>} color="#2ecc71" />
        <DiscoverCard title="Custom Plan" icon={<BookOpen size={24}/>} color="var(--accent-primary)" />
      </div>
    </div>
  );
}

function PlanCard({ title, progress, image, active }: { title: string, progress: number, image: string, active: boolean }) {
  return (
    <div className="glass" style={{
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: 'var(--radius-sm)',
        backgroundImage: `url(${image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        flexShrink: 0
      }} />
      
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--gradient-accent)', borderRadius: '3px' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{progress}%</span>
        </div>
      </div>

      <button style={{
        background: 'var(--accent-primary)',
        color: 'white',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Play size={18} fill="white" />
      </button>
    </div>
  );
}

function DiscoverCard({ title, icon, color }: { title: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="glass" style={{
      borderRadius: 'var(--radius-md)',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      textAlign: 'center',
      cursor: 'pointer'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: `${color}20`, /* 20% opacity */
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {icon}
      </div>
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{title}</span>
    </div>
  );
}
