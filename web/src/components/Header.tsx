import { useEffect, useState } from "react";
import {
  Bell,
  Star,
  Home,
  BookOpen,
  BarChart3,
  Users,
  ClipboardCheck,
  Settings,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from '@/contexts/useUser';
import { notificationService } from "@/services";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAvatarUri } from "@/utils/avatar";
import { Avatar } from "./ui/avatar";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    setAvatarUrl(getAvatarUri(user?.avatar_url));
  }, [user]);

  const userId = user?.uuid;

  useEffect(() => {
    let isActive = true;
    const loadUnreadCount = async () => {
      try {
        const items = await notificationService.getNotifications(userId, 50);
        if (!isActive) return;
        setUnreadCount(items.filter((item) => !item.read).length);
      } catch (error) {
        console.error("Failed to load notification count:", error);
        if (isActive) setUnreadCount(0);
      }
    };

    if (userId) {
      loadUnreadCount();
    } else if (isActive) {
      setUnreadCount(0);
    }

    return () => {
      isActive = false;
    };
  }, [userId, location.pathname]);

  useEffect(() => {
    let isActive = true;

    const loadUnreadMessageCount = async () => {
      if (!userId) {
        if (isActive) setUnreadMessageCount(0);
        return;
      }

      const { data, error } = await supabase.rpc(
        "get_direct_message_conversations",
        { user_id: userId },
      );

      if (error) {
        console.error("Failed to load unread message count:", error);
        if (isActive) setUnreadMessageCount(0);
        return;
      }

      const totalUnread = ((data as Array<{ unread_messages?: number }> | null) || [])
        .reduce((sum, convo) => sum + Number(convo.unread_messages || 0), 0);

      if (isActive) {
        setUnreadMessageCount(totalUnread);
      }
    };

    loadUnreadMessageCount();

    if (!userId) {
      return () => {
        isActive = false;
      };
    }

    const channel = supabase
      .channel("header-unread-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        (payload) => {
          const message = payload.new || payload.old;
          if (
            message &&
            (message.sender_id === userId || message.recipient_id === userId)
          ) {
            loadUnreadMessageCount();
          }
        },
      )
      .subscribe();

    return () => {
      isActive = false;
      void supabase.removeChannel(channel).catch(() => {
        // Channel may be closing before websocket is fully established.
      });
    };
  }, [userId]);

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: BookOpen, label: "Courses", path: "/courses" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: Users, label: "Students", path: "/students" },
    { icon: ClipboardCheck, label: "Quiz", path: "/quiz" },
    { icon: MessageSquare, label: "Messages", path: "/messages" },
    { icon: Star, label: "Badges", path: "/badges" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="lg:hidden items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-3 cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold hover-scale">
                        {/* Menu dropdown icon */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                          />
                        </svg>
                      </div>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 ml-4">
                    {navItems.map((item, idx) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <div key={item.path}>
                          <DropdownMenuItem
                            onClick={e => { e.stopPropagation(); navigate(item.path); }}
                          >
                            <Icon className="h-4 w-4 mr-4" />
                            <span className="inline">{item.label}</span>
                          </DropdownMenuItem>
                          {idx < navItems.length - 1 && <DropdownMenuSeparator key={item.path + '-sep'} />}
                        </div>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <span className="text-xl font-bold text-foreground">Shalom</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className="gap-2 relative"
                >
                  <Icon className="h-4 w-4" />
                  <span className="inline">{item.label}</span>
                  {item.path === "/messages" && unreadMessageCount > 0 ? (
                    <span className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full bg-accent text-xs flex items-center justify-center text-accent-foreground font-semibold px-1">
                      {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                    </span>
                  ) : null}
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate("/notifications")}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-xs flex items-center justify-center text-accent-foreground font-semibold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold hover-scale">
                    <Avatar className="h-10 w-10">
                      <img src={avatarUrl} />
                    </Avatar>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name || "User"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.email || "User"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
