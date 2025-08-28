import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function NotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'course',
      title: 'New lesson available',
      message: 'Chapter 5: Advanced React Patterns is now available in your Web Development course',
      time: '2 hours ago',
      read: false,
      icon: <Ionicons name="play-circle" size={20} color="#8B5CF6" />,
      color: '#8B5CF6'
    },
    {
      id: '2',
      type: 'achievement',
      title: 'Congratulations!',
      message: 'You have completed 5 courses this month. Keep up the great work!',
      time: '1 day ago',
      read: false,
      icon: <FontAwesome5 name="trophy" size={20} color="#fbbf24" />,
      color: '#fbbf24'
    },
    {
      id: '3',
      type: 'reminder',
      title: 'Study reminder',
      message: 'Don\'t forget to continue your Machine Learning course today',
      time: '2 days ago',
      read: true,
      icon: <Ionicons name="time-outline" size={20} color="#10b981" />,
      color: '#10b981'
    },
    {
      id: '4',
      type: 'social',
      title: 'New comment',
      message: 'Sarah Chen replied to your question in the UI/UX Design course forum',
      time: '3 days ago',
      read: true,
      icon: <Ionicons name="chatbubble-outline" size={20} color="#06b6d4" />,
      color: '#06b6d4'
    },
    {
      id: '5',
      type: 'system',
      title: 'App update available',
      message: 'Version 2.1 is now available with new features and improvements',
      time: '1 week ago',
      read: true,
      icon: <Ionicons name="download-outline" size={20} color="#6b7280" />,
      color: '#6b7280'
    }
  ]);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const renderNotification = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={[styles.notificationIcon, { backgroundColor: item.color + '20' }]}>
        {item.icon}
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
          {item.title}
        </Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteNotification(item.id)}
      >
        <Ionicons name="close" size={16} color="#9ca3af" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        style={styles.notificationsList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  markAllButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#8B5CF6', borderRadius: 6 },
  markAllText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  notificationsList: { flex: 1 },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadNotification: { backgroundColor: '#f8fafc', borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  notificationIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 16, color: '#1f2937', marginBottom: 4 },
  unreadTitle: { fontWeight: '600' },
  notificationMessage: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 4 },
  notificationTime: { fontSize: 12, color: '#9ca3af' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B5CF6', marginTop: 8, marginLeft: 8 },
  deleteButton: { padding: 4, marginLeft: 8 },
});
