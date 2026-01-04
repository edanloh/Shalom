import { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Spacing, TextStyles, Colors, BorderRadius } from "../constants";
import Screen from "../components/common/Screen";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { ActionButton, CustomTextInput } from "@/components";

type Certificate = {
  id: string;
  courseName: string;
  instructor: string;
  completedAt: string; // ISO date
  credentialId: string;
  score?: number;
  duration: string;
};

const MOCK_CERTIFICATES: Certificate[] = [
  {
    id: "cert-001",
    courseName: "Web Development Bootcamp",
    instructor: "Dr. Angela Yu",
    completedAt: new Date(2025, 11, 15).toISOString(), // Dec 15, 2025
    credentialId: "WDB-2025-001-XY7K",
    score: 98,
    duration: "65 hours",
  },
  {
    id: "cert-002",
    courseName: "Python for Data Science and Machine Learning",
    instructor: "Jose Portilla",
    completedAt: new Date(2025, 10, 22).toISOString(), // Nov 22, 2025
    credentialId: "PYDS-2025-002-M4NK",
    score: 95,
    duration: "45 hours",
  },
  {
    id: "cert-003",
    courseName: "React Native - The Practical Guide",
    instructor: "Maximilian Schwarzmüller",
    completedAt: new Date(2025, 9, 8).toISOString(), // Oct 8, 2025
    credentialId: "RN-2025-003-P8QW",
    score: 100,
    duration: "32 hours",
  },
  {
    id: "cert-004",
    courseName: "AWS Certified Solutions Architect",
    instructor: "Stephane Maarek",
    completedAt: new Date(2025, 8, 14).toISOString(), // Sep 14, 2025
    credentialId: "AWS-2025-004-T2ZL",
    score: 92,
    duration: "28 hours",
  },
  {
    id: "cert-005",
    courseName: "The Complete Node.js Developer Course",
    instructor: "Andrew Mead",
    completedAt: new Date(2025, 7, 5).toISOString(), // Aug 5, 2025
    credentialId: "NODE-2025-005-R9VF",
    score: 97,
    duration: "38 hours",
  },
  {
    id: "cert-006",
    courseName: "Docker and Kubernetes: The Complete Guide",
    instructor: "Stephen Grider",
    completedAt: new Date(2025, 6, 18).toISOString(), // Jul 18, 2025
    credentialId: "DK-2025-006-H5NC",
    score: 94,
    duration: "22 hours",
  },
];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export default function CertificatesScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [query, setQuery] = useState("");

  const certificates = useMemo(() => {
    // Sort certificates by completion date, most recent first
    const sorted = [...MOCK_CERTIFICATES].sort(
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
  }, [query]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      // TODO: call your real fetch here, e.g. await reloadCertificates();
      await new Promise((r) => setTimeout(r, 800)); // demo delay
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <Screen
      title="Certificates"
      customEdges={["top", "left", "right", "bottom"]}
      refreshing={refreshing}
      onRefresh={onRefresh}
      headerLeftIcon="chevron-back"
      onHeaderLeftPress={() => navigation.goBack()}
    >
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

      {certificates.map((cert, index) => (
        <TouchableOpacity
          key={cert.id}
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
      ))}

      {/* Certificate Detail Modal */}
      <Modal
        visible={selectedCert !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCert(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedCert(null)}
          />
          <View style={styles.modalContent}>
            <BlurView
              intensity={20}
              tint="dark"
              style={styles.modalBlur}
              experimentalBlurMethod="dimezisBlurView"
              blurReductionFactor={2}
            >
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedCert(null)}
              >
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>

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
                  <Text
                    style={[TextStyles.bodySmallBold, { color: "#1E293B" }]}
                  >
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
                <ActionButton text="Share" onPress={() => {}} style={{borderColor: Colors.textSecondary, borderWidth: 0.5, borderRadius: BorderRadius.md}}/>
                <ActionButton text="Download" onPress={() => {}} style={{borderColor: Colors.textSecondary, borderWidth: 0.5, borderRadius: BorderRadius.md}}/>
              </View>
            </BlurView>
          </View>
        </View>
      </Modal>

      {certificates.length === 0 && query && (
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
      )}

      {certificates.length === 0 && !query && (
        <View style={styles.emptyState}>
          <Ionicons name="school-outline" size={64} color={Colors.textMuted} />
          <Text style={[TextStyles.h4, { marginTop: Spacing.md }]}>
            No Certificates Yet
          </Text>
          <Text style={[TextStyles.caption, { marginTop: Spacing.xs }]}>
            Complete courses to earn certificates
          </Text>
        </View>
      )}
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    pointerEvents: "auto",
  },
  modalContent: {
    width: "90%",
    maxWidth: 500,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  modalBlur: {
    padding: Spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#475569",
  },
  modalGradient: {
    padding: Spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#475569",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
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
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.yellow,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
});
