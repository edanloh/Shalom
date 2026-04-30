import { View, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { ReactNode } from "react";

type CustomModalProps = {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  children: ReactNode;
};

export default function CustomModal({
  visible,
  onClose,
  onDismiss,
  children,
}: CustomModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <BlurView
            intensity={20}
            tint="dark"
            style={styles.modalBlur}
            experimentalBlurMethod="dimezisBlurView"
            blurReductionFactor={2}
          >
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>

            {children}
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.overlay,
    pointerEvents: "auto",
  },
  modalContent: {
    width: "90%",
    maxWidth: 500,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.large,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  modalBlur: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "#475569",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
