'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const AVATAR_COLORS = ['#7c3aed', '#0891b2', '#059669', '#e11d48', '#d97706', '#6366f1', '#ec4899', '#14b8a6'];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length !== 6) {
      setError('Şifre tam olarak 6 haneli olmalıdır.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const initials = getInitials(name);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, initials, avatar_color: avatarColor },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Insert profile
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name,
        initials,
        avatar_color: avatarColor,
        email,
      });

      // Add to Alba workspace
      const { data: ws } = await supabase
        .from('workspaces')
        .select('id')
        .eq('name', 'Alba')
        .single();

      if (ws) {
        await supabase.from('workspace_members').upsert({
          workspace_id: ws.id,
          user_id: data.user.id,
          role: 'member',
        });
      }
    }

    router.push('/');
    router.refresh();
  };

  return (
    <div style={styles.page}>
      <div style={styles.glow1} />
      <div style={styles.glow2} />

      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={styles.logoText}>NXFlow</span>
        </div>

        <h1 style={styles.heading}>Hesap oluştur</h1>
        <p style={styles.sub}>Alba ekibine katıl</p>

        <form onSubmit={handleRegister} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Ad Soyad</label>
            <input
              id="register-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hazel"
              style={styles.input}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>E-posta</label>
            <input
              id="register-email"
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
              id="register-password"
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
            <span style={styles.hint}>Tam olarak 6 karakter</span>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Kaydediliyor…' : 'Kayıt Ol'}
          </button>
        </form>

        <p style={styles.footer}>
          Zaten hesabın var mı?{' '}
          <a href="/login" style={styles.link}>Giriş yap</a>
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
    right: -200,
    pointerEvents: 'none',
  },
  glow2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
    bottom: -100,
    left: -100,
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
