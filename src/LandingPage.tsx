import App from './App';
import './marketing.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <div className="background-elements">
          <div className="glow-orb orb-1"></div>
          <div className="glow-orb orb-2"></div>
          <div className="glow-orb orb-3"></div>
      </div>

      <header className="navbar glassmorphism">
          <div className="logo">Cultivate Study</div>
          <nav>
              <ul>
                  <li><a href="#parallax-features">Features</a></li>
                  <li><a href="#about">About</a></li>
              </ul>
          </nav>
          <a href="#" className="cta-btn small">Get Early Access</a>
      </header>

      <main>
          <section className="hero">
              <div className="hero-container-centered">
                  <div className="hero-content-top">
                      <h1 className="hero-gradient-text">Transform Your Gospel Study</h1>
                      <p>Experience seamless <strong>scripture scrolling</strong>, connect with others through <strong>Come, Follow Me groups</strong>, and lock in knowledge with advanced <strong>memorization tools</strong>.</p>
                      <div style={{ marginTop: '30px' }}>
                          <a href="#" className="cta-btn" style={{ fontSize: '1.1rem', padding: '15px 40px' }}>
                            Sign Up for Beta
                          </a>
                          <div style={{ marginTop: '16px', color: 'var(--text-tertiary)', fontSize: '0.9rem', fontWeight: 500 }}>
                              Coming soon to iOS & Android
                          </div>
                      </div>
                  </div>

                  <div className="hero-content-bottom">
                      <div className="interactive-hint">
                          <span className="pulse-dot"></span>
                          Try the live interactive demo below
                      </div>
                      <div className="phone-frame-centered">
                          <div className="phone-notch"></div>
                          <div className="phone-screen-container">
                              <div className="ios-status-bar">
                                  <div className="time">9:41</div>
                                  <div className="icons">
                                      <svg width="18" height="12" viewBox="0 0 18 12" fill="white" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2" width="14" height="8" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="16" y="4" width="2" height="4" rx="1" fill="white"/><rect x="3" y="4" width="10" height="4" rx="1" fill="white"/></svg>
                                  </div>
                              </div>
                              <App />
                          </div>
                      </div>
                  </div>
              </div>
          </section>

          <section className="features-grid-section">
              <div className="features-grid">
                  <div className="feature-card glassmorphism">
                      <div className="icon">📖</div>
                      <h2>Distraction-Free Reading</h2>
                      <p>Immerse yourself in the text. Our clean, focused reading view lets you highlight, save notes, link related scriptures, and share insights seamlessly.</p>
                  </div>
                  
                  <div className="feature-card glassmorphism">
                      <div className="icon">📚</div>
                      <h2>Study Plan Bundles</h2>
                      <p>Curate, combine, and conquer your materials. Build comprehensive study plans combining the Book of Mormon, General Conference talks, and your own study goals.</p>
                  </div>
                  
                  <div className="feature-card glassmorphism">
                      <div className="icon">🧠</div>
                      <h2>Smart Memorization</h2>
                      <p>Master key concepts and scriptures faster. Our Spaced Repetition System automatically tracks your progression stages and optimizes your review schedules.</p>
                  </div>

                  <div className="feature-card glassmorphism">
                      <div className="icon">👥</div>
                      <h2>Come, Follow Me Groups</h2>
                      <p>Study together. Create or join groups, synchronize your daily reading progress, and share your spiritual reflections with friends and family.</p>
                  </div>

                  <div className="feature-card glassmorphism">
                      <div className="icon">🏆</div>
                      <h2>Streaks & Achievements</h2>
                      <p>Stay motivated and build lasting habits. Track your daily consistency, monitor your reading streaks, and celebrate your spiritual milestones.</p>
                  </div>

                  <div className="feature-card glassmorphism">
                      <div className="icon">📝</div>
                      <h2>Integrated Notes</h2>
                      <p>Capture your thoughts as you study. Instantly attach personal notes and journal entries directly to specific verses or study plans for easy reference.</p>
                  </div>
              </div>
          </section>

          <section className="bottom-cta">
              <h2 className="gradient-text">Ready to transform your study habits?</h2>
              <a href="#" className="cta-btn">Sign Up for Beta Now</a>
          </section>
      </main>

      <footer className="footer">
          <p>&copy; 2026 Cultivate Study. All rights reserved.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '20px', maxWidth: '700px', margin: '20px auto 0', lineHeight: 1.5 }}>
              Cultivate Study is an independent application and is not affiliated with, nor officially supported or endorsed by, The Church of Jesus Christ of Latter-day Saints.
          </p>
      </footer>
    </div>
  );
}
