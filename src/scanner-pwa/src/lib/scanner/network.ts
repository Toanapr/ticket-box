"use client";

import { useEffect, useState } from "react";
import type { NetworkStatus } from "@/lib/scanner/types";

function resolveInitialNetworkStatus(): NetworkStatus {
  if (typeof navigator === "undefined") {
    return "online";
  }

  return navigator.onLine ? "online" : "offline";
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    resolveInitialNetworkStatus,
  );

  useEffect(() => {
    function handleOnline() {
      setNetworkStatus("online");
    }

    function handleOffline() {
      setNetworkStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return networkStatus;
}
