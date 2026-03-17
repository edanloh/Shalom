import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import { useUser } from "./UserContext";

type ConversationSummary = {
  unread_messages?: number;
};

type MessageContextType = {
  unreadMessageCount: number;
  hasUnreadMessages: boolean;
  refreshUnreadMessages: () => Promise<void>;
};

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const userId = user?.uuid;

  const refreshUnreadMessages = async () => {
    if (!userId) {
      setUnreadMessageCount(0);
      return;
    }

    const { data, error } = await supabase.rpc(
      "get_direct_message_conversations",
      { user_id: userId },
    );

    if (error) {
      console.warn("Failed to refresh unread messages:", error);
      return;
    }

    const totalUnread = ((data as ConversationSummary[] | null) || []).reduce(
      (sum, convo) => sum + Number(convo.unread_messages || 0),
      0,
    );

    setUnreadMessageCount(totalUnread);
  };

  useEffect(() => {
    let isMounted = true;

    const refreshIfMounted = async () => {
      if (!isMounted) return;
      await refreshUnreadMessages();
    };

    refreshIfMounted();

    if (!userId) {
      return () => {
        isMounted = false;
      };
    }

    const messageChannel = supabase
      .channel("message-context-unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        (payload) => {
          const message = payload.new || payload.old;
          if (
            message &&
            (message.sender_id === userId || message.recipient_id === userId)
          ) {
            refreshIfMounted();
          }
        },
      )
      .subscribe();

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshIfMounted();
      }
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(messageChannel);
      appStateSubscription.remove();
    };
  }, [userId]);

  const value = useMemo(
    () => ({
      unreadMessageCount,
      hasUnreadMessages: unreadMessageCount > 0,
      refreshUnreadMessages,
    }),
    [unreadMessageCount],
  );

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessageProvider");
  }
  return context;
}
