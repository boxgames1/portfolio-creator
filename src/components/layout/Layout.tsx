import { Outlet } from "react-router-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  PlusCircle,
  LogOut,
  Bot,
  User,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/hooks/useTheme";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { Moon, Sun } from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/assets", label: "Assets", icon: Wallet },
  { path: "/warren-ai", label: "Warren AI", icon: Bot },
  { path: "/account", label: "Account", icon: User },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { data: tokenBalance, isLoading: tokensLoading } = useTokenBalance();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      <aside className="sticky left-0 top-0 z-20 w-full md:w-64 md:h-screen border-r bg-card flex flex-col shrink-0 md:overflow-y-auto">
        <div className="p-6 border-b shrink-0">
          <Link to="/" className="block">
            <img src="/logo.svg" alt="PortfoLens" className="h-12 w-auto" />
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 min-h-0">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link key={path} to={path}>
              <Button
                variant={location.pathname === path ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate("/assets?add=1")}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </nav>
        <div className="p-4 border-t space-y-2 shrink-0">
          <Link
            to="/account"
            className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              {tokensLoading ? "…" : `${tokenBalance ?? 0} tokens`}
            </span>
            <span className="text-muted-foreground text-xs">Buy more</span>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 mr-2" />
            ) : (
              <Moon className="h-4 w-4 mr-2" />
            )}
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto px-4 md:px-8 pb-4 md:pb-8 pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
