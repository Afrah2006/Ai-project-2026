"use client";

import { useSyncExternalStore } from "react";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();

  if (!isClient) {
    return null;
  }

  return <>{children}</>;
}
