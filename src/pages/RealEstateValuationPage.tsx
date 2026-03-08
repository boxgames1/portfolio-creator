import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Home, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRealEstateValuation } from "@/hooks/useRealEstateValuation";
import { isInsufficientTokensError } from "@/lib/tokenErrors";
import { toast } from "sonner";

const PLACEHOLDER = `Describe your property in as much detail as possible. Include:
• Location (city, neighborhood, country)
• Property type (apartment, house, land)
• Size (sqm, number of rooms)
• Condition (new, renovated, needs work)
• Features (garage, garden, terrace, views)
• Any comparable sales or recent renovations`;

export function RealEstateValuationPage() {
  const [input, setInput] = useState("");
  const [lastInput, setLastInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [demoMode, setDemoMode] = useState(
    () =>
      typeof localStorage !== "undefined" &&
      localStorage.getItem("portfolio-demo") === "true"
  );
  const valuation = useRealEstateValuation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || valuation.isPending) return;
    setLastInput(text);
    valuation.mutate(text, {
      onSuccess: (res) => {
        setResponse(res);
        setInput("");
      },
      onError: (err) => {
        if (isInsufficientTokensError(err)) {
          toast.error("Insufficient tokens. Buy more in Account.");
          setResponse(
            "You don't have enough tokens. Go to Account to buy more."
          );
        } else {
          toast.error("Could not get valuation. Try again.");
          setResponse(
            "Could not connect. Check your connection or try again later."
          );
        }
      },
    });
  };

  const handleNewRequest = () => {
    setInput("");
    setLastInput("");
    setResponse(null);
  };

  const handleEditAndAskAgain = () => {
    setInput(lastInput);
    setResponse(null);
  };

  const hasResult = response !== null;

  return (
    <div className="mt-6 flex h-[calc(100vh-2rem)] min-h-[400px] flex-col rounded-xl border bg-card shadow-sm md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-4 py-5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Home className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Real Estate Valuation
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-powered property value estimate · 15 tokens per request
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {demoMode && (
            <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
              <p className="text-muted-foreground">
                Real Estate Valuation is disabled in demo mode. Switch to your
                portfolio to use this feature.
              </p>
              <Button
                onClick={() => {
                  setDemoMode(false);
                  try {
                    localStorage.setItem("portfolio-demo", "false");
                  } catch {}
                }}
              >
                Switch to my portfolio
              </Button>
            </div>
          )}
          {!demoMode && !hasResult && !valuation.isPending && (
            <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Describe your property for an AI valuation
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Include location, size, condition, and features for a better
                  estimate
                </p>
              </div>
            </div>
          )}

          {!demoMode && lastInput && (
            <div className="flex gap-3 rounded-lg px-4 py-3 ml-8 bg-primary text-primary-foreground">
              <div className="min-w-0 flex-1 text-sm whitespace-pre-wrap">
                {lastInput}
              </div>
            </div>
          )}

          {!demoMode && valuation.isPending && (
            <div className="flex gap-3 rounded-lg px-4 py-3 mr-8 bg-muted/80">
              <Bot className="h-5 w-5 shrink-0 text-primary animate-pulse" />
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-current" />
              </div>
            </div>
          )}

          {!demoMode && hasResult && !valuation.isPending && (
            <div className="flex gap-3 rounded-lg px-4 py-3 mr-8 bg-muted/80">
              <div className="shrink-0 mt-0.5">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-pre:bg-muted prose-pre:rounded-lg prose-pre:p-3 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {response ?? ""}
                </ReactMarkdown>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {demoMode && (
          <div className="border-t px-4 py-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-sm">
            Real Estate Valuation is disabled in demo mode. Switch to your
            portfolio to use this feature.
          </div>
        )}
        {!demoMode && (
          <div className="border-t p-4 bg-background/80 space-y-3">
            {hasResult && !valuation.isPending && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleNewRequest}>
                  New request
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditAndAskAgain}
                >
                  Edit and ask again
                </Button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="flex gap-2"
            >
              <Textarea
                placeholder={PLACEHOLDER}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={valuation.isPending}
                className="min-h-[100px] flex-1 resize-none"
                rows={4}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || valuation.isPending}
                className="shrink-0 self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
