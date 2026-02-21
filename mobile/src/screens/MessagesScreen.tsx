import { useEffect, useState, useRef, useCallback } from 'react';
import { Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/common/Screen';
import { Colors, Spacing, TextStyles, Shadows } from '../constants';
import { useUser } from '../contexts/UserContext';
import { supabase } from '@/lib/supabase';
import externalStyles from '@styles/styles';
import { ImageWithFallback } from '../components/common';
import { Images } from '../../assets';
import { fetchUserProfileById } from '@/services/userService';
import CustomModal from '../components/common/CustomModal';
import { ActionButton, CustomTextInput } from '@/components';
import { fetchAllUsers } from '@/services/userService';

// Types
type Conversation = {
  id: string | number;
  name: string;
  last_message?: string;
  last_message_time?: string;
  avatar_url?: string;
  unread_messages?: number;
};
type Message = {
  id: string | number;
  sender_id: string | number;
  recipient_id: string | number;
  content: string;
  created_at: string;
};

export default function MessagesScreen() {
  const { user } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const navigation = useNavigation() as any;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<FlatList<Message>>(null);
  const lastScrollY = useRef(0);
  const tabHidden = useRef(false);

  const [allUsers, setAllUsers] = useState<any[]>([]);

  const loadUsers = async () => {
    try {
      const response = await fetchAllUsers();
      // Filter out current user from list of all users
      const filteredUsers = response.filter((u) => u.id !== user?.uuid);
      setAllUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [user]);

  const [showNewConvoModal, setShowNewConvoModal] = useState(false);
  const [newConvoUser, setNewConvoUser] = useState('');
  const [creatingConvo, setCreatingConvo] = useState(false);
  // Create new conversation
  const handleCreateConversation = async () => {
    if (!newConvoUser.trim() || creatingConvo || !user) return;
    setCreatingConvo(true);
    // Find user by username/email
    const userData = allUsers.filter(
      (u) =>
        u.username?.toLowerCase() === newConvoUser.toLowerCase() ||
        u.email?.toLowerCase() === newConvoUser.toLowerCase(),
    );
    console.log('Creating conversation with user:', userData);
    if (!userData || userData.length === 0) {
      setCreatingConvo(false);
      alert('User not found');
      return;
    }
    const otherUser = userData[0];
    // Check if conversation already exists
    console.log(
      'Checking for existing conversation with user:',
      conversations,
      otherUser,
    );
    const existing = conversations.find((c) => c.id === otherUser.id);
    let conversation;
    if (existing) {
      conversation = existing;
    } else {
      // Create new conversation (insert a starter message)
      const { error: msgError } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.uuid,
          recipient_id: otherUser.id,
          content: '[Conversation started]',
        });
      console.log('Insert conversation result:', { msgError });
      if (msgError) {
        setCreatingConvo(false);
        alert('Failed to start conversation');
        return;
      }
      // Fetch updated conversation
      const { data: newConvoData } = await supabase.rpc(
        'get_direct_message_conversations',
        { user_id: user.uuid },
      );
      conversation = (newConvoData || []).find(
        (c: { id: any }) => c.id === otherUser.id,
      );
    }
    setCreatingConvo(false);
    setShowNewConvoModal(false);
    setNewConvoUser('');
    if (conversation) {
      navigation.navigate('Conversation', { conversation });
    } else {
      alert('Failed to start conversation');
    }
  };

  const getAvatarUri = (avatar_url?: string) => {
    const uri = avatar_url
      ? `https://cmtfxsntlfoxgcznanpe.supabase.co/storage/v1/object/public/profilepics/${avatar_url}`
      : Images.profile;
    return uri.toString();
  };

  // Fetch conversations
  const fetchConversations = async () => {
    if (!user) return;
    // console.log('Fetching conversations for user:', user);
    const { data, error } = await supabase.rpc(
      'get_direct_message_conversations',
      { user_id: user.uuid },
    );
    // Run getUserInfo for each via fetchUserProfile to get name/avatar
    if (!error && data) {
      const enrichedConvos = await Promise.all(
        (data as Conversation[]).map(async (convo) => {
          const profile = await fetchUserProfileById(convo.id.toString());

          return { ...convo, avatar_url: profile.avatar_url };
        }),
      );
      setConversations(enrichedConvos);
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (convo: Conversation) => {
    if (!user || !convo) return;
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${user.uuid},recipient_id.eq.${user.uuid}`)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setMessages(
        (data as Message[]).filter(
          (m) => m.sender_id === convo.id || m.recipient_id === convo.id,
        ),
      );
    }
  };

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchConversations();
    }, [user]),
  );

  // Subscribe to update conversations list when new messages arrive
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('direct_messages_conversations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as Message;
          // Refresh conversations if message involves current user
          if (msg.sender_id === user.uuid || msg.recipient_id === user.uuid) {
            console.log('New message detected, refreshing conversations');
            fetchConversations();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (selectedConversation) fetchMessages(selectedConversation);
  }, [selectedConversation]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchConversations();
      if (selectedConversation) {
        await fetchMessages(selectedConversation);
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedConversation]);

  // Mark messages as read
  const markMessagesAsRead = async (convo: Conversation) => {
    if (!user) return;
    const { error } = await supabase.rpc('mark_messages_as_read', {
      sender_id: convo.id,
      recipient_id: user.uuid,
    });
    if (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  // Render avatar (first letter fallback)
  const renderAvatar = (convo: Conversation) => (
    <ImageWithFallback
      source={{ uri: getAvatarUri(convo.avatar_url) }}
      fallback={Images.profile}
      style={styles.convoProfilePic}
    />
  );

  // Conversation item
  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[
        styles.compactCard,
        item.unread_messages
          ? { borderColor: Colors.secondary, borderWidth: 1, borderRadius: 16 }
          : { borderWidth: 0 },
      ]}
      onPress={() => {
        markMessagesAsRead(item);
        navigation.navigate('Conversation', { conversation: item });
      }}
    >
      <LinearGradient
        colors={['#3A3A45', '#3A3A45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.compactGradient}
      >
        <View style={styles.compactHeader}>
          <View>{renderAvatar(item)}</View>
          <View style={{ flex: 1, paddingHorizontal: Spacing.base }}>
            <Text style={[TextStyles.bodyMedium, { marginBottom: 2 }]}>
              {item.name}
            </Text>
            <Text style={TextStyles.captionSmall} numberOfLines={1}>
              {item.last_message || 'No messages yet'}
            </Text>
            <Text style={TextStyles.captionSmall}>
              {item.last_message_time
                ? new Date(item.last_message_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour12: true,
                  })
                : ''}
            </Text>
          </View>
          {item.unread_messages ? (
            <View style={styles.compactScore}>
              <Text style={[TextStyles.captionSmall, { color: Colors.white }]}>
                {item.unread_messages}
              </Text>
            </View>
          ) : null}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.textSecondary}
            style={{ marginLeft: Spacing.xs }}
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <Screen
      title="Messages"
      customEdges={['top', 'left', 'right', 'bottom']}
      refreshing={refreshing}
      onRefresh={onRefresh}
      useScrollView={false}
      disableChildrenWrapper
      stickyHeader
      headerRightComponent={
        <TouchableOpacity
          onPress={() => setShowNewConvoModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}
        >
          <Ionicons name="chatbubble-ellipses" size={28} color={Colors.white} />
          <Ionicons name="add" size={15} color={Colors.white} />
        </TouchableOpacity>
      }
      headerLeftComponent={
        <TouchableOpacity onPress={() => onRefresh()} style={{ padding: 8 }}>
          <Ionicons name="reload" size={24} color={Colors.white} />
        </TouchableOpacity>
      }
    >
      {refreshing ? (
        <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={[TextStyles.bodyMedium, { marginTop: 12 }]}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderConversation}
          horizontal={false}
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
          contentContainerStyle={[
            externalStyles.fullScrollContent,
            externalStyles.scrollContent,
            { paddingBottom: 136 }, // 16 + 120 for footer spacing
          ]}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            const dy = y - lastScrollY.current;
            if (Math.abs(dy) < 8) return;
            if (dy > 0 && y > 40 && !tabHidden.current) {
              tabHidden.current = true;
              DeviceEventEmitter.emit('tabbar:toggle', { visible: false });
            } else if (dy < 0 && tabHidden.current) {
              tabHidden.current = false;
              DeviceEventEmitter.emit('tabbar:toggle', { visible: true });
            }
            lastScrollY.current = y;
          }}
          ListFooterComponent={<View style={{ height: 0 }} />}
        />
      )}
      {/* Modal for new conversation */}
      <CustomModal
        visible={showNewConvoModal}
        onClose={() => setShowNewConvoModal(false)}
      >
        <Text style={[TextStyles.h5]}>Start a new conversation</Text>
        <CustomTextInput
          placeholder="Enter username"
          value={newConvoUser}
          onChangeText={setNewConvoUser}
          autoCapitalize={'none'}
          keyboardType={'default'}
        />
        {/* Short filtered user list */}
        {newConvoUser.trim() && (
          <View style={{ maxHeight: 300, marginBottom: 12 }}>
            {allUsers
              .filter(
                (u) =>
                  u.username
                    ?.toLowerCase()
                    .includes(newConvoUser.toLowerCase()) ||
                  u.email?.toLowerCase().includes(newConvoUser.toLowerCase()),
              )
              .slice(0, 3)
              .map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 10,
                    marginVertical: 4,
                    backgroundColor: Colors.primary,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: Colors.gray500,
                  }}
                  onPress={() => setNewConvoUser(u.username || u.email)}
                >
                  <View>
                    <Text style={[TextStyles.body]}>{u.name}</Text>
                    <Text
                      style={[TextStyles.bodySmall, { fontWeight: 'normal' }]}
                    >
                      {u.email}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}
        <ActionButton
          style={{
            backgroundColor: Colors.secondary,
            borderRadius: 8,
            padding: 12,
            alignItems: 'center',
          }}
          disabled={creatingConvo || !newConvoUser.trim()}
          onPress={handleCreateConversation}
          text={creatingConvo ? 'Starting...' : 'Start Conversation'}
        />
      </CustomModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  convoListContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 8,
    marginTop: 8,
    ...Shadows.small,
  },
  convoItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    borderRadius: 12,
    marginVertical: 2,
    backgroundColor: Colors.white,
  },
  convoItemSelected: {
    backgroundColor: Colors.purple150,
    borderColor: Colors.secondary,
    borderWidth: 1,
    ...Shadows.small,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.purple200,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.secondary,
  },
  convoName: {
    ...(TextStyles.bodyMedium || {}),
    fontWeight: '600' as const,
    color: Colors.purple850,
    marginBottom: 2,
  },
  convoLastMsg: {
    ...(TextStyles.caption || {}),
    color: Colors.textMuted,
    marginTop: 0,
  },
  convoTime: {
    ...(TextStyles.captionSmall || {}),
    color: Colors.textMuted,
    marginLeft: 8,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  messageBubble: {
    marginVertical: 6,
    marginHorizontal: 8,
    padding: 14,
    borderRadius: 18,
    maxWidth: '75%' as const,
    ...Shadows.small,
  },
  messageBubbleLeft: {
    backgroundColor: Colors.secondary, // lighter neutral for received
    alignSelf: 'flex-start' as const,
    borderTopLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: Colors.secondary, // vibrant brand color for sent
    alignSelf: 'flex-end' as const,
    borderTopRightRadius: 4,
  },
  messageText: {
    ...(TextStyles.bodyMedium || {}),
    color: Colors.white, // dark text for light bg, light text for dark bg (handled below)
  },
  messageTime: {
    ...(TextStyles.captionSmall || {}),
    color: Colors.white,
    marginTop: 4,
    textAlign: 'right' as const,
  },
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Shadows.small,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...Shadows.small,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingBottom: 40,
  },
  emptyText: {
    ...(TextStyles.bodyMedium || {}),
    color: Colors.textMuted,
    marginTop: 12,
    textAlign: 'center' as const,
  },
  // Compact Card Styles
  compactCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.base,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  compactGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A45',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  compactIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactScore: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  convoProfilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
});
