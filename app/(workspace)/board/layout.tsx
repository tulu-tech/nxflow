import { AppShell } from '@/components/layout/AppShell';

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
