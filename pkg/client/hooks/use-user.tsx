"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentUserQuery } from "@/services/user";

export function useUser() {
  const auth = useAuth();
  const query = useCurrentUserQuery({
    enabled: auth.authenticated,
    userId: auth.account?.id,
  });
  const user = auth.account && query.data
    ? {
        ...query.data,
        name: auth.account.name,
        email: auth.account.email,
        image: auth.account.image,
        avatar: auth.account.image ?? "",
        username: auth.account.username,
      }
    : null;

  async function refresh() {
    const account = await auth.refresh();
    if (!account) return null;
    const result = await query.refetch();
    return result.data ?? null;
  }

  const loading = auth.loading || (auth.authenticated && query.isPending);

  return {
    user,
    username: auth.username,
    authUser: auth.account,
    isLoggedIn: auth.authenticated,
    isLoading: loading,
    loading,
    error: auth.error ?? query.error,
    refresh,
    session: undefined,
  };
}
