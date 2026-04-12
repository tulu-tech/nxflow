'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useAuthStore } from '@/store/authStore';

export function LoginScreen() {
  const { login, loginError, isLoggingIn } = useAuthStore();
  const [name, setName] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [shake, setShake] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const pinStr = pin.join('');
    if (!name.trim() || pinStr.length !== 6) return;

    const success = await login(name.trim(), pinStr);
    if (!success) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const pinStr = pin.join('');
  const canSubmit = name.trim().length > 0 && pinStr.length === 6;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f2a 50%, #1a0a2a 100%)',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background orbs */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '8%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '12%',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      {/* Login card */}
      <div
        className={shake ? 'login-shake' : ''}
        style={{
          width: 420,
          padding: '48px 40px',
          borderRadius: 20,
          background: 'rgba(22, 22, 35, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 800,
                color: '#fff',
              }}
            >
              N
            </div>
            <span
              style={{
                fontSize: 26,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #e8e8f0, #a5a5c0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px',
              }}
            >
              NXFlow
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: '#6b6b8a',
              letterSpacing: '0.02em',
            }}
          >
            Sign in to your workspace
          </p>
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: '#8888a8',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Name
          </label>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') pinRefs.current[0]?.focus();
            }}
            placeholder="Enter your name"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#e8e8f0',
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
              e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* PIN input */}
        <div style={{ marginBottom: 32 }}>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: '#8888a8',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            6-Digit PIN
          </label>
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'space-between',
            }}
          >
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  pinRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(i, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(i, e)}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData
                    .getData('text')
                    .replace(/\D/g, '')
                    .slice(0, 6);
                  const newPin = [...pin];
                  for (let j = 0; j < pasted.length && i + j < 6; j++) {
                    newPin[i + j] = pasted[j];
                  }
                  setPin(newPin);
                  const nextIdx = Math.min(i + pasted.length, 5);
                  pinRefs.current[nextIdx]?.focus();
                }}
                style={{
                  width: 48,
                  height: 56,
                  textAlign: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: "'Inter', monospace",
                  borderRadius: 10,
                  border: `1px solid ${
                    digit ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)'
                  }`,
                  background: digit
                    ? 'rgba(99, 102, 241, 0.08)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: '#e8e8f0',
                  outline: 'none',
                  transition: 'all 0.2s',
                  caretColor: '#6366f1',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(99, 102, 241, 0.6)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = digit
                    ? 'rgba(99, 102, 241, 0.4)'
                    : 'rgba(255, 255, 255, 0.08)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {loginError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              fontSize: 13,
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            {loginError}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isLoggingIn}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 10,
            border: 'none',
            background: canSubmit
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : 'rgba(255, 255, 255, 0.05)',
            color: canSubmit ? '#fff' : '#555',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            letterSpacing: '0.02em',
          }}
          onMouseOver={(e) => {
            if (canSubmit) {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.target as HTMLButtonElement).style.boxShadow =
                '0 4px 20px rgba(99, 102, 241, 0.4)';
            }
          }}
          onMouseOut={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'none';
            (e.target as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          {isLoggingIn ? 'Signing in…' : 'Sign In'}
        </button>

        <style>{`
          @keyframes loginShake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
          .login-shake {
            animation: loginShake 0.5s ease;
          }
        `}</style>
      </div>
    </div>
  );
}
