"use client";

import { Landmark, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

import { Button } from "@/components/ui/button";
import { useExchangeToken, useLinkToken } from "@/hooks/use-plaid";

/** Opens the Plaid Link modal once a link_token is available, then exchanges. */
function PlaidLauncher({ token, onDone }: { token: string; onDone: () => void }) {
  const exchange = useExchangeToken();
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (publicToken) => {
      exchange.mutate(publicToken, { onSettled: onDone });
    },
    onExit: () => onDone(),
  });

  useEffect(() => {
    if (ready) open();
  }, [ready, open]);

  return null;
}

export function ConnectBank() {
  const [token, setToken] = useState<string | null>(null);
  const linkToken = useLinkToken();

  return (
    <>
      <Button
        variant="outline"
        disabled={linkToken.isPending || token !== null}
        onClick={() =>
          linkToken
            .mutateAsync()
            .then(setToken)
            .catch(() => {})
        }
      >
        {linkToken.isPending ? <Loader2 className="animate-spin" /> : <Landmark />}
        Connect bank
      </Button>
      {token && <PlaidLauncher token={token} onDone={() => setToken(null)} />}
    </>
  );
}
