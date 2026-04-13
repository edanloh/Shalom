import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing } from '../../constants';
import { getAllCategories, type Category } from '../../services/courseService';

interface Props {
  visible: boolean;
  onConfirm: (selected: string[]) => void;
  onSkip: () => void;
}

export default function InterestSelectionModal({ visible, onConfirm, onSkip }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getAllCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const toggle = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>What are you interested in?</Text>
          <Text style={styles.subtitle}>
            Pick a few topics to personalise your recommendations.
          </Text>

          {loading ? (
            <ActivityIndicator color={Colors.purple400} style={{ marginVertical: 32 }} />
          ) : (
            <ScrollView
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 280 }}
            >
              {categories.map(cat => {
                const isSelected = selected.has(cat.name);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggle(cat.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.confirm, selected.size === 0 && styles.confirmDisabled]}
            onPress={() => selected.size > 0 && onConfirm([...selected])}
            disabled={selected.size === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmText}>Show my recommendations</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skip} onPress={onSkip} activeOpacity={0.6}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray800,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray500,
    marginBottom: 20,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: '#F8F8F8',
  },
  chipSelected: {
    borderColor: Colors.purple400,
    backgroundColor: Colors.purple200,
  },
  chipText: {
    fontSize: 14,
    color: Colors.gray500,
  },
  chipTextSelected: {
    color: Colors.purple400,
    fontWeight: '600',
  },
  confirm: {
    backgroundColor: Colors.purple400,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipText: {
    color: Colors.gray500,
    fontSize: 14,
  },
});
