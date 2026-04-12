export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>NXFlow — Sign In</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: '#0a0a0f', fontFamily: "'Inter', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
