import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCircle, AlertCircle, Info, Star, Users, BookOpen, Award, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: "success" | "warning" | "info" | "achievement";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

const Notifications = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "success",
      title: "New Student Enrolled",
      message: "Sarah Wilson enrolled in Data Science Fundamentals",
      timestamp: "2 hours ago",
      read: false,
      actionUrl: "/students"
    },
    {
      id: "2",
      type: "achievement",
      title: "Course Milestone",
      message: "React Masterclass reached 100 students!",
      timestamp: "5 hours ago",
      read: false,
      actionUrl: "/analytics"
    },
    {
      id: "3",
      type: "warning",
      title: "Pending Quiz Reviews",
      message: "28 quiz submissions awaiting your review",
      timestamp: "1 day ago",
      read: true,
      actionUrl: "/assessments"
    },
    {
      id: "4",
      type: "info",
      title: "New Message",
      message: "John Smith sent you a message about Module 3",
      timestamp: "2 days ago",
      read: true,
      actionUrl: "/messages"
    },
    {
      id: "5",
      type: "success",
      title: "Course Published",
      message: "Advanced JavaScript has been published successfully",
      timestamp: "3 days ago",
      read: true,
      actionUrl: "/courses"
    },
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="h-5 w-5 text-success" />;
      case "warning": return <AlertCircle className="h-5 w-5 text-warning" />;
      case "info": return <Info className="h-5 w-5 text-accent" />;
      case "achievement": return <Award className="h-5 w-5 text-warning" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast({
      title: "All notifications marked as read",
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    toast({
      title: "Notification deleted",
    });
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[32px] font-bold">Notifications</h1>
            <p className="text-muted-foreground">Stay updated with your latest activity</p>
          </div>
          <Button onClick={markAllAsRead}>Mark All as Read</Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="read">
              Read ({readNotifications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`gradient-card border border-border rounded-xl p-6 hover-lift ${
                  !notification.read ? "border-l-4 border-l-accent" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold">{notification.title}</h3>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Badge variant="outline" className="text-xs">New</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-2">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{notification.timestamp}</span>
                      {notification.actionUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            markAsRead(notification.id);
                            window.location.href = notification.actionUrl!;
                          }}
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            {unreadNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No unread notifications</p>
              </div>
            ) : (
              unreadNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="gradient-card border border-border rounded-xl p-6 hover-lift border-l-4 border-l-accent"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold">{notification.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">New</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{notification.timestamp}</span>
                        {notification.actionUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              markAsRead(notification.id);
                              window.location.href = notification.actionUrl!;
                            }}
                          >
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="read" className="space-y-4">
            {readNotifications.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No read notifications</p>
              </div>
            ) : (
              readNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="gradient-card border border-border rounded-xl p-6 hover-lift"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold">{notification.title}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-muted-foreground mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{notification.timestamp}</span>
                        {notification.actionUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = notification.actionUrl!}
                          >
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Notifications;
