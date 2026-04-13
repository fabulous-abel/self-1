import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail, Phone, MapPin, Send } from 'lucide-react'

export default function LandingPage() {
  return (
    <div style={styles.root}>
      {/* Navigation */}
      <nav style={styles.navbar}>
        <div style={styles.navContainer}>
          <div style={styles.logoWrap}>
            <div style={styles.logoCircle}>L</div>
            <span style={styles.logoText}>LinkEt Admin</span>
          </div>
          <Link to="/login" style={styles.loginBtn}>
            Sign In <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.heroText}>
            <div style={styles.tag}>Smart Operations</div>
            <h1 style={styles.title}>The Future of <span style={styles.gradientText}>Intelligent</span> Transport.</h1>
            <p style={styles.subtitle}>
              Representing excellence in fleet management, real-time dispatch, and passenger satisfaction. 
              The ultimate workspace for modern transportation logistics.
            </p>
            <div style={styles.heroActions}>
              <Link to="/login" style={styles.primaryBtn}>Get Started</Link>
              <a href="#contact" style={styles.secondaryBtn}>Contact Us</a>
            </div>
          </div>
          <div style={styles.heroGraphic}>
            <div style={styles.imageCard}>
              <img 
                src="/company_hero.png" 
                alt="LinkEt Company Representation" 
                style={styles.heroImage}
              />
              <div style={styles.imageOverlay} />
            </div>
          </div>
        </div>
      </header>

      {/* Contact Section */}
      <section id="contact" style={styles.contactSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Get in Touch</h2>
          <p style={styles.sectionSubtitle}>Have questions? Our team is here to support your operations.</p>
        </div>
        
        <div style={styles.contactGrid}>
          <div style={styles.contactInfo}>
            <div style={styles.infoCard}>
              <div style={styles.infoIcon}><Mail size={20} /></div>
              <div>
                <div style={styles.infoLabel}>Email Us</div>
                <div style={styles.infoValue}>support@linket.app</div>
              </div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.infoIcon}><Phone size={20} /></div>
              <div>
                <div style={styles.infoLabel}>Call Us</div>
                <div style={styles.infoValue}>+1 (555) 000-LINK</div>
              </div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.infoIcon}><MapPin size={20} /></div>
              <div>
                <div style={styles.infoLabel}>Visit Us</div>
                <div style={styles.infoValue}>123 Innovation Dr, Tech Park</div>
              </div>
            </div>
          </div>

          <form style={styles.contactForm} onSubmit={(e) => e.preventDefault()}>
            <div style={styles.formRow}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <input type="text" placeholder="John Doe" style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input type="email" placeholder="john@example.com" style={styles.input} />
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Message</label>
              <textarea placeholder="How can we help?" style={{...styles.input, height: 120, resize: 'none'}} />
            </div>
            <button style={styles.submitBtn}>
              Send Message <Send size={16} />
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>&copy; 2024 LinkEt Global Inc. All rights reserved.</p>
      </footer>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#020617',
    color: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
    scrollBehavior: 'smooth',
  },
  navbar: {
    padding: '24px 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  navContainer: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 36,
    height: 36,
    background: 'linear-gradient(135deg, #0ea5e9, #2dd4bf)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: 20,
    color: 'white',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  loginBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  hero: {
    padding: '80px 0',
    maxWidth: 1200,
    margin: '0 auto',
    padding: '80px 24px',
  },
  heroContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 60,
    alignItems: 'center',
  },
  tag: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: 999,
    background: 'rgba(14, 165, 233, 0.1)',
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: 20,
  },
  title: {
    fontSize: 56,
    fontWeight: 900,
    lineHeight: 1.1,
    margin: '0 0 24px 0',
  },
  gradientText: {
    background: 'linear-gradient(90deg, #38bdf8, #2dd4bf)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 1.6,
    color: '#94a3b8',
    marginBottom: 40,
    maxWidth: 500,
  },
  heroActions: {
    display: 'flex',
    gap: 16,
  },
  primaryBtn: {
    padding: '14px 28px',
    borderRadius: 12,
    background: '#0ea5e9',
    color: 'white',
    textDecoration: 'none',
    fontWeight: 700,
    boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.4)',
  },
  secondaryBtn: {
    padding: '14px 28px',
    borderRadius: 12,
    background: 'transparent',
    color: 'white',
    textDecoration: 'none',
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  heroGraphic: {
    position: 'relative',
  },
  imageCard: {
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  heroImage: {
    width: '100%',
    display: 'block',
  },
  imageOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(2, 6, 23, 0.6), transparent)',
  },
  contactSection: {
    padding: '100px 24px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: 60,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: 800,
    marginBottom: 16,
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 16,
  },
  contactGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: 40,
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  infoCard: {
    padding: 24,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(14, 165, 233, 0.1)',
    color: '#0ea5e9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: 600,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: 700,
  },
  contactForm: {
    padding: 40,
    borderRadius: 24,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
  },
  input: {
    padding: '12px 16px',
    borderRadius: 10,
    background: 'rgba(2, 6, 23, 0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    fontSize: 14,
    outline: 'none',
  },
  submitBtn: {
    padding: '14px',
    borderRadius: 10,
    background: '#0ea5e9',
    color: 'white',
    border: 'none',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footer: {
    padding: '40px 24px',
    textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    color: '#64748b',
    fontSize: 14,
  },
}
