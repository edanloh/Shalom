import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";

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
          source={require("../assets/shalom.png")}
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
    backgroundColor: "#564beb",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffffff",
    marginBottom: 8,
    letterSpacing: 1,
    fontFamily: "Lexend-Regular",
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
