import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'NotFound'>;

const NotFoundScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.subtitle}>Oops! Page not found</Text>
        <Pressable onPress={() => navigation.replace('Home')} style={styles.link}>
          <Text style={styles.linkText}>Return to Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  code: { fontSize: 40, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#4b5563', marginBottom: 16 },
  link: { paddingVertical: 8, paddingHorizontal: 12 },
  linkText: { color: '#2563eb', textDecorationLine: 'underline', fontSize: 16 },
});

export default NotFoundScreen;


