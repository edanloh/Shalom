import { useState } from "react";
import { View, Text, Image, Switch } from "react-native";
import styles from "@/styles/styles";
import { Colors, Spacing, TextStyles } from "@/constants";
import { Screen } from "@/components";

export default function TestScreen({ navigation, route }: any) {
  return (
    <Screen
      title="A"
      navigation={navigation}
      showSettingsButton
      onSettingsPress={() => {}}
    >
      <View
        style={[
          styles.header,
          { marginBottom: 32, backgroundColor: Colors.secondary },
        ]}
      >
        {/* Test Screen Content */}
        <Text
          style={[TextStyles.h2, { marginBottom: Spacing.md, color: "white" }]}
        >
          This is a Test Screen
        </Text>
        <Text style={[TextStyles.body, { color: "white" }]}>
          Use this screen to test navigation and other functionalities.
        </Text>
      </View>
    </Screen>
  );
}
