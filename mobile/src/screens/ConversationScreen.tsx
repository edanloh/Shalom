import { useEffect, useState, useRef } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles, Shadows } from '../constants';
import { useUser } from '../contexts/UserContext';
import { useMessages } from '@/contexts/MessageContext';
import { supabase } from '@/lib/supabase';
import { CustomTextInput } from '@/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/common/ScreenHeader';
import { ImageWithFallback } from '../components/common';
import { Images } from '../../assets';

// Types
type Conversation = {
  id: string | number;
  name: string;
  last_message?: string;
  last_message_time?: string;
  avatar_url?: string;
};
type Message = {
  id: string | number;
  sender_id: string | number;
  recipient_id: string | number;
  content: string;
  created_at: string;
  is_read: boolean;
};

export default function ConversationScreen({ navigation }: any) {
  const { user } = useUser();
  const { refreshUnreadMessages } = useMessages();
  const route = useRoute();
  // Accept params as any, fallback to null
  const conversation: Conversation | null =
    (route as any)?.params?.conversation || null;
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(conversation || null);
  // No need for conversations list here
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<ScrollView>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch messages for selected conversation
  const fetchMessages = async (convo: Conversation) => {
    if (!user || !convo) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${user.uuid},recipient_id.eq.${user.uuid}`)
      .order('created_at', { ascending: true });
    if (!error && data) {
      const filteredMessages = (data as Message[]).filter(
        (m) => m.sender_id === convo.id || m.recipient_id === convo.id,
      );
      setMessages(filteredMessages);
      // Scroll to bottom after messages are loaded
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd?.({ animated: false });
      }, 100);
    }
    setLoading(false);
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    const myId = user?.uuid ?? user?.id;
    if (!myId || !selectedConversation) return;
    const { error } = await supabase.rpc('mark_messages_as_read', {
      sender_id: String(selectedConversation.id),
      recipient_id: myId,
    });
    if (error) {
      console.error('Failed to mark messages as read:', JSON.stringify(error));
    } else {
      refreshUnreadMessages();
    }
  };

  useFocusEffect(() => () => {
    if (selectedConversation) {
      markMessagesAsRead();
    }
  });

  // Subscribe to new messages and read status updates
  useEffect(() => {
    if (!selectedConversation || !user) return;
    const channel = supabase
      .channel('direct_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.uuid &&
              msg.recipient_id === selectedConversation.id) ||
            (msg.sender_id === selectedConversation.id &&
              msg.recipient_id === user.uuid)
          ) {
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id === selectedConversation.id) {
              refreshUnreadMessages();
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const updatedMsg = payload.new as Message;
          // Update message if it's in the current conversation
          if (
            (updatedMsg.sender_id === user.uuid &&
              updatedMsg.recipient_id === selectedConversation.id) ||
            (updatedMsg.sender_id === selectedConversation.id &&
              updatedMsg.recipient_id === user.uuid)
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
  }, [selectedConversation, user]);

  useEffect(() => {
    if (selectedConversation) fetchMessages(selectedConversation);
  }, [selectedConversation]);

  // Scroll to bottom when messages change (initial load)
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd?.({ animated: false });
      }, 100);
    }
  }, [messages.length]);

  // Send message in selected conversation
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    setSending(true);
    const messageToSend = newMessage;
    setNewMessage(''); // Clear input immediately to prevent rapid duplicate sends
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.uuid,
      recipient_id: selectedConversation.id,
      content: messageToSend,
    });
    setSending(false);
  };

  const openProfile = () => {
    if (!selectedConversation) return;
    navigation.navigate('ConversationProfile', { conversation: selectedConversation });
  };

  const getAvatarUri = (avatar_url?: string) => {
    const uri = avatar_url
      ? `https://cmtfxsntlfoxgcznanpe.supabase.co/storage/v1/object/public/profilepics/${avatar_url}`
      : Images.profile;
    return uri.toString();
  };

  // Message bubble
  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        user && item.sender_id === user.uuid
          ? styles.messageBubbleRight
          : styles.messageBubbleLeft,
      ]}
    >
      <Text style={styles.messageText}>{item.content}</Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Text style={styles.messageTime}>
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour12: true,
          })}
        </Text>
        {item.is_read ? (
          <Ionicons
            name="checkmark-done-outline"
            size={16}
            color={Colors.blue}
            style={{ marginTop: 4 }}
          />
        ) : (
          <Ionicons
            name="checkmark-outline"
            size={16}
            color={Colors.gray200}
            style={{ marginTop: 4 }}
          />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={{ backgroundColor: Colors.primary, flex: 1 }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={{ backgroundColor: Colors.primary }}>
          <ScreenHeader
            title={selectedConversation?.name || 'Conversation'}
            headerLeftIcon={'chevron-back'}
            headerRightComponent={
              <TouchableOpacity onPress={openProfile} activeOpacity={0.7}>
                <ImageWithFallback
                  source={{ uri: getAvatarUri(selectedConversation?.avatar_url) }}
                  fallback={Images.profile}
                  style={styles.convoProfilePic}
                />
              </TouchableOpacity>
            }
            onHeaderLeftPress={() => navigation?.goBack()}
            onHeaderTitlePress={openProfile}
          />
        </View>
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading messages...</Text>
              <ActivityIndicator size="large" color={Colors.secondary} style={{ marginTop: 12 }} />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          ) : (
          <ScrollView
            contentContainerStyle={{
              padding: 16,
              flexGrow: 1,
              justifyContent: 'flex-end',
            }}
            ref={messagesEndRef}
            onContentSizeChange={(contentWidth, contentHeight) => {
              messagesEndRef.current?.scrollTo({
                y: contentHeight,
                animated: true,
              });
            }}
            onLayout={() => {
              setTimeout(() => {
                messagesEndRef.current?.scrollToEnd?.({ animated: false });
              }, 50);
            }}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((item, idx) => (
              <View key={`${item.id}-${item.created_at}-${idx}`}>
                {renderMessage({ item })}
              </View>
            ))}
            <View style={{ height: 1 }} />
          </ScrollView>
          )}
          <View
            style={[
              styles.messagesContainer,
              {
                flexDirection: 'row',
                alignItems: 'flex-start',
                margin: Spacing.lg,
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <CustomTextInput
                placeholder="Type your message..."
                value={newMessage}
                onChangeText={setNewMessage}
                autoCapitalize={'none'}
                keyboardType={'default'}
                multiline
              />
            </View>
            <TouchableOpacity
              style={styles.sendButton}
              disabled={sending || !newMessage.trim()}
              onPress={handleSendMessage}
            >
              <Ionicons name="send" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.purple200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  messagesContainer: {
    backgroundColor: Colors.textInputBg,
    borderRadius: 12,
  },
  messageBubble: {
    marginVertical: 6,
    marginHorizontal: 8,
    padding: 14,
    borderRadius: 18,
    maxWidth: '75%',
  },
  messageBubbleLeft: {
    backgroundColor: Colors.purple850, // lighter neutral for received
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: Colors.secondary, // vibrant brand color for sent
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  messageText: {
    ...(TextStyles.body || {}),
    color: Colors.white, // dark text for light bg, light text for dark bg (handled below)
  },
  messageTime: {
    ...(TextStyles.captionSmall || {}),
    color: Colors.white,
    marginTop: 4,
    textAlign: 'right',
  },
  inputRow: {
    padding: Spacing.sm,
    ...Shadows.small,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    marginTop: 20,
    marginRight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  emptyText: {
    ...(TextStyles.bodyMedium || {}),
    color: Colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
  convoProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
});
