import { useId, type ReactNode } from 'react'
import { ArrowRight, BookOpen, Bookmark, Check, Layers, Library, Network, NotebookPen, Presentation, Users } from 'lucide-react'
import logo from './assets/cultivate-logo.svg?raw'

export function Brand() {
  const id = useId().replaceAll(':', '')
  return <a className="brand" href="./" aria-label="Cultivate home"><span className="brand-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: logo.replaceAll('cultivate-gradient-home', `cultivate-${id}`) }} /><span>Cultivate</span></a>
}

export function Button({ children, href, secondary = false }: { children: ReactNode; href: string; secondary?: boolean }) {
  return <a className={`button ${secondary ? 'secondary' : 'primary'}`} href={href}>{children}{!secondary && <ArrowRight size={15} aria-hidden="true" />}</a>
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children && <p>{children}</p>}</div>
}

type Screenshot = { src: string; alt: string; width: number; height: number }
export function ProductVisual({ children, className = '', caption = 'Conceptual product view', screenshot }: { children?: ReactNode; className?: string; caption?: string; screenshot?: Screenshot }) {
  return <figure className={`product-visual ${className}`}><div className="visual-surface">{screenshot ? <img {...screenshot} loading="lazy" /> : children}</div><figcaption>{caption}</figcaption></figure>
}

export function ReaderView({ compact = false }: { compact?: boolean }) {
  return <div className={`reader-view ${compact ? 'compact' : ''}`}><div className="ui-toolbar"><BookOpen size={15} /><span>JOHN 15</span><Bookmark size={14} /></div><div className="verse-content"><span className="ui-eyebrow">The Gospel according to John</span><h4>Abide in me.</h4><p><sup>4</sup> Abide in me, and I in you. As the branch cannot bear fruit of itself, except it abide in the vine; no more can ye, except ye abide in me.</p><p className="verse-highlight"><sup>5</sup> I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing.</p></div><div className="explorer-context"><div className="ui-eyebrow"><Network size={13} /> Explore from the text</div><span>People, places &amp; connections</span><div className="ui-chips"><span>Scripture Explorer</span><span>Related passages</span></div></div><div className="reader-tools"><span><Bookmark size={14} />Save</span><span><NotebookPen size={14} />Note</span><span><Network size={14} />Explore</span></div></div>
}

export function SpaceView({ compact = false }: { compact?: boolean }) {
  return <div className={`space-view ${compact ? 'compact' : ''}`}><div className="ui-toolbar"><Users size={16} /><span>STUDY SPACE</span><span className="privacy-chip">Private</span></div><h4>Your study space</h4><p className="ui-description">A shared direction for your family or class.</p><div className="space-stats"><div><span>Shared reading</span><strong>John 15</strong></div><div><span>Progress</span><strong>Together</strong></div><div><span>Rhythm</span><strong>At your pace</strong></div></div><div className="ui-block shared-reading"><span className="ui-eyebrow">Read together</span><h5>Abide in me</h5><p>One shared reading plan.<br />Room for everyone to keep growing.</p><div className="reading-track" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div><small>Cooperative progress, without rankings.</small></div><div className="ui-block thought-block"><span className="ui-eyebrow">Shared Thoughts</span><p>Share a note you choose to share.<br />Keep its scripture reference close.</p><span className="reference-chip">John 15:5</span></div><div className="ui-chips"><span>Reading</span><span>Together</span><span>Thoughts</span></div></div>
}

export function BuilderView({ compact = false }: { compact?: boolean }) {
  return <div className={`builder-view ${compact ? 'compact' : ''}`}><div className="ui-toolbar"><span className="toolbar-title"><NotebookPen size={16} /> Lesson Builder <span className="toolbar-divider">/</span> Abide in me</span><span className="draft-chip">Personal lesson</span></div><div className="builder-body"><div className="builder-canvas"><div className="ui-block"><span className="ui-eyebrow"><BookOpen size={12} /> Scripture passage</span><h4>John 15:5</h4><p className="scripture-sample">“I am the vine, ye are the branches…”</p><span className="reference-chip">Open the passage</span></div><div className="ui-block"><span className="ui-eyebrow"><Layers size={12} /> Question</span><h5>What does it mean to abide?</h5><p>A prompt to read, reflect, and discuss.</p></div><div className="ui-block saved-block"><span className="ui-eyebrow"><Bookmark size={12} /> Saved study</span><p>Bring a passage or a personal note into your lesson.</p></div></div><aside className="builder-aside"><span className="ui-eyebrow">Your lesson</span><div className="outline-item"><BookOpen size={13} /> Scripture</div><div className="outline-item"><Layers size={13} /> Question</div><div className="outline-item"><NotebookPen size={13} /> Saved study</div><div className="private-note"><span className="ui-eyebrow">Private teacher notes</span><p>Keep your teaching guidance just for you.</p></div><span className="ui-eyebrow developing-label">Shared &amp; Live modes<br />In development</span></aside></div></div>
}

export function Device({ kind, children, className = '' }: { kind: 'phone' | 'tablet'; children: ReactNode; className?: string }) {
  return <div className={`device device-${kind} ${className}`}><div className="device-screen">{children}</div></div>
}

export function HeroDevices() {
  return <figure className="hero-products"><div className="device-composition"><Device kind="phone" className="left-phone"><ReaderView compact /></Device><Device kind="tablet"><BuilderView compact /></Device><Device kind="phone" className="right-phone"><SpaceView compact /></Device></div><figcaption>Conceptual product views · Actual screenshots will replace these layouts.</figcaption></figure>
}

export function LessonParticipation() {
  return <div className="participation"><div className="participation-head"><div className="session-symbol"><Presentation size={20} /></div><div><h4>A lesson everyone can return to.</h4><span>Shared participation &amp; Live · In development</span></div><span className="ui-badge">Concept view</span></div><div className="participation-grid"><article><BookOpen size={17} /><span className="ui-eyebrow">01 / Shared lesson</span><h5>One starting point.</h5><p>A shared copy, opened through its own link or code.</p></article><article><Presentation size={17} /><span className="ui-eyebrow">02 / Live</span><h5>Follow along together.</h5><p>The lesson follows the teacher’s lead on participant devices.</p></article><article><Bookmark size={17} /><span className="ui-eyebrow">03 / After the session</span><h5>Come back to the text.</h5><p>Return to the shared lesson for study on your own time.</p></article></div><div className="participation-footer"><Check size={13} /> Teacher notes stay private. Sharing and Live require a connection.</div></div>
}

export function LibraryPreview() {
  return <div className="library-preview"><Library size={16} /><span>Passages</span><span>Notes</span><span>Highlights</span><span>Mastery</span></div>
}
