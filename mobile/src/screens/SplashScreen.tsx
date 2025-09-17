import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Colors, TextStyles } from "../constants";

const SplashScreen = ({ onFinish }: { onFinish?: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 1000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Image
          source={require("@assets/shalom.png")}
          style={{ width: 120, height: 120, resizeMode: "contain" }}
        />
        <Text style={styles.title}>Shalom</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...TextStyles.h1,
    marginBottom: 8,
    letterSpacing: 1,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SplashScreen;
