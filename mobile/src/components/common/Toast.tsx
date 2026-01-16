import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, Text, Easing, DeviceEventEmitter } from "react-native";
import { Colors, Spacing, TextStyles } from "@/constants";

export type ToastPayload = {
  message: string;
  title?: string;
  type?: "success" | "error" | "info";
  durationMs?: number;
  skipInApp?: boolean;
};

export const TOAST_CHANNEL = "toast:show";

export function showToast(payload: ToastPayload) {
  DeviceEventEmitter.emit(TOAST_CHANNEL, payload);
}

export default function ToastHost() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueRef = useRef<ToastPayload[]>([]);
  const showingRef = useRef(false);

  useEffect(() => {
    const showNext = (payload: ToastPayload) => {
      showingRef.current = true;
      setToast(payload);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      timeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -80,
            duration: 160,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setToast(null);
          showingRef.current = false;
          const next = queueRef.current.shift();
          if (next) showNext(next);
        });
      }, payload.durationMs ?? 2200);
    };

    const sub = DeviceEventEmitter.addListener(TOAST_CHANNEL, (payload: ToastPayload) => {
      if (showingRef.current) {
        queueRef.current.push(payload);
        return;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      showNext(payload);
    });

    return () => {
      sub.remove();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [opacity, translateY]);

  if (!toast) return null;

  const tint =
    toast.type === "success"
      ? Colors.secondary
      : toast.type === "error"
      ? "#ef4444"
      : Colors.textSecondary;
  const borderTint = "#22c55e";

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlay]}>
      <Animated.View
        style={[
          styles.toast,
          {
            transform: [{ translateY }],
            opacity,
            borderColor: borderTint,
          },
        ]}
      >
        {toast.title ? (
          <Text style={[TextStyles.body, styles.title, { color: tint }]}>{toast.title}</Text>
        ) : null}
        <Text style={[TextStyles.body, styles.message]} numberOfLines={2}>
          {toast.message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    position: "absolute",
    left: Spacing.xl,
    right: Spacing.xl,
    top: Spacing["2xl"],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: "#1f1f25",
    borderRadius: 14,
    borderWidth: 0.2,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontWeight: "600",
    marginBottom: 4,
  },
  message: {
    color: Colors.white,
  },
});
