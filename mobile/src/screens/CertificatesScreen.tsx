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
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { ActionButton, CustomTextInput } from "@/components";
import CustomModal from "../components/common/CustomModal";
import creditService from "../services/creditService";
import { CertificateProgress } from "../types";
import { useUser } from "../contexts/UserContext";
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

const formatDurationHours = (hours?: number | null) => {
  if (!Number.isFinite(hours) || (hours ?? 0) <= 0) return "—";
  const totalMinutes = Math.round((hours as number) * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs <= 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildCertificateHtml = (cert: Certificate, logoUri: string, sealUri: string) => {
  const learnerName = "Shalom Learner";
  const courseName = escapeHtml(cert.courseName || "Course");
  const instructor = escapeHtml(cert.instructor || "Shalom Faculty");
  const issuedOn = escapeHtml(formatDate(cert.completedAt));
  const credentialId = escapeHtml(cert.credentialId || "N/A");
  const safeLogoUri = escapeHtml(logoUri || "");
  const safeSealUri = escapeHtml(sealUri || "");

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shalom Certificate</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 14px;
        color: #111827;
        font-family: "Times New Roman", Georgia, serif;
        background: #f8f5ef;
      }
      .certificate {
        width: 100%;
        min-height: 560px;
        border: 2px solid #c4b9a3;
        position: relative;
        background:
          radial-gradient(circle at 15% 25%, rgba(190, 158, 112, 0.08) 0, rgba(190, 158, 112, 0.08) 2px, transparent 2px) 0 0 / 18px 18px,
          linear-gradient(180deg, #fcfaf6 0%, #f5f0e6 100%);
      }
      .inner-border {
        position: absolute;
        inset: 10px;
        border: 1px solid #d7cdbb;
      }
      .layout {
        position: relative;
        min-height: 560px;
        display: grid;
        grid-template-rows: 148px 1fr 126px;
        z-index: 1;
      }
      .section {
        display: grid;
        grid-template-columns: 70% 30%;
      }
      .left-cell {
        padding: 24px 34px 18px 40px;
      }
      .right-cell {
        border-left: 1px solid #c8c2b2;
        padding: 18px 16px;
      }
      .header .left-cell {
        padding-top: 32px;
      }
      .header .right-cell {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 32px;
      }
      .body .left-cell {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .body .right-cell {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .footer .left-cell {
        display: flex;
        align-items: flex-end;
        padding-bottom: 24px;
      }
      .footer .right-cell {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 22px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 0;
      }
      .logo {
        width: 58px;
        height: 58px;
        object-fit: contain;
      }
      .brand-text h1 {
        margin: 0;
        font-size: 54px;
        line-height: 0.92;
        letter-spacing: -0.8px;
        color: #16376b;
        font-weight: 500;
      }
      .brand-text p {
        margin: 4px 0 0;
        font-size: 13px;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        color: #1f3a63;
      }
      .date {
        font-size: 18px;
        margin: 0 0 10px;
        color: #2d2a25;
      }
      .name {
        font-size: 46px;
        margin: 0 0 8px;
        color: #1a1a1a;
        font-weight: 500;
      }
      .statement {
        margin: 0;
        font-size: 30px;
        color: #2e2e2e;
      }
      .course {
        margin: 10px 0 0;
        font-size: 44px;
        line-height: 1.12;
        color: #111111;
      }
      .signature-wrap {
        width: 62%;
      }
      .sig-line {
        border-bottom: 1.6px solid #6b7280;
        height: 34px;
      }
      .sig-label {
        margin-top: 8px;
        font-family: Arial, sans-serif;
        font-size: 13px;
        letter-spacing: 0.6px;
        color: #4b5563;
      }
      .verify-title {
        text-align: center;
        letter-spacing: 3px;
        font-size: 22px;
        line-height: 1.4;
        color: #1f2937;
        font-weight: 600;
      }
      .seal {
        width: 190px;
        height: 190px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .seal-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .verify {
        text-align: center;
        font-family: Arial, sans-serif;
        font-size: 14px;
        color: #374151;
        line-height: 1.45;
        max-width: 240px;
      }
      .verify-id {
        margin-top: 6px;
        font-weight: 700;
        letter-spacing: 0.4px;
        font-size: 12px;
        line-height: 1.35;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <div class="certificate">
      <div class="inner-border"></div>
      <div class="layout">
        <div class="section header">
          <div class="left-cell">
            <div class="brand">
              <img class="logo" src="${safeLogoUri}" alt="Shalom logo" />
              <div class="brand-text">
                <h1>Shalom</h1>
                <p>Learning Platform</p>
              </div>
            </div>
          </div>
          <div class="right-cell">
            <div class="verify-title">VERIFIED<br/>CERTIFICATE</div>
          </div>
        </div>

        <div class="section body">
          <div class="left-cell">
            <div class="date">${issuedOn}</div>
            <div class="name">${escapeHtml(learnerName)}</div>
            <p class="statement">has successfully completed</p>
            <div class="course">${courseName}</div>
          </div>
          <div class="right-cell">
            <div class="seal">
              <img class="seal-img" src="${safeSealUri}" alt="Certificate seal" />
            </div>
          </div>
        </div>

        <div class="section footer">
          <div class="left-cell">
            <div class="signature-wrap">
              <div class="sig-line"></div>
              <div class="sig-label">Professor ${instructor}</div>
            </div>
          </div>
          <div class="right-cell">
            <div class="verify">
              Verify at shalom.app/verify
              <div class="verify-id">${credentialId}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;
};

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

  const generateCertificatePdf = useCallback(async (cert: Certificate) => {
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Certificate download isn't supported on web.");
      return null;
    }
    const toDataUri = async (assetModule: number, warnLabel: string) => {
      const asset = Asset.fromModule(assetModule);
      await asset.downloadAsync();
      const localUri = asset.localUri || asset.uri;
      if (!localUri) return asset.uri;
      try {
        const base64Encoding = (FileSystem as any)?.EncodingType?.Base64 ?? "base64";
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: base64Encoding as any,
        });
        return `data:image/png;base64,${base64}`;
      } catch (err) {
        console.warn(`${warnLabel} base64 conversion failed; using file URI`, err);
        return localUri;
      }
    };

    const [logoUri, sealUri] = await Promise.all([
      toDataUri(require("../../assets/app-icon.png"), "Certificate logo"),
      toDataUri(require("../../assets/certificate-seal.png"), "Certificate seal"),
    ]);
    const html = buildCertificateHtml(cert, logoUri, sealUri);
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
