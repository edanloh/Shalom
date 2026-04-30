import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { BorderRadius, Colors, Spacing, TextStyles } from "@/constants";
import type { MainStackParamList } from "@/types/navigation";
import { generateCertificatePdfFromHtml } from "@/utils/certificate";

type CertificateViewerRouteProp = RouteProp<
  MainStackParamList,
  "CertificateViewer"
>;
type CertificateViewerNavigationProp = StackNavigationProp<
  MainStackParamList,
  "CertificateViewer"
>;

export default function CertificateViewerScreen() {
  const navigation = useNavigation<CertificateViewerNavigationProp>();
  const route = useRoute<CertificateViewerRouteProp>();
  const { certificate, html } = route.params;
  const [sharing, setSharing] = useState(false);
  const { width, height } = useWindowDimensions();
  const headerHeight = 56;
  const sheetWidth = 1040;
  const sheetHeight = 600;
  const viewerPadding = 24;
  const certificateScale = Math.min(
    (width - viewerPadding) / sheetWidth,
    (height - headerHeight - viewerPadding) / sheetHeight,
    1
  );

  const viewerHtml = useMemo(
    () =>
      html.replace(
        "</style>",
        `
      html {
        width: 100%;
        height: 100%;
        background: #000000;
      }
      body {
        width: 100vw;
        height: 100vh;
        margin: 0;
        padding: 0 !important;
        background: #000000;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .certificate {
        width: 1040px !important;
        height: 600px !important;
        min-height: 600px !important;
        flex: none;
        transform: scale(${certificateScale});
        transform-origin: center center;
      }
      .layout {
        height: 600px !important;
        min-height: 600px !important;
      }
      </style>`
      ),
    [certificateScale, html]
  );

  const handleShare = useCallback(async () => {
    try {
      setSharing(true);
      const uri = await generateCertificatePdfFromHtml(html);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Sharing unavailable", "Sharing is not available on this device.");
        return;
      }
      setSharing(false);
      await Sharing.shareAsync(uri, {
        UTI: "com.adobe.pdf",
        mimeType: "application/pdf",
        dialogTitle: "Share certificate",
      });
    } catch (error) {
      console.warn("Failed to share certificate:", error);
      Alert.alert("Error", "Unable to share certificate.");
    } finally {
      setSharing(false);
    }
  }, [html]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {certificate.courseName || "Certificate"}
        </Text>

        <TouchableOpacity
          accessibilityLabel="Share certificate"
          style={[styles.iconButton, sharing && styles.iconButtonDisabled]}
          onPress={handleShare}
          activeOpacity={0.7}
          disabled={sharing}
        >
          <Ionicons name="share-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <WebView
        originWhitelist={["*"]}
        source={{ html: viewerHtml }}
        style={styles.viewer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    height: 56,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3A3A45",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
  },
  iconButtonDisabled: {
    opacity: 0.45,
  },
  title: {
    ...TextStyles.bodyMedium,
    flex: 1,
    color: Colors.white,
    textAlign: "center",
  },
  viewer: {
    flex: 1,
    backgroundColor: Colors.black,
  },
});
