import { useEffect, useState, useRef } from 'react';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Send, Search, Plus, Check, CheckCheck, Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useToast } from '@/hooks/use-toast';
import { courseService } from '@/services';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { getAvatarUri } from '@/utils/avatar';
import { fetchUserProfile } from '@/services/userService';
import { fetchAllUsers } from '@/services/userService';
import { postNotification } from "@/services/notificationService";

let CURRENT_USER_ID = '';

const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState<any>(null); // {id, name, ...}
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useUser();

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = newMessage;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setNewMessage(before + emojiData.emoji + after);
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd =
          start + emojiData.emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setNewMessage(newMessage + emojiData.emoji);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetchAllUsers();
      // Filter out current user from list of all users
      const filteredUsers = response.filter((u) => u.id !== user?.uuid);
      // Fetch profile info for each user to get their names
      console.log('Fetched users:', filteredUsers);
      const usersWithProfiles = await Promise.all(
        filteredUsers.map(async (u) => {
          return await fetchUserProfile(u.email);
        }),
      );
      setAllUsers(usersWithProfiles);
    } catch (error) {
      setAllUsers([]);
    }
  };

  const getConvoProfilePic = (convo: any) => {
    let uri = allUsers.find((u) => u.id === convo.id)?.avatar_url;
    if (uri) {
      uri = getAvatarUri(uri);
      return uri;
    } else {
      return null;
    }
  };

  // Fetch conversations (all users you've messaged with)
  const fetchConversations = async () => {
    // Get all users you've sent or received messages with
    const { data, error } = await supabase.rpc(
      'get_direct_message_conversations',
      { user_id: CURRENT_USER_ID },
    );
    if (!error && data) setConversations(data);
  };

  useEffect(() => {
    if (!user) return;
    CURRENT_USER_ID = user.uuid;
    fetchConversations();
    loadUsers();
  }, [user]);

  // Subscribe to update conversations list when new messages arrive
  useEffect(() => {
    if (!CURRENT_USER_ID) return;
    const channel = supabase
      .channel('direct_messages_conversations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new;
          // Refresh conversations if message involves current user
          if (
            msg.sender_id === CURRENT_USER_ID ||
            msg.recipient_id === CURRENT_USER_ID
          ) {
            console.log('New message detected, refreshing conversations');
            fetchConversations();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Mark messages as read
  const markMessagesAsRead = async (convo: any) => {
    if (!CURRENT_USER_ID) return;
    const { error } = await supabase.rpc('mark_messages_as_read', {
      sender_id: convo.id,
      recipient_id: CURRENT_USER_ID,
    });
    if (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;
    markMessagesAsRead(selectedConversation);
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `sender_id.eq.${CURRENT_USER_ID},recipient_id.eq.${CURRENT_USER_ID}`,
        )
        .order('created_at', { ascending: true });
      if (!error && data)
        setMessages(
          data.filter(
            (m) =>
              m.sender_id === selectedConversation.id ||
              m.recipient_id === selectedConversation.id,
          ),
        );
    };
    fetchMessages();
  }, [selectedConversation]);

  // Subscribe to new messages and read status updates
  useEffect(() => {
    if (!selectedConversation) return;
    const channel = supabase
      .channel('direct_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new;
          console.log('New message received via subscription:', msg);
          if (
            (msg.sender_id === CURRENT_USER_ID &&
              msg.recipient_id === selectedConversation.id) ||
            (msg.sender_id === selectedConversation.id &&
              msg.recipient_id === CURRENT_USER_ID)
          ) {
            setMessages((prev) => [...prev, msg]);
            // If message is from other user, mark as read
            if (
              msg.sender_id === selectedConversation.id &&
              msg.recipient_id === CURRENT_USER_ID
            ) {
              markMessagesAsRead(selectedConversation);
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const updatedMsg = payload.new;
          // Update message if it's in the current conversation
          if (
            (updatedMsg.sender_id === CURRENT_USER_ID &&
              updatedMsg.recipient_id === selectedConversation.id) ||
            (updatedMsg.sender_id === selectedConversation.id &&
              updatedMsg.recipient_id === CURRENT_USER_ID)
          ) {
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)),
            );
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: CURRENT_USER_ID,
      recipient_id: selectedConversation.id,
      content: newMessage,
    });
    if (!error) {
      await postNotification({
        userIds: [selectedConversation.id],
        title: user.name,
        message: newMessage,
        type: "message",
      });
      setNewMessage('');
      await fetchConversations(); // Refresh conversations to update latest message in sidebar
    } else {
      toast({ title: 'Error', description: error.message });
    }
  };

  const handleComposeMessage = async () => {
    if (!selectedUsers.length || !newMessage.trim()) return;
    // Send message to all selected users
    const inserts = selectedUsers.map((user) => ({
      sender_id: CURRENT_USER_ID,
      recipient_id: user.id,
      content: newMessage,
    }));
    const { error } = await supabase.from('direct_messages').insert(inserts);
    if (!error) {
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent to the selected recipients',
      });
      // Send notifications to all recipients
      for (const user of selectedUsers) {
        await postNotification({
          userIds: [user.id],
          title: user.name,
          message: newMessage,
          type: "message",
        });
      }
      setIsComposeOpen(false);
      setNewMessage('');
      setSelectedUsers([]);
      // Refresh conversations after sending
      await fetchConversations();
    } else {
      toast({ title: 'Error', description: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">
              Communicate with other users
            </p>
          </div>

          <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
                <DialogDescription>
                  Send a message to other users
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipients">Recipients</Label>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal my-2"
                    onClick={() => setIsUserDialogOpen(true)}
                  >
                    {selectedUsers.length > 0
                      ? selectedUsers.map((u) => u.name).join(', ')
                      : 'Search and select users...'}
                  </Button>
                  <Dialog
                    open={isUserDialogOpen}
                    onOpenChange={setIsUserDialogOpen}
                  >
                    <DialogContent className="max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Select Users</DialogTitle>
                        <DialogDescription>
                          Search and select other users to message
                        </DialogDescription>
                      </DialogHeader>
                      <div className="gap-2 mb-2">
                        <Input
                          autoFocus
                          placeholder="Search users..."
                          className="flex"
                          value={searchTerm}
                          onChange={(e) =>
                            setSearchTerm(e.target.value.toLowerCase())
                          }
                        />
                      </div>
                      <div className="border border-input rounded-md p-3 max-h-64 overflow-y-auto space-y-2">
                        {allUsers
                          .filter((user) =>
                            user.name.toLowerCase().includes(searchTerm),
                          )
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="checkbox"
                                id={`user-${user.id}`}
                                checked={selectedUsers.some(
                                  (u) => u.id === user.id,
                                )}
                                className="rounded"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUsers([...selectedUsers, user]);
                                  } else {
                                    setSelectedUsers(
                                      selectedUsers.filter(
                                        (u) => u.id !== user.id,
                                      ),
                                    );
                                  }
                                }}
                              />
                              <label
                                htmlFor={`user-${user.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {user.name}
                              </label>
                            </div>
                          ))}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedUsers([])}
                          disabled={selectedUsers.length === 0}
                        >
                          Deselect All
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsUserDialogOpen(false)}
                        >
                          Done
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {selectedUsers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedUsers.map((user) => (
                        <Badge key={user.id} variant="secondary">
                          {user.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="message-content">Message</Label>
                  <Textarea
                    id="message-content"
                    className="my-2"
                    placeholder="Type your message..."
                    rows={6}
                    value={composeMessage}
                    onChange={(e) => setComposeMessage(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsComposeOpen(false)}
                >
                  Cancel
                </Button>
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
                    onClick={() => {setSelectedConversation(conv); fetchConversations();}}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation &&
                      selectedConversation.id === conv.id
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-background/50 hover:bg-background/80'
                    } ${
                      conv.unread_messages > 0 ? 'border-2 border-secondary' : ''
                    }
                    
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex items-start gap-3">
                      <Avatar>
                        {getConvoProfilePic(conv) ? (
                          <img
                            src={getConvoProfilePic(conv)}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <AvatarFallback>
                            {conv.name?.[0] || '?'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-foreground text-sm truncate flex items-center gap-2">
                            {conv.name}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {conv.last_message || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                      </div>
                      <div className="absolute right-3 top-3">
                        {conv.unread_messages > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {conv.unread_messages}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          <Card className="lg:col-span-2 gradient-card border-border flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {getConvoProfilePic(selectedConversation) ? (
                        <img
                          src={getConvoProfilePic(selectedConversation)}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <AvatarFallback>
                          {selectedConversation.name?.[0] || '?'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {selectedConversation.name}
                      </p>
                      {/* Optionally show status */}
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4 min-h-0 lg:max-h-14">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === CURRENT_USER_ID ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] ${msg.sender_id === CURRENT_USER_ID ? 'order-2' : 'order-1'}`}
                        >
                          <div
                            className={`p-3 rounded-lg ${
                              msg.sender_id === CURRENT_USER_ID
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background/80'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <div className="flex items-center gap-1 mt-2 justify-end">
                              <p className="text-xs text-muted-foreground px-1 flex justify-end">
                                {new Date(msg.created_at).toLocaleTimeString(
                                  [],
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit',
                                    hour12: true,
                                  },
                                )}
                              </p>
                              {msg.is_read ? (
                                <CheckCheck className="h-4 w-4 text-blue-300" />
                              ) : (
                                <Check className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-border">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 relative">
                      <Textarea
                        ref={textareaRef}
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
                        rows={3}
                      />
                      <Popover
                        open={showEmojiPicker}
                        onOpenChange={setShowEmojiPicker}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute bottom-2 right-2"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          >
                            <Smile className="h-5 w-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-0">
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            autoFocusSearch={false}
                            width={350}
                            height={400}
                            theme={'auto'}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button onClick={handleSendMessage} className="m-2">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <p className="text-lg font-semibold mb-2">
                  No conversation selected
                </p>
                <p className="mb-4">
                  Select a conversation from the left or start a new one to
                  begin messaging.
                </p>
                <Send className="mx-auto h-10 w-10 opacity-30" />
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Messages;
