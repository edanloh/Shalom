import { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Colors, TextStyles } from "@/constants";
import externalStyles from "@styles/styles";

const SplashScreen = ({ onFinish }: { onFinish?: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 1000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={[externalStyles.container, pageStyles.container]}>
      <View style={pageStyles.logo}>
        <Image
          source={require("@assets/shalom.png")}
          style={externalStyles.logo}
        />
        <Text style={[TextStyles.h2]}>Shalom</Text>
      </View>
    </View>
  );
};

const pageStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SplashScreen;
