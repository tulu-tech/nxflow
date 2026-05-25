import { SupabaseProvider } from '@/components/providers/SupabaseProvider';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      {children}
    </SupabaseProvider>
  );
}
