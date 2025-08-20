import { getSession, getUser } from '@/lib/auth-helpers';
import { Chat } from '@/components/chat/chat';
import { ResizablePanel } from '@/components/resizable-panel';
import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AlwaysVisibleArtifact } from '@/components/always-visible-artifact';
import { getCurrentDocumentsByUserId } from '@/lib/db/queries';
import { AuthGuardProvider } from '@/hooks/use-auth-guard';
import { headers } from 'next/headers';

export default async function HomePage() {
  // Try to get user session but don't require it
  const session = await getSession();
  const user = await getUser();

  // Get user documents and sidebar state
  const readonlyHeaders = await headers();
  const documents = user?.id
    ? await getCurrentDocumentsByUserId({ userId: user.id })
    : [];
  const cookieHeader = readonlyHeaders.get('cookie') || '';
  const leftCookie = cookieHeader
    .split('; ')
    .find((row: string) => row.startsWith('sidebar_state_left='));
  const isLeftSidebarCollapsed = leftCookie
    ? leftCookie.split('=')[1] === 'false'
    : true;

  // Create a guest user if no authentication
  const isGuest = !user;
  const appUser = user || {
    id: 'guest-user',
    name: 'Guest User',
    email: 'guest@antwrite.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: false,
    image: null,
  };

  // Return the same layout as /documents but with auth guard
  return (
    <AuthGuardProvider initialIsGuest={isGuest}>
      <SidebarProvider
        defaultOpenLeft={!isLeftSidebarCollapsed}
        defaultOpenRight={true}
      >
        <div className="flex flex-row h-dvh w-full bg-background">
          <AppSidebar user={appUser} initialDocuments={documents} />
          <main className="flex-1 flex flex-row min-w-0">
            <div className="flex-1 min-w-0 overflow-hidden border-r subtle-border">
              <AlwaysVisibleArtifact
                chatId="new-chat"
                initialDocumentId="init"
                initialDocuments={[]}
                user={appUser}
              />
            </div>
            <ResizablePanel
              side="right"
              defaultSize={400}
              minSize={320}
              maxSize={600}
              className="border-l subtle-border transition-all duration-200"
            >
              <Chat initialMessages={[]} />
            </ResizablePanel>
          </main>
        </div>
      </SidebarProvider>
    </AuthGuardProvider>
  );
}