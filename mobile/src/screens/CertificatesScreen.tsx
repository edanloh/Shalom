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
import { useUser } from "../contexts/UserContext";
import * as Sharing from "expo-sharing";
import {
  buildCertificateHtml,
  formatDate,
  formatDurationHours,
  generateCertificatePdfFromHtml,
  getCertificateAssetUris,
  type Certificate,
} from "@/utils/certificate";

const PAGE_SIZE = 20;

export default function CertificatesScreen({ navigation }: any) {
  const { user } = useUser();
  const dbUserId = user?.uuid;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [query, setQuery] = useState("");
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pendingViewer, setPendingViewer] = useState<{
    certificate: Certificate;
    html: string;
  } | null>(null);
  const [certificateAssetUris, setCertificateAssetUris] = useState<
    [string, string] | null
  >(null);

  const mapFromProgress = useCallback(
    (items: CertificateProgress[] = []): Certificate[] =>
      items.map((c) => ({
        id: c.id,
        courseName: c.name,
        instructor: c.instructorName || "",
        completedAt: (c as any).issuedAt || new Date().toISOString(),
        credentialId: c.id.toUpperCase(),
        score: c.progressPercent,
        duration: formatDurationHours(c.durationHours),
      })),
    []
  );

  const loadCerts = useCallback(async () => {
    if (!dbUserId) {
      setCertificates([]);
      setNextOffset(0);
      setHasMore(false);
      return;
    }
    setLoading(true);
    try {
      const remote = await creditService.getCertificates(dbUserId, {
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
  }, [mapFromProgress, dbUserId]);

  useEffect(() => {
    loadCerts();
  }, [loadCerts, dbUserId]);

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
    if (!dbUserId || loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const startOffset = nextOffset;
      const remote = await creditService.getCertificates(dbUserId, {
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
  }, [hasMore, loading, loadingMore, mapFromProgress, nextOffset, dbUserId]);

  useEffect(() => {
    let cancelled = false;

    getCertificateAssetUris()
      .then((uris) => {
        if (!cancelled) setCertificateAssetUris(uris);
      })
      .catch((error) => {
        console.warn("Certificates: failed to preload certificate assets", error);
      });

    return () => {
      cancelled = true;
    };
  }, [getCertificateAssetUris]);

  const generateCertificatePdf = useCallback(async (cert: Certificate) => {
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Certificate download isn't supported on web.");
      return null;
    }

    const [logoUri, sealUri] =
      certificateAssetUris ?? (await getCertificateAssetUris());
    const html = buildCertificateHtml(cert, logoUri, sealUri);
    return generateCertificatePdfFromHtml(html);
  }, [certificateAssetUris, getCertificateAssetUris]);

  const shareCertificate = useCallback(async (cert: Certificate) => {
    try {
      const uri = await generateCertificatePdf(cert);
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
  }, [generateCertificatePdf]);

  const handleShare = useCallback(async () => {
    if (!selectedCert) return;
    await shareCertificate(selectedCert);
  }, [selectedCert, shareCertificate]);

  const openCertificateViewer = useCallback(async () => {
    if (!selectedCert) return;
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Certificate preview isn't supported on web.");
      return;
    }
    try {
      setPreviewLoading(true);
      const [logoUri, sealUri] =
        certificateAssetUris ?? (await getCertificateAssetUris());
      const html = buildCertificateHtml(selectedCert, logoUri, sealUri);
      setPendingViewer({ certificate: selectedCert, html });
      setSelectedCert(null);
    } catch (error) {
      console.warn("Failed to preview certificate:", error);
      Alert.alert("Error", "Unable to preview certificate.");
    } finally {
      setPreviewLoading(false);
    }
  }, [certificateAssetUris, getCertificateAssetUris, selectedCert]);

  const handleCertificateModalDismiss = useCallback(() => {
    if (!pendingViewer) return;
    navigation.navigate("CertificateViewer", pendingViewer);
    setPendingViewer(null);
  }, [navigation, pendingViewer]);

  useEffect(() => {
    if (Platform.OS === "ios" || !pendingViewer || selectedCert !== null) return;

    const timer = setTimeout(handleCertificateModalDismiss, 250);
    return () => clearTimeout(timer);
  }, [handleCertificateModalDismiss, pendingViewer, selectedCert]);

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
        keyExtractor={(item, index) =>
          String(
            item.id ??
              `certificate-${index}-${item.courseName ?? item.credentialId ?? "row"}`
          )
        }
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
                {cert.score != null && (
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
        onDismiss={handleCertificateModalDismiss}
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
        {selectedCert?.score != null && (
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
            text="View Certificate"
            onPress={openCertificateViewer}
            loading={previewLoading}
            disabled={previewLoading}
            style={styles.viewCertificateButton}
          />
          <TouchableOpacity
            accessibilityLabel="Share certificate"
            activeOpacity={0.7}
            onPress={handleShare}
            style={styles.shareIconButton}
          >
            <Ionicons name="share-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
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
  viewCertificateButton: {
    flex: 1,
    borderColor: Colors.textSecondary,
    borderWidth: 0.5,
    borderRadius: BorderRadius.md,
  },
  shareIconButton: {
    width: 54,
    height: 54,
    borderRadius: BorderRadius.md,
    borderColor: Colors.textSecondary,
    borderWidth: 0.5,
    backgroundColor: "#564beb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
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
