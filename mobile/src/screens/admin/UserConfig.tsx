import { useState } from "react";
import { View, Text, Image, Switch, Button } from "react-native";
import styles from "@/styles/styles";
import { Colors, Spacing, TextStyles } from "@/constants";
import { ActionButton, Screen } from "@/components";

export default function UserConfigScreen({ navigation, route }: any) {
  const { user } = route.params || {};

  const [isInstructor, setIsInstructor] = useState(user.role === "instructor");
  const [isActivated, setIsActivated] = useState(false);

  return (
    <Screen
      title="Configure User"
      navigation={navigation}
      headerLeftIcon="chevron-back"
    >
      {!user? (
        <View style={[styles.container, {paddingHorizontal: Spacing.lg }]}>
        <View>
          <Text
            style={[styles.infoText, { textAlign: "center", marginTop: 50 }]}
          >
            No user data found. Please go back and try again.
          </Text>
        </View>
      </View>
      ) : (
        <>
          <View style={[styles.header, { marginBottom: 32 }]}>
            <View style={[styles.logo, { marginBottom: 16 }]}>
              <Image
                source={require("@assets/profile.png")}
                style={{ width: 100, height: 100, resizeMode: "contain" }}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={[TextStyles.h3, { marginBottom: Spacing.sm }]}>
                {user?.name || "Unknown User"}
              </Text>
              {user?.authProvider && user?.authProvider == "Google" && (
                <Image
                  source={require("@assets/google.png")}
                  style={{
                    width: 24,
                    height: 24,
                    resizeMode: "contain",
                    marginLeft: 12,
                    marginBottom: 8,
                  }}
                />
              )}
            </View>
            <Text style={TextStyles.bodyMedium}>
              {user?.email || "Unknown Email"}
            </Text>
          </View>
          <View>
            <Text style={TextStyles.h4}>Account Settings</Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                backgroundColor: Colors.primary,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={TextStyles.body}>Instructor</Text>
              </View>
              <Switch
                onValueChange={setIsInstructor}
                value={isInstructor}
                trackColor={{
                  false: Colors.gray500,
                  true: Colors.secondary,
                }}
                thumbColor="#fff"
                ios_backgroundColor={Colors.backgroundGray}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                backgroundColor: Colors.primary,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={TextStyles.body}>Account Activated</Text>
              </View>
              <Switch
                onValueChange={setIsActivated}
                value={isActivated}
                trackColor={{
                  false: Colors.gray500,
                  true: Colors.secondary,
                }}
                thumbColor="#fff"
                ios_backgroundColor={Colors.backgroundGray}
              />
            </View>
          </View>
          <ActionButton
            text="Test Screen"
            onPress={() => navigation.navigate("TestScreen")}
          />
        </> 
      )}
    </Screen>
  );
}
