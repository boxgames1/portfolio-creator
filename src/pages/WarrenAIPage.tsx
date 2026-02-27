import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  usePortfolioChat,
  type ChatMessage,
  type PortfolioChatContext,
} from "@/hooks/usePortfolioChat";
import { useAssets } from "@/hooks/useAssets";
import { usePortfolioValue } from "@/hooks/usePortfolioValue";
import { isInsufficientTokensError } from "@/lib/tokenErrors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SUGGESTED_PROMPTS = [
  "How diversified is my portfolio?",
  "What is the Sharpe ratio and how do I interpret it?",
  "Explain the difference between ETFs and mutual funds",
  "What risk level does my current allocation have?",
  "How can I reduce volatility without stopping investing?",
];

function buildWarrenContext(
  portfolio: ReturnType<typeof usePortfolioValue>["data"],
  assets: ReturnType<typeof useAssets>["data"]
): PortfolioChatContext | null {
  if (!portfolio || !assets?.length) {
    return null;
  }
  const byType = (portfolio.byType ?? []).map((t) => ({
    type: t.type,
    value: t.value,
  }));
  const assetsList = assets
    .filter((a) => a.asset_type !== "fiat")
    .map((a) => {
      const pw = portfolio.assetsWithPrices.find((p) => p.id === a.id);
      const cost = pw?.costInEur ?? a.purchase_price * a.quantity;
      const currentValue = pw?.currentValue ?? a.purchase_price * a.quantity;
      const roi = pw?.roi ?? 0;
      return {
        name: a.name,
        asset_type: a.asset_type,
        cost,
        currentValue,
        roi,
      };
    });
  return {
    totalValue: portfolio.totalValue,
    totalCost: portfolio.totalCost,
    roi:
      portfolio.totalCost > 0
        ? ((portfolio.totalValue - portfolio.totalCost) / portfolio.totalCost) *
          100
        : 0,
    byType,
    assets: assetsList,
  };
}

export function WarrenAIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: assets } = useAssets();
  const { data: portfolio } = usePortfolioValue();
  const portfolioContext = buildWarrenContext(portfolio, assets ?? undefined);
  const chat = usePortfolioChat(portfolioContext, { mode: "warren" });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || chat.isPending) return;
    const userMessage: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    chat.mutate(newMessages, {
      onSuccess: (assistant) => {
        setMessages((prev) => [...prev, assistant]);
      },
      onError: (err) => {
        if (isInsufficientTokensError(err)) {
          toast.error("Insufficient tokens. Buy more in Account.");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "You don't have enough tokens. Go to Account to buy more.",
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Could not connect to the assistant. Check your connection or try again later.",
            },
          ]);
        }
      },
    });
  };

  const handleSuggestion = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-[400px] flex-col rounded-xl border bg-card shadow-sm md:h-[calc(100vh-4rem)]">
      {/* Warren AI / InvestPro style header */}
      <div className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-4 py-5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Bot className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Warren AI</h1>
            <p className="text-sm text-muted-foreground">
              Your AI-powered financial researcher · Portfolio analysis and
              investing concepts
            </p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Ask anything about your portfolio or investing
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Warren AI knows your portfolio and can explain ratios,
                  diversification, and more
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="text-left h-auto py-2 px-3 whitespace-normal max-w-[280px]"
                    onClick={() => handleSuggestion(prompt)}
                  >
                    <TrendingUp className="mr-2 h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 rounded-lg px-4 py-3",
                m.role === "user"
                  ? "ml-8 bg-primary text-primary-foreground"
                  : "mr-8 bg-muted/80"
              )}
            >
              {m.role === "assistant" && (
                <div className="shrink-0 mt-0.5">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1 text-sm whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          ))}
          {chat.isPending && (
            <div className="flex gap-3 rounded-lg px-4 py-3 mr-8 bg-muted/80">
              <Bot className="h-5 w-5 shrink-0 text-primary animate-pulse" />
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-current" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="border-t p-4 bg-background/80"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div className="flex gap-2">
            <Input
              placeholder="Ask about your portfolio or investing..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={chat.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || chat.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
