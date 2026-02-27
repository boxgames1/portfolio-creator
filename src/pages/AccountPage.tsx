import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Coins, CreditCard, History, FlaskConical } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTokenBalance, useTokenTransactions } from "@/hooks/useTokenBalance";
import {
  useCreateCheckoutSession,
  type CreateCheckoutOptions,
} from "@/hooks/useCreateCheckoutSession";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const PACKS = [
  { key: "100" as const, tokens: 100, price: "€1.99", label: "100 tokens" },
  {
    key: "500" as const,
    tokens: 500,
    price: "€8.99",
    label: "500 tokens",
    popular: true,
  },
  {
    key: "1000" as const,
    tokens: 1000,
    price: "€14.99",
    label: "1000 tokens",
    best: true,
  },
];

const STRIPE_TEST_STORAGE = "stripe-test-mode";

export function AccountPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stripeTestMode, setStripeTestMode] = useState(() => {
    try {
      return localStorage.getItem(STRIPE_TEST_STORAGE) === "true";
    } catch {
      return false;
    }
  });
  const { isAdmin } = useIsAdmin();
  const { data: balance, isLoading: balanceLoading } = useTokenBalance();
  const { data: transactions, isLoading: txLoading } = useTokenTransactions();
  const createCheckout = useCreateCheckoutSession();

  useEffect(() => {
    const purchased = searchParams.get("purchased");
    const canceled = searchParams.get("canceled");
    if (purchased === "1") {
      toast.success("Payment successful. Your tokens have been added.");
      setSearchParams({}, { replace: true });
    } else if (canceled === "1") {
      toast.info("Checkout canceled.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleBuy = (pack: "100" | "500" | "1000") => {
    const options: CreateCheckoutOptions = {
      pack,
      testMode: isAdmin ? stripeTestMode : false,
    };
    createCheckout.mutate(options, {
      onSuccess: (url) => {
        if (url) window.location.href = url;
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to start checkout"
        );
      },
    });
  };

  return (
    <div className="space-y-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="text-muted-foreground mt-1">
          Manage your AI tokens and billing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Token balance
          </CardTitle>
          <CardDescription>
            Use tokens for portfolio chat, AI suggestions, sentiment analysis,
            and real estate estimates. 1 token ≈ 1 cent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {balanceLoading ? (
            <Skeleton className="h-12 w-32" />
          ) : (
            <p className="text-3xl font-bold tabular-nums">
              {balance ?? 0} tokens
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Buy tokens
          </CardTitle>
          <CardDescription>
            One-time purchase. Tokens never expire.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin && (
            <div
              role="group"
              aria-label="Stripe mode"
              className="flex items-center rounded-full border border-input bg-muted/50 p-0.5 w-fit"
            >
              <button
                type="button"
                onClick={() => {
                  setStripeTestMode(false);
                  try {
                    localStorage.setItem(STRIPE_TEST_STORAGE, "false");
                  } catch {}
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  !stripeTestMode
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Live</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStripeTestMode(true);
                  try {
                    localStorage.setItem(STRIPE_TEST_STORAGE, "true");
                  } catch {}
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  stripeTestMode
                    ? "bg-amber-100 text-amber-900 shadow-sm ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Use Stripe test mode (no real charges)"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                <span>Test</span>
              </button>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {PACKS.map((pack) => (
              <div
                key={pack.key}
                className={`relative rounded-lg border p-4 ${
                  pack.popular
                    ? "border-primary"
                    : pack.best
                    ? "border-amber-400"
                    : ""
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-2 left-4 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    Popular
                  </span>
                )}
                {pack.best && (
                  <span className="absolute -top-2 right-4 rounded bg-amber-500 px-2 py-0.5 text-xs text-white">
                    Best value
                  </span>
                )}
                <p className="font-semibold">{pack.label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {pack.price}
                </p>
                <Button
                  className="mt-3 w-full"
                  variant={pack.popular ? "default" : "outline"}
                  onClick={() => handleBuy(pack.key)}
                  disabled={createCheckout.isPending}
                >
                  {createCheckout.isPending ? "Redirecting…" : "Buy"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent activity
          </CardTitle>
          <CardDescription>Purchases and token usage</CardDescription>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !transactions?.length ? (
            <p className="text-muted-foreground text-sm">
              No transactions yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between rounded border p-3 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {tx.kind === "purchase"
                        ? `Purchased ${tx.reference.replace(
                            "stripe_",
                            ""
                          )} pack`
                        : tx.reference.replace(/_/g, " ")}
                    </span>
                    <p className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(tx.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <span
                    className={
                      tx.amount >= 0
                        ? "font-semibold text-green-600 dark:text-green-400"
                        : "font-semibold text-muted-foreground"
                    }
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount} tokens
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-base">Token usage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Portfolio / Warren AI chat: 15 tokens per message</p>
          <p>• Re-assess portfolio rating & suggestions: 20 tokens</p>
          <p>• Sentiment analysis: 10 tokens</p>
          <p>• Real estate value estimate (per property): 5 tokens</p>
          <p className="pt-2">Cached results do not consume tokens.</p>
        </CardContent>
      </Card>
    </div>
  );
}
