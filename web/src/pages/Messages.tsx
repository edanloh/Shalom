import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Send, Search, Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState(1);
  const [newMessage, setNewMessage] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { toast } = useToast();

  const conversations = [
    { id: 1, name: "Sarah Johnson", lastMessage: "Thank you for the feedback!", time: "2h ago", unread: 2, avatar: "SJ" },
    { id: 2, name: "Michael Chen", lastMessage: "When is the next assignment due?", time: "5h ago", unread: 0, avatar: "MC" },
    { id: 3, name: "Emma Wilson", lastMessage: "I have a question about the lecture", time: "1d ago", unread: 1, avatar: "EW" },
    { id: 4, name: "Study Group A", lastMessage: "Meeting scheduled for tomorrow", time: "2d ago", unread: 0, avatar: "SG", isGroup: true },
  ];

  const messages = [
    { id: 1, sender: "Sarah Johnson", text: "Hi Dr. Rachel, I just finished the assignment!", isMine: false, time: "10:30 AM" },
    { id: 2, sender: "Me", text: "Great work! I'll review it and provide feedback soon.", isMine: true, time: "10:35 AM" },
    { id: 3, sender: "Sarah Johnson", text: "Thank you for the feedback!", isMine: false, time: "2:15 PM" },
  ];

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    toast({
      title: "Message Sent",
      description: "Your message has been sent successfully"
    });
    setNewMessage("");
  };

  const handleComposeMessage = () => {
    toast({
      title: "Message Sent",
      description: "Your message has been sent to the selected recipients"
    });
    setIsComposeOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">Communicate with your students</p>
          </div>
          
          <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
                <DialogDescription>Send a message to your students</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipients">Recipients</Label>
                  <Input id="recipients" placeholder="Select students or groups..." />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Message subject..." />
                </div>
                <div>
                  <Label htmlFor="message-content">Message</Label>
                  <Textarea id="message-content" placeholder="Type your message..." rows={6} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
                <Button onClick={handleComposeMessage}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
          <Card className="lg:col-span-1 gradient-card border-border p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-10" />
            </div>

            <ScrollArea className="h-full">
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation === conv.id 
                        ? 'bg-primary/20 border border-primary/30' 
                        : 'bg-background/50 hover:bg-background/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>{conv.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-foreground text-sm truncate flex items-center gap-2">
                            {conv.name}
                            {conv.isGroup && <Users className="h-3 w-3" />}
                          </p>
                          <span className="text-xs text-muted-foreground">{conv.time}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                          {conv.unread > 0 && (
                            <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                              {conv.unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          <Card className="lg:col-span-2 gradient-card border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>SJ</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">Sarah Johnson</p>
                  <p className="text-xs text-muted-foreground">Active now</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${msg.isMine ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`p-3 rounded-lg ${
                          msg.isMine
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background/80'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-1">{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[60px]"
                />
                <Button onClick={handleSendMessage} className="self-end">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Messages;
