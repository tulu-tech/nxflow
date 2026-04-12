export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: 0, background: '#0a0a0f', fontFamily: "'Inter', sans-serif", minHeight: '100vh' }}>
      {children}
    </div>
  );
}
