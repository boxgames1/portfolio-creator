import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  usePortfolioChat,
  type ChatMessage,
  type PortfolioChatContext,
} from "@/hooks/usePortfolioChat";
import { isInsufficientTokensError } from "@/lib/tokenErrors";
import { cn } from "@/lib/utils";

interface PortfolioChatProps {
  portfolioContext: PortfolioChatContext | null;
  disabled?: boolean;
}

export function PortfolioChat({
  portfolioContext,
  disabled,
}: PortfolioChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const chat = usePortfolioChat(portfolioContext);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || chat.isPending || disabled) return;
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
              content: "You don't have enough tokens. Go to Account to buy more.",
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Could not get a response. Check your connection or try again later.",
            },
          ]);
        }
      },
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer py-4 flex flex-row items-center justify-between gap-2"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" />
          Ask about your portfolio
        </CardTitle>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-muted-foreground">
            Ask the AI questions about your portfolio (allocation, performance,
            etc.).
          </p>
          <div className="rounded-lg border bg-muted/30 max-h-64 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Type a question, e.g. &quot;Where am I most concentrated?&quot;
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm rounded-lg px-3 py-2 max-w-[90%]",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted"
                )}
              >
                {m.content}
              </div>
            ))}
            {chat.isPending && (
              <div className="text-sm rounded-lg px-3 py-2 bg-muted text-muted-foreground">
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <Input
              placeholder="Ask about your portfolio..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={disabled || chat.isPending || !portfolioContext}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={
                !input.trim() || disabled || chat.isPending || !portfolioContext
              }
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
