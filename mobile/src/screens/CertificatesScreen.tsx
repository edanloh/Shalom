import { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { Spacing, TextStyles, Colors, BorderRadius } from "../constants";
import Screen from "../components/common/Screen";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActionButton, CustomTextInput } from "@/components";
import CustomModal from "../components/common/CustomModal";
import creditService from "../services/creditService";
import { CertificateProgress } from "../types";
import { useAuth } from "../contexts/AuthContext";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

type Certificate = {
  id: string;
  courseName: string;
  instructor: string;
  completedAt: string; // ISO date
  credentialId: string;
  score?: number;
  duration: string;
};

const PAGE_SIZE = 20;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const buildCertificateHtml = (cert: Certificate) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Certificate</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #0f172a; }
      .card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 32px; }
      .title { font-size: 28px; font-weight: 700; margin-bottom: 12px; }
      .subtitle { font-size: 16px; color: #475569; margin-bottom: 24px; }
      .name { font-size: 22px; font-weight: 600; margin: 12px 0 24px; }
      .row { margin: 8px 0; font-size: 14px; }
      .label { color: #64748b; display: inline-block; width: 120px; }
      .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="title">Certificate of Completion</div>
      <div class="subtitle">This certifies that the learner has completed</div>
      <div class="name">${cert.courseName}</div>
      <div class="row"><span class="label">Instructor</span>${cert.instructor || "Shalom"}</div>
      <div class="row"><span class="label">Completed</span>${formatDate(cert.completedAt)}</div>
      <div class="row"><span class="label">Credential ID</span>${cert.credentialId}</div>
      <div class="footer">Issued by Shalom Learning Platform</div>
    </div>
  </body>
</html>
`;

export default function CertificatesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [query, setQuery] = useState("");
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);

  const mapFromProgress = useCallback(
    (items: CertificateProgress[] = []): Certificate[] =>
      items.map((c) => ({
        id: c.id,
        courseName: c.name,
        instructor: "",
        completedAt: (c as any).issuedAt || new Date().toISOString(),
        credentialId: c.id.toUpperCase(),
        score: c.progressPercent,
        duration: `${c.completedCourses}/${c.requiredCourses} courses`,
      })),
    []
  );

  const loadCerts = useCallback(async () => {
    if (!user?.id) {
      setCertificates([]);
      setNextOffset(0);
      setHasMore(false);
      return;
    }
    setLoading(true);
    try {
      const remote = await creditService.getCertificates(user.id, {
        limit: PAGE_SIZE,
        offset: 0,
      }).catch((err: any) => {
        const status = err?.status ?? err?.statusCode;
        const msg = (err as any)?.message || "";
        // Swallow missing function errors and treat as empty
        if (status === 404 || msg.toLowerCase().includes("function was not found")) {
          console.warn("Certificates endpoint not found; showing empty list.");
          return [];
        }
        throw err;
      });
      const mapped = Array.isArray(remote) && remote.length ? mapFromProgress(remote) : [];
      setCertificates(mapped);
      setNextOffset(mapped.length);
      setHasMore(mapped.length === PAGE_SIZE);
    } catch (err) {
      console.warn("Certificates: failed to load", err);
      setCertificates([]);
      setNextOffset(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [mapFromProgress, user?.id]);

  useEffect(() => {
    loadCerts();
  }, [loadCerts, user?.id]);

  const filteredCertificates = useMemo(() => {
    const base = certificates.length ? certificates : [];
    const sorted = [...base].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    // Filter by search query
    if (!query.trim()) {
      return sorted;
    }

    const searchLower = query.toLowerCase();
    return sorted.filter(
      (cert) =>
        cert.courseName.toLowerCase().includes(searchLower) ||
        cert.instructor.toLowerCase().includes(searchLower) ||
        cert.credentialId.toLowerCase().includes(searchLower)
    );
  }, [query, certificates]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadCerts();
    } finally {
      setRefreshing(false);
    }
  }, [loadCerts]);

  const loadMoreCerts = useCallback(async () => {
    if (!user?.id || loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const startOffset = nextOffset;
      const remote = await creditService.getCertificates(user.id, {
        limit: PAGE_SIZE,
        offset: startOffset,
      }).catch((err: any) => {
        const status = err?.status ?? err?.statusCode;
        const msg = (err as any)?.message || "";
        if (status === 404 || msg.toLowerCase().includes("function was not found")) {
          return [];
        }
        throw err;
      });
      const mapped = Array.isArray(remote) && remote.length ? mapFromProgress(remote) : [];
      setCertificates((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        return [...prev, ...mapped.filter((item) => !existing.has(item.id))];
      });
      setNextOffset(startOffset + mapped.length);
      setHasMore(mapped.length === PAGE_SIZE);
    } catch (err) {
      console.warn("Certificates: failed to load more", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, mapFromProgress, nextOffset, user?.id]);

  const generateCertificatePdf = useCallback(async (cert: Certificate) => {
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Certificate download isn't supported on web.");
      return null;
    }
    const html = buildCertificateHtml(cert);
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  }, []);

  const handleShare = useCallback(async () => {
    if (!selectedCert) return;
    try {
      const uri = await generateCertificatePdf(selectedCert);
      if (!uri) return;
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Sharing unavailable", "Sharing is not available on this device.");
        return;
      }
      await Sharing.shareAsync(uri, {
        UTI: "com.adobe.pdf",
        mimeType: "application/pdf",
        dialogTitle: "Share certificate",
      });
    } catch (error) {
      console.warn("Failed to share certificate:", error);
      Alert.alert("Error", "Unable to share certificate.");
    }
  }, [generateCertificatePdf, selectedCert]);

  const handleDownload = undefined;

  return (
    <Screen
      title="Certificates"
      customEdges={["top", "left", "right", "bottom"]}
      headerLeftIcon="chevron-back"
      onHeaderLeftPress={() => navigation.goBack()}
      stickyHeader
      useScrollView={false}
      disableChildrenWrapper
    >
      <FlatList
        data={filteredCertificates}
        keyExtractor={(item) => item.id}
        renderItem={({ item: cert }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.compactCard}
            onPress={() => setSelectedCert(cert)}
          >
            <LinearGradient
              colors={["#3A3A45", "#3A3A45"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.compactGradient}
            >
              <View style={styles.compactHeader}>
                <View style={styles.compactIconContainer}>
                  <Ionicons name="ribbon" size={20} color={Colors.yellow} />
                </View>
                <View style={{ flex: 1, paddingHorizontal: Spacing.base }}>
                  <Text style={[TextStyles.bodyMedium, { marginBottom: 2 }]}>
                    {cert.courseName}
                  </Text>
                  <Text style={TextStyles.captionSmall}>
                    {cert.instructor} •{" "}
                    {formatDate(cert.completedAt).split(",")[0]}
                  </Text>
                </View>
                {cert.score && (
                  <View style={styles.compactScore}>
                    <Text
                      style={[
                        TextStyles.captionSmall,
                        { fontWeight: "700", color: "#1E293B" },
                      ]}
                    >
                      {cert.score}%
                    </Text>
                  </View>
                )}
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={Colors.textSecondary}
                  style={{ marginLeft: Spacing.xs }}
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.secondary}
            colors={[Colors.secondary]}
          />
        }
        ListHeaderComponent={
          <>
            <CustomTextInput
              placeholder="Search for certificates..."
              value={query}
              onChangeText={setQuery}
              autoCapitalize={"none"}
              leftIconName="search"
              returnKeyType="search"
            />
            <View style={{ marginVertical: Spacing.sm }}>
              <Text style={[TextStyles.h5]}>
                {certificates.length} Certificate
                {certificates.length !== 1 ? "s" : ""} {query ? "Found" : "Earned"}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Colors.secondary} />
            </View>
          ) : query ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={Colors.textMuted} />
              <Text style={[TextStyles.h4, { marginTop: Spacing.md }]}>
                No Certificates Found
              </Text>
              <Text
                style={[
                  TextStyles.caption,
                  { marginTop: Spacing.xs, textAlign: "center" },
                ]}
              >
                Try searching with a different course name or instructor
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={64} color={Colors.textMuted} />
              <Text style={[TextStyles.h4, { marginTop: Spacing.md }]}>
                No Certificates Yet
              </Text>
              <Text style={[TextStyles.caption, { marginTop: Spacing.xs }]}>
                Complete courses to earn certificates
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footer}>
              {loadingMore ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : null}
            </View>
          ) : (
            <View style={styles.footer} />
          )
        }
        onEndReached={loadMoreCerts}
        onEndReachedThreshold={0.6}
      />

      {/* Certificate Detail Modal */}
      <CustomModal
        visible={selectedCert !== null}
        onClose={() => setSelectedCert(null)}
      >
        {/* Certificate Icon */}
        <View style={styles.modalIconContainer}>
          <Ionicons name="ribbon" size={48} color={Colors.yellow} />
        </View>

        <Text
          style={[
            TextStyles.h3,
            { textAlign: "center", marginBottom: Spacing.md },
          ]}
        >
          {selectedCert?.courseName}
        </Text>

        {/* Score Badge */}
        {selectedCert?.score && (
          <View
            style={[
              styles.scoreBadge,
              { alignSelf: "center", marginBottom: Spacing.md },
            ]}
          >
            <Ionicons
              name="star"
              size={16}
              color="#1E293B"
              style={{ marginRight: 4 }}
            />
            <Text style={[TextStyles.bodySmallBold, { color: "#1E293B" }]}>
              Score: {selectedCert.score}%
            </Text>
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { marginVertical: Spacing.lg }]} />

        {/* Details */}
        <View style={styles.modalDetailRow}>
          <Ionicons
            name="person-outline"
            size={18}
            color={Colors.textSecondary}
          />
          <View style={{ marginLeft: Spacing.md, flex: 1 }}>
            <Text style={[TextStyles.captionSmall]}>Instructor</Text>
            <Text style={[TextStyles.bodyMedium, { marginTop: 2 }]}>
              {selectedCert?.instructor}
            </Text>
          </View>
        </View>

        <View style={styles.modalDetailRow}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color={Colors.textSecondary}
          />
          <View style={{ marginLeft: Spacing.md, flex: 1 }}>
            <Text style={[TextStyles.captionSmall]}>Completed On</Text>
            <Text style={[TextStyles.bodyMedium, { marginTop: 2 }]}>
              {selectedCert && formatDate(selectedCert.completedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.modalDetailRow}>
          <Ionicons
            name="time-outline"
            size={18}
            color={Colors.textSecondary}
          />
          <View style={{ marginLeft: Spacing.md, flex: 1 }}>
            <Text style={[TextStyles.captionSmall]}>Duration</Text>
            <Text style={[TextStyles.bodyMedium, { marginTop: 2 }]}>
              {selectedCert?.duration}
            </Text>
          </View>
        </View>

        <View style={styles.modalDetailRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={Colors.textSecondary}
          />
          <View style={{ marginLeft: Spacing.md, flex: 1 }}>
            <Text style={[TextStyles.captionSmall]}>Credential ID</Text>
            <Text
              style={[
                TextStyles.bodySmall,
                { marginTop: 2, fontFamily: "monospace" },
              ]}
            >
              {selectedCert?.credentialId}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.modalActions}>
          <ActionButton
            text="Share Certificate"
            onPress={handleShare}
            style={{
              borderColor: Colors.textSecondary,
              borderWidth: 0.5,
              borderRadius: BorderRadius.md,
            }}
          />
        </View>
      </CustomModal>

    </Screen>
  );
}

const styles = StyleSheet.create({
  // Compact Card Styles
  compactCard: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: Spacing.base,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  compactGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3A3A45",
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  compactIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(250, 204, 21, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  compactScore: {
    backgroundColor: Colors.yellow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // Modal Content Styles
  modalIconContainer: {
    alignSelf: "center",
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  scoreBadge: {
    backgroundColor: Colors.yellow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
  },
  modalDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingState: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
});
