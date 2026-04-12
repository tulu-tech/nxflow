'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('E-posta veya şifre hatalı.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <div style={styles.page}>
      {/* Background glow */}
      <div style={styles.glow1} />
      <div style={styles.glow2} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={styles.logoText}>NXFlow</span>
        </div>

        <h1 style={styles.heading}>Tekrar hoş geldin</h1>
        <p style={styles.sub}>Alba ekibine giriş yap</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>E-posta</label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ad@alba.com"
              style={styles.input}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Şifre</label>
            <input
              id="login-password"
              type="password"
              required
              minLength={6}
              maxLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="● ● ● ● ● ●"
              style={styles.input}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <span style={styles.hint}>6 haneli şifre</span>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>

        <p style={styles.footer}>
          Hesabın yok mu?{' '}
          <a href="/register" style={styles.link}>Kayıt ol</a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  glow1: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
    top: -200,
    left: -200,
    pointerEvents: 'none',
  },
  glow2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
    bottom: -100,
    right: -100,
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 400,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: '36px 32px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
  },
  logoText: {
    fontWeight: 800,
    fontSize: 20,
    color: '#fff',
    letterSpacing: '-0.5px',
  },
  heading: {
    margin: '0 0 6px',
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.4px',
  },
  sub: {
    margin: '0 0 28px',
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.7)',
  },
  input: {
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    fontSize: 14,
    color: '#fff',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s',
    letterSpacing: '0.5px',
  },
  hint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  error: {
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 8,
    fontSize: 13,
    color: '#fca5a5',
  },
  btn: {
    padding: '12px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: '0.2px',
    boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
    transition: 'opacity 0.2s',
    fontFamily: 'Inter, sans-serif',
  },
  footer: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  link: {
    color: '#818cf8',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
