import { useState } from 'react';
import { UserPlus, Users, MessageSquare, ShieldCheck } from 'lucide-react';

export default function Groups() {
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <div style={{ padding: '24px 16px', height: '100%', overflowY: 'auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '8px' }}>Groups</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Study together, grow together.</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          style={{
            background: 'var(--accent-primary)',
            color: 'white',
            padding: '10px 16px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          <UserPlus size={18} />
          Invite
        </button>
      </div>

      {/* Group Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <GroupActivityCard 
          groupName="Morning Devotionals"
          time="2 hours ago"
          message="Sarah completed Day 4 of the Proverbs Plan."
          avatar="S"
        />
        <GroupActivityCard 
          groupName="Youth Ministry"
          time="5 hours ago"
          message="New group discussion opened: 'Faith in Action'"
          avatar="Y"
        />
        <GroupActivityCard 
          groupName="Family Study"
          time="1 day ago"
          message="Everyone has completed the weekly reading! 🎉"
          avatar="F"
        />
      </div>

      {/* Fake Invite Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div className="glass animate-fade-in" style={{
            width: '100%',
            maxWidth: '400px',
            borderRadius: 'var(--radius-lg)',
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              <ShieldCheck size={32} color="white" />
            </div>
            <h2 style={{ fontSize: '1.5rem' }}>Invite Friends</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              In the real app, you'd be able to sync your contacts or share a deep link to invite friends to your study group. 
            </p>
            <button 
              onClick={() => setShowInviteModal(false)}
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg-primary)',
                width: '100%',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupActivityCard({ groupName, time, message, avatar }: { groupName: string, time: string, message: string, avatar: string }) {
  return (
    <div className="glass" style={{
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      display: 'flex',
      gap: '16px',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        color: 'var(--accent-primary)',
        flexShrink: 0
      }}>
        {avatar}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{groupName}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{time}</span>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', opacity: 0.9, lineHeight: 1.4 }}>
          {message}
        </p>
      </div>
    </div>
  );
}
