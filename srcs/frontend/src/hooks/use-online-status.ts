import { useState, useEffect, useCallback, useMemo } from "react";

export function useOnlineStatus(userIds: number[], token: string | null) {
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());

  const idsKey = useMemo(() => userIds.slice().sort().join(","), [userIds.length, ...userIds]);

  const fetch_ = useCallback(async () => {
    if (!token || !idsKey) return;
    try {
      const res = await fetch(`/api/users/online-status?ids=${idsKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: { online: number[] } = await res.json();
      setOnlineIds(new Set(data.online));
    } catch {}
  }, [token, idsKey]);

  useEffect(() => {
    void fetch_();
    const interval = setInterval(fetch_, 30_000);
    return () => clearInterval(interval);
  }, [fetch_]);

  return { isOnline: (id: number) => onlineIds.has(id) };
}