import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Mail, Phone, MapPin, Send, 
  Code, Smartphone, Layout, Server, CheckCircle, Zap
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div style={styles.root}>
      {/* Navigation */}
      <nav style={styles.navbar}>
        <div style={styles.navContainer}>
          <div style={styles.logoWrap}>
            <div style={styles.logoCircle}>
              <Code size={20} color="white" />
            </div>
            <span style={styles.logoText}>LinkEt Web Solutions</span>
          </div>
          <div style={styles.navLinks}>
            <a href="#services" style={styles.navLink}>Services</a>
            <a href="#packages" style={styles.navLink}>Packages</a>
            <a href="#contact" style={styles.navLink}>Contact</a>
            <Link to="/login" style={styles.loginBtn}>
              Client Login <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={styles.hero}>
        <div style={styles.heroBackground}>
          <div style={styles.blob1}></div>
          <div style={styles.blob2}></div>
        </div>
        <div style={styles.heroContent}>
          <div style={styles.heroText}>
            <div style={styles.tag}><Zap size={14} /> Modern Web Development</div>
            <h1 style={styles.title}>Crafting Digital <span style={styles.accentText}>Experiences</span> That Inspire.</h1>
            <p style={styles.subtitle}>
              We build fast, responsive, and beautifully designed web applications. 
              Elevate your digital presence with our cutting-edge development services.
            </p>
            <div style={styles.heroActions}>
              <a href="#packages" style={styles.primaryBtn}>Explore Packages</a>
              <a href="#services" style={styles.secondaryBtn}>Our Services</a>
            </div>
          </div>
          <div style={styles.heroGraphic}>
            <div style={styles.heroCardsContainer}>
              {/* Graphic representation of code / web view */}
              <div style={styles.graphicCardMain}>
                <div style={styles.browserHeader}>
                  <div style={{display: 'flex', gap: 6}}>
                    <div style={{...styles.browserDot, background: '#ff5f56'}}></div>
                    <div style={{...styles.browserDot, background: '#ffbd2e'}}></div>
                    <div style={{...styles.browserDot, background: '#27c93f'}}></div>
                  </div>
                </div>
                <div style={styles.browserBody}>
                  <div style={styles.codeLine}><span style={{color: '#F39C12'}}>const</span> <span style={{color: '#4CB8B8'}}>company</span> = <span style={{color: '#F39C12'}}>"LinkEt"</span>;</div>
                  <div style={styles.codeLine}><span style={{color: '#F39C12'}}>const</span> <span style={{color: '#4CB8B8'}}>focus</span> = <span style={{color: '#F39C12'}}>"Web Excellence"</span>;</div>
                  <div style={styles.codeLine}><br/></div>
                  <div style={styles.codeLine}><span style={{color: '#F39C12'}}>function</span> <span style={{color: '#4CB8B8'}}>innovate</span>() {'{'}</div>
                  <div style={{...styles.codeLine, paddingLeft: 20}}><span style={{color: '#F39C12'}}>return</span> <span style={{color: '#1D6964'}}>createFuture</span>();</div>
                  <div style={styles.codeLine}>{'}'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Services Section */}
      <section id="services" style={styles.sectionLight}>
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <div style={{...styles.tag, background: 'rgba(29, 105, 100, 0.1)', color: '#1D6964'}}>What We Do</div>
            <h2 style={{...styles.sectionTitle, color: '#0f172a'}}>Our Premium Services</h2>
            <p style={{...styles.sectionSubtitle, color: '#64748b'}}>Comprehensive solutions to bring your vision to absolute reality.</p>
          </div>
          
          <div style={styles.servicesGrid}>
            {[
              { icon: <Layout />, title: "Web Design", desc: "Stunning, user-centric interfaces tailored to your brand identity." },
              { icon: <Code />, title: "Custom Development", desc: "Robust and scalable web applications built with modern tools." },
              { icon: <Smartphone />, title: "Mobile Friendly", desc: "Responsive designs that look perfect on any device or screen." },
              { icon: <Server />, title: "Backend Systems", desc: "Secure and fast server-side architectures to power your apps." },
            ].map((srv, i) => (
              <div key={i} style={styles.serviceCard}>
                <div style={styles.serviceIcon}>{srv.icon}</div>
                <h3 style={styles.serviceTitle}>{srv.title}</h3>
                <p style={styles.serviceDesc}>{srv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section id="packages" style={styles.sectionDark}>
        <div style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <div style={styles.tag}>Pricing</div>
            <h2 style={styles.sectionTitle}>Development Packages</h2>
            <p style={styles.sectionSubtitle}>Choose the perfect plan for your project's scale and needs.</p>
          </div>

          <div style={styles.packagesGrid}>
            {[
              {
                title: "Starter",
                price: "Basic",
                desc: "Perfect for personal sites and small businesses.",
                features: ["5 Page Website", "Responsive Design", "Contact Form", "Basic SEO", "1 Month Support"],
                highlight: false
              },
              {
                title: "Professional",
                price: "Standard",
                desc: "Ideal for growing companies needing web apps.",
                features: ["Custom Web App", "Database Integration", "User Authentication", "Advanced SEO", "Analytics Dashboard", "3 Months Support"],
                highlight: true
              },
              {
                title: "Enterprise",
                price: "Premium",
                desc: "Full-scale solution for established enterprises.",
                features: ["Complex Architecture", "Mobile App Native", "Custom API Systems", "High Scalability", "Dedicated Team", "24/7 Priority Support"],
                highlight: false
              }
            ].map((pkg, i) => (
              <div key={i} style={pkg.highlight ? styles.packageCardHit : styles.packageCard}>
                {pkg.highlight && <div style={styles.popularBadge}>Most Popular</div>}
                <h3 style={{...styles.pkgTitle, color: pkg.highlight ? '#ffffff' : '#0f172a'}}>{pkg.title}</h3>
                <div style={{...styles.pkgPrice, color: pkg.highlight ? '#F39C12' : '#1D6964'}}>{pkg.price}</div>
                <p style={{...styles.pkgDesc, color: pkg.highlight ? '#cbd5e1' : '#64748b'}}>{pkg.desc}</p>
                <div style={styles.pkgFeatures}>
                  {pkg.features.map((f, idx) => (
                    <div key={idx} style={{...styles.featureItem, color: pkg.highlight ? '#f8fafc' : '#334155'}}>
                      <CheckCircle size={16} color={pkg.highlight ? '#F39C12' : '#1D6964'} />
                      {f}
                    </div>
                  ))}
                </div>
                <button style={pkg.highlight ? styles.pkgBtnPrimary : styles.pkgBtnSecondary}>
                  Select Package
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" style={styles.contactSection}>
        <div style={styles.sectionHeader}>
          <div style={{...styles.tag, background: 'rgba(29, 105, 100, 0.1)', color: '#1D6964'}}>Reach Out</div>
          <h2 style={{...styles.sectionTitle, color: '#0f172a'}}>Let's Build Together</h2>
          <p style={{...styles.sectionSubtitle, color: '#64748b'}}>Ready to start your project? We are just a message away.</p>
        </div>
        
        <div style={styles.contactGrid}>
          <div style={styles.contactInfo}>
            <div style={styles.infoCard}>
              <div style={styles.infoIcon}><Mail size={20} /></div>
              <div>
                <div style={styles.infoLabel}>Email Us</div>
                <div style={styles.infoValue}>hello@linketweb.com</div>
              </div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.infoIcon}><Phone size={20} /></div>
              <div>
                <div style={styles.infoLabel}>Call Us</div>
                <div style={styles.infoValue}>+1 (555) 123-4567</div>
              </div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.infoIcon}><MapPin size={20} /></div>
              <div>
                <div style={styles.infoLabel}>Visit Us</div>
                <div style={styles.infoValue}>Studio 42, Tech District</div>
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
              <label style={styles.label}>Project Details</label>
              <textarea placeholder="Tell us about what you want to build..." style={{...styles.input, height: 120, resize: 'none'}} />
            </div>
            <button style={styles.submitBtn}>
              Send Proposal Request <Send size={16} />
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.logoWrap}>
            <div style={{...styles.logoCircle, background: '#334155'}}>
              <Code size={16} color="white" />
            </div>
            <span style={{...styles.logoText, fontSize: 16}}>LinkEt Web Solutions</span>
          </div>
          <p style={{marginTop: 12}}>&copy; 2026 LinkEt. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontFamily: "'Inter', system-ui, sans-serif",
    scrollBehavior: 'smooth',
  },
  navbar: {
    padding: '20px 0',
    position: 'fixed',
    width: '100%',
    top: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  },
  navContainer: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 32,
  },
  navLink: {
    color: '#334155',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 15,
    transition: 'color 0.2s',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 40,
    height: 40,
    background: 'linear-gradient(135deg, #1D6964, #124a46)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(29, 105, 100, 0.3)',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.5px',
  },
  loginBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 999,
    background: '#1D6964',
    color: 'white',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  hero: {
    position: 'relative',
    padding: '160px 0 100px',
    background: '#041615',
    color: '#ffffff',
    overflow: 'hidden',
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  blob1: {
    position: 'absolute',
    top: '-20%',
    left: '-10%',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(29, 105, 100, 0.4) 0%, transparent 70%)',
    borderRadius: '50%',
    filter: 'blur(60px)',
  },
  blob2: {
    position: 'absolute',
    bottom: '-20%',
    right: '-10%',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(243, 156, 18, 0.2) 0%, transparent 70%)',
    borderRadius: '50%',
    filter: 'blur(80px)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: 60,
    alignItems: 'center',
  },
  heroText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 999,
    background: 'rgba(243, 156, 18, 0.15)',
    color: '#F39C12',
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: 24,
    border: '1px solid rgba(243, 156, 18, 0.3)',
  },
  title: {
    fontSize: 64,
    fontWeight: 900,
    lineHeight: 1.1,
    margin: '0 0 24px 0',
    letterSpacing: '-1px',
  },
  accentText: {
    color: '#F39C12',
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 1.6,
    color: '#94a3b8',
    marginBottom: 40,
    maxWidth: 540,
  },
  heroActions: {
    display: 'flex',
    gap: 16,
  },
  primaryBtn: {
    padding: '16px 32px',
    borderRadius: 12,
    background: '#F39C12',
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: 700,
    boxShadow: '0 10px 25px -5px rgba(243, 156, 18, 0.4)',
    fontSize: 16,
    transition: 'transform 0.2s',
  },
  secondaryBtn: {
    padding: '16px 32px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    textDecoration: 'none',
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: 16,
    backdropFilter: 'blur(10px)',
  },
  heroGraphic: {
    position: 'relative',
    perspective: '1000px',
  },
  graphicCardMain: {
    background: '#0f172a',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(29, 105, 100, 0.5)',
    overflow: 'hidden',
    transform: 'rotateY(-5deg) rotateX(5deg)',
    transition: 'transform 0.3s ease',
  },
  browserHeader: {
    background: '#1e293b',
    padding: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  browserDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
  },
  browserBody: {
    padding: '24px',
    fontFamily: "'Fira Code', monospace",
    fontSize: 14,
    lineHeight: 1.6,
    minHeight: '200px',
  },
  codeLine: {
    color: '#cbd5e1',
    marginBottom: 8,
  },
  sectionLight: {
    padding: '100px 0',
    background: '#f8fafc',
  },
  sectionDark: {
    padding: '100px 0',
    background: '#041615',
    color: '#ffffff',
  },
  sectionContainer: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 40,
    fontWeight: 800,
    marginBottom: 16,
    letterSpacing: '-0.5px',
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 18,
    maxWidth: 600,
    lineHeight: 1.6,
  },
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 30,
  },
  serviceCard: {
    background: '#ffffff',
    padding: '32px',
    borderRadius: 20,
    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.05)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: 'rgba(29, 105, 100, 0.1)',
    color: '#1D6964',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 12,
  },
  serviceDesc: {
    color: '#64748b',
    lineHeight: 1.6,
    fontSize: 15,
  },
  packagesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 30,
    alignItems: 'center',
  },
  packageCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: '40px 32px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  packageCardHit: {
    background: '#1D6964',
    borderRadius: 24,
    padding: '48px 32px',
    border: '1px solid rgba(76, 184, 184, 0.3)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    position: 'relative',
    transform: 'scale(1.05)',
  },
  popularBadge: {
    position: 'absolute',
    top: -16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#F39C12',
    color: '#fff',
    padding: '6px 16px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    boxShadow: '0 4px 10px rgba(243, 156, 18, 0.4)',
  },
  pkgTitle: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 8,
  },
  pkgPrice: {
    fontSize: 32,
    fontWeight: 900,
    marginBottom: 16,
  },
  pkgDesc: {
    fontSize: 15,
    marginBottom: 32,
    minHeight: 48,
  },
  pkgFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    marginBottom: 40,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 15,
    fontWeight: 500,
  },
  pkgBtnPrimary: {
    width: '100%',
    padding: '16px',
    borderRadius: 12,
    background: '#F39C12',
    color: '#ffffff',
    border: 'none',
    fontWeight: 700,
    fontSize: 16,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  pkgBtnSecondary: {
    width: '100%',
    padding: '16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.2)',
    fontWeight: 700,
    fontSize: 16,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  contactSection: {
    padding: '100px 24px',
    maxWidth: 1200,
    margin: '0 auto',
    background: '#ffffff',
  },
  contactGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: 60,
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  infoCard: {
    padding: 24,
    borderRadius: 16,
    background: '#f8fafc',
    border: '1px solid rgba(0,0,0,0.05)',
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'rgba(29, 105, 100, 0.1)',
    color: '#1D6964',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 600,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },
  contactForm: {
    padding: 40,
    borderRadius: 24,
    background: '#f8fafc',
    border: '1px solid rgba(0,0,0,0.05)',
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
    fontSize: 14,
    fontWeight: 600,
    color: '#334155',
  },
  input: {
    padding: '14px 16px',
    borderRadius: 12,
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.1)',
    color: '#0f172a',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    padding: '16px',
    borderRadius: 12,
    background: '#1D6964',
    color: 'white',
    border: 'none',
    fontWeight: 700,
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    boxShadow: '0 10px 20px -5px rgba(29, 105, 100, 0.4)',
  },
  footer: {
    padding: '40px 24px',
    background: '#020b0b',
    color: '#64748b',
    fontSize: 14,
  },
  footerContent: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  }
}
