import { AppShell } from '@/components/layout/AppShell';
import { SupabaseProvider } from '@/components/providers/SupabaseProvider';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <AppShell>{children}</AppShell>
    </SupabaseProvider>
  );
}
