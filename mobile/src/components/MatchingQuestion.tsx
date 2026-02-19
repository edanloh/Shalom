/**
 * MatchingQuestion — redesigned
 *
 * UX model (tap-to-connect, far more reliable on mobile than raw PanResponder):
 *  1. Tap a left pill  → it activates (glows, pulsing ring)
 *  2. Tap a right pill → connection snaps in with a spring + animated line
 *  3. Tap an already-matched left pill → clears it (re-opens for re-match)
 *  4. Tap a different left pill while one is active → switches selection
 *
 * Visual language: dark glass-morphism, neon accent lines, spring micro-animations.
 * Lines are drawn through an SVG overlay; the path animates in via stroke-dashoffset.
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  LayoutChangeEvent,
} from "react-native";
import Svg, {
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing } from "@/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchingPair {
  left: string;
  right: string;
}
interface QuizQuestion {
  id: string;
  question_type: string;
  correct_answer?: string | MatchingPair[];
  [key: string]: any;
}
interface Point {
  x: number;
  y: number;
}
interface MatchingQuestionProps {
  question: QuizQuestion;
  matchingState: Map<string, Map<string, string>>;
  reviewMode: boolean;
  onMatch: (questionId: string, left: string, right: string) => void;
  onClearMatch: (questionId: string, left: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePairs(raw: string | MatchingPair[] | undefined): MatchingPair[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const out = [...arr];
  let s = Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return Math.abs(s) / 2147483648;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Palette — vivid neon accents on deep navy
const PALETTE = [
  "#6EE7F7",
  "#A78BFA",
  "#FB923C",
  "#34D399",
  "#F472B6",
  "#FBBF24",
];
const lc = (i: number) => PALETTE[i % PALETTE.length];

// Animated SVG line helper (stroke-dashoffset reveal)
function AnimatedLine({
  x1,
  y1,
  x2,
  y2,
  color,
  animValue,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  animValue: Animated.Value;
}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  // Animated.Value drives strokeDashoffset 0→len on mount
  const offset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [len, 0],
  });
  // Since react-native-svg doesn't accept Animated natively everywhere, we use a JS-driven approach:
  const [dashOffset, setDashOffset] = useState(len);
  useEffect(() => {
    const id = (animValue as any).addListener(
      ({ value }: { value: number }) => {
        setDashOffset(len * (1 - value));
      },
    );
    return () => (animValue as any).removeListener(id);
  }, [len]);

  return (
    <React.Fragment>
      {/* Shadow/glow */}
      <Line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={8}
        strokeOpacity={0.15}
        strokeLinecap="round"
      />
      {/* Main line */}
      <Line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={2.5}
        strokeOpacity={0.9}
        strokeLinecap="round"
        strokeDasharray={`${len}`}
        strokeDashoffset={dashOffset}
      />
      <Circle cx={x1} cy={y1} r={5} fill={color} fillOpacity={0.9} />
      <Circle cx={x2} cy={y2} r={5} fill={color} fillOpacity={0.9} />
    </React.Fragment>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

interface PillProps {
  label: string;
  side: "left" | "right";
  isActive: boolean; // selected, waiting for partner
  isMatched: boolean;
  matchColor: string | null;
  onPress: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  pillRef?: (ref: View | null) => void;
  showClear?: boolean;
  onClear?: () => void;
}

function Pill({
  label,
  side,
  isActive,
  isMatched,
  matchColor,
  onPress,
  pillRef,
  showClear,
  onClear,
  onLayout,
}: PillProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Pulsing scale while selected
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.04,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(scale, {
            toValue: 1.0,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      ).start();
      Animated.timing(glow, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      scale.stopAnimation();
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isActive]);

  // Tap spring
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.94,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: isActive ? 1.04 : 1,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.10)", "#A78BFA"],
  });
  const shadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const activeBg = isActive ? "rgba(167,139,250,0.18)" : undefined;
  const matchedBg = isMatched && matchColor ? `${matchColor}1A` : undefined;
  const bg = activeBg ?? matchedBg ?? "rgba(255,255,255,0.04)";

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      ref={pillRef as any}
      onLayout={onLayout}
    >
      <Animated.View
        style={[
          styles.pill,
          side === "right" && styles.pillRight,
          { backgroundColor: bg, transform: [{ scale }] },
          isMatched && matchColor && { borderColor: matchColor + "BB" },
          isActive && { borderColor: "#A78BFA" },
        ]}
      >
        {/* Neon border glow (simulated with inner shadow overlay) */}
        {isActive && (
          <View style={styles.activeGlowOverlay} pointerEvents="none" />
        )}

        <Text
          style={[
            styles.pillText,
            isActive && styles.pillTextActive,
            isMatched && { color: matchColor ?? Colors.white, opacity: 0.85 },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>

        {showClear && onClear && (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.clearBtn}
          >
            <Ionicons
              name="close-circle"
              size={16}
              color={matchColor ?? "#888"}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const MatchingQuestion: React.FC<MatchingQuestionProps> = ({
  question,
  matchingState,
  reviewMode,
  onMatch,
  onClearMatch,
}) => {
  const correctPairs = useMemo(
    () => parsePairs(question.correct_answer),
    [question.id],
  );
  const leftItems = useMemo(
    () => correctPairs.map((p) => p.left),
    [question.id],
  );
  const rightItems = useMemo(
    () =>
      seededShuffle(
        correctPairs.map((p) => p.right),
        question.id,
      ),
    [question.id],
  );

  const matches = matchingState.get(question.id) ?? new Map<string, string>();
  const matchCount = matches.size;
  const total = leftItems.length;

  // ── Selection state ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<string | null>(null); // left item

  // ── Layout measuring ─────────────────────────────────────────────────────────
  const arenaRef = useRef<View>(null);
  const leftLayouts = useRef<(Point | null)[]>(leftItems.map(() => null));
  const rightLayouts = useRef<(Point | null)[]>(rightItems.map(() => null));
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  // Maps from left item to its line animation value
  const lineAnims = useRef<Map<string, Animated.Value>>(new Map()).current;

  // Measure a pill relative to the arena container
  const measurePill = useCallback(
    (ref: View | null, i: number, side: "left" | "right") => {
      if (!ref || !arenaRef.current) return;
      arenaRef.current.measure((_, __, _w, _h, cPX, cPY) => {
        if (cPX == null) return;
        (ref as any).measure(
          (_a: any, _b: any, w: number, h: number, pX: number, pY: number) => {
            if (pX == null) return;
            // Connect from right edge of left box to left edge of right box
            const xPos = side === "left" ? pX - cPX + w : pX - cPX;
            const pt: Point = { x: xPos, y: pY - cPY + h / 2 };
            const arr = side === "left" ? leftLayouts : rightLayouts;
            const prev = arr.current[i];
            if (
              !prev ||
              Math.abs(prev.x - pt.x) > 1 ||
              Math.abs(prev.y - pt.y) > 1
            ) {
              arr.current[i] = pt;
              bump();
            }
          },
        );
      });
    },
    [],
  );

  useEffect(() => {
    leftLayouts.current = leftItems.map(() => null);
    rightLayouts.current = rightItems.map(() => null);
    setSelected(null);
    bump();
  }, [question.id]);

  // ── Tap handlers ─────────────────────────────────────────────────────────────

  const handleLeftTap = useCallback(
    (item: string) => {
      if (matches.has(item)) {
        // Clear match on tap of matched left pill
        onClearMatch(question.id, item);
        if (selected === item) setSelected(null);
      } else {
        setSelected((prev) => (prev === item ? null : item));
      }
    },
    [matches, selected, question.id, onClearMatch],
  );

  const handleRightTap = useCallback(
    (item: string) => {
      if (!selected) return;

      // Animate the new line in
      if (!lineAnims.has(selected)) {
        lineAnims.set(selected, new Animated.Value(0));
      }
      const anim = lineAnims.get(selected)!;
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 80,
        friction: 8,
      }).start();

      // Remove any occupant of this right slot
      matches.forEach((r, l) => {
        if (r === item) onClearMatch(question.id, l);
      });
      if (matches.has(selected)) onClearMatch(question.id, selected);
      onMatch(question.id, selected, item);
      setSelected(null);
    },
    [selected, matches, question.id, onMatch, onClearMatch],
  );

  // ── SVG lines data ───────────────────────────────────────────────────────────
  const lines = useMemo(() => {
    let ci = 0;
    return Array.from(matches.entries())
      .map(([l, r]) => ({
        li: leftItems.indexOf(l),
        ri: rightItems.indexOf(r),
        color: lc(ci++),
        leftItem: l,
      }))
      .filter((x) => x.li !== -1 && x.ri !== -1);
  }, [matches, leftItems, rightItems, tick]);

  // Progress
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: total ? matchCount / total : 0,
      duration: 400,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [matchCount, total]);

  // ─── Review mode ─────────────────────────────────────────────────────────────
  if (reviewMode) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.reviewHeader}>
          <View style={[styles.reviewDot]} />
          <Text style={styles.reviewTitle}>Correct Matches</Text>
        </View>
        {correctPairs.map((pair, i) => (
          <View key={i} style={styles.reviewRow}>
            <View style={styles.reviewPill}>
              <View
                style={[
                  styles.reviewBadge,
                  { backgroundColor: PALETTE[i % PALETTE.length] + "33" },
                ]}
              >
                <Text
                  style={[
                    styles.reviewBadgeText,
                    { color: PALETTE[i % PALETTE.length] },
                  ]}
                >
                  A
                </Text>
              </View>
              <Text style={styles.reviewText} numberOfLines={2}>
                {pair.left}
              </Text>
            </View>
            <View style={styles.reviewArrow}>
              <View
                style={[
                  styles.reviewLine,
                  { backgroundColor: PALETTE[i % PALETTE.length] + "60" },
                ]}
              />
              <View
                style={[
                  styles.reviewArrowHead,
                  { borderLeftColor: PALETTE[i % PALETTE.length] },
                ]}
              />
            </View>
            <View
              style={[
                styles.reviewPill,
                { borderColor: PALETTE[i % PALETTE.length] + "50" },
              ]}
            >
              <Text style={styles.reviewText} numberOfLines={2}>
                {pair.right}
              </Text>
              <View
                style={[
                  styles.reviewBadge,
                  { backgroundColor: PALETTE[i % PALETTE.length] + "33" },
                ]}
              >
                <Text
                  style={[
                    styles.reviewBadgeText,
                    { color: PALETTE[i % PALETTE.length] },
                  ]}
                >
                  B
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  // ─── Active mode ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLabels}>
          <Text style={styles.colTag}>A</Text>
          <Text style={styles.instruction}>
            {selected ? "Now tap a B item →" : "Tap an A item to start"}
          </Text>
          <Text style={styles.colTag}>B</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
        <Text style={styles.progressText}>
          {matchCount}/{total}
        </Text>
      </View>

      {/* Arena */}
      <View
        ref={arenaRef}
        style={styles.arena}
        onLayout={() => {
          setTimeout(() => {
            leftItems.forEach((_, i) =>
              measurePill(leftPillViewRefs.current[i] as any, i, "left"),
            );
            rightItems.forEach((_, i) =>
              measurePill(rightPillViewRefs.current[i] as any, i, "right"),
            );
          }, 80);
        }}
      >
        {/* SVG overlay */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {lines.map((ln) => {
            const lp = leftLayouts.current[ln.li];
            const rp = rightLayouts.current[ln.ri];
            if (!lp || !rp) return null;
            const anim = lineAnims.get(ln.leftItem) ?? new Animated.Value(1);
            return (
              <AnimatedLine
                key={ln.leftItem}
                x1={lp.x}
                y1={lp.y}
                x2={rp.x}
                y2={rp.y}
                color={ln.color}
                animValue={anim}
              />
            );
          })}
        </Svg>

        {/* Left column */}
        <View style={styles.col}>
          {leftItems.map((item, i) => {
            const isMatched = matches.has(item);
            const mIdx = isMatched
              ? Array.from(matches.keys()).indexOf(item)
              : -1;
            const mc = isMatched ? lc(mIdx) : null;
            return (
              <View
                key={item}
                ref={(r) => {
                  leftPillViewRefs.current[i] = r;
                }}
                onLayout={() =>
                  setTimeout(
                    () =>
                      measurePill(
                        leftPillViewRefs.current[i] as any,
                        i,
                        "left",
                      ),
                    80,
                  )
                }
              >
                <Pill
                  label={item}
                  side="left"
                  isActive={selected === item}
                  isMatched={isMatched}
                  matchColor={mc}
                  onPress={() => handleLeftTap(item)}
                  showClear={isMatched}
                  onClear={() => onClearMatch(question.id, item)}
                />
              </View>
            );
          })}
        </View>

        {/* Right column */}
        <View style={styles.col}>
          {rightItems.map((item, i) => {
            const matchedBy = Array.from(matches.entries()).find(
              ([, r]) => r === item,
            )?.[0];
            const isMatched = !!matchedBy;
            const mIdx = matchedBy
              ? Array.from(matches.keys()).indexOf(matchedBy)
              : -1;
            const mc = isMatched ? lc(mIdx) : null;
            const isReady = !!selected && !isMatched;
            return (
              <View
                key={item}
                ref={(r) => {
                  rightPillViewRefs.current[i] = r;
                }}
                onLayout={() =>
                  setTimeout(
                    () =>
                      measurePill(
                        rightPillViewRefs.current[i] as any,
                        i,
                        "right",
                      ),
                    80,
                  )
                }
              >
                <RightPill
                  label={item}
                  isMatched={isMatched}
                  matchColor={mc}
                  isReady={isReady}
                  onPress={() => handleRightTap(item)}
                />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// Ref arrays (outside component to avoid re-creation, reset on question.id change via effect)
const leftPillViewRefs: React.MutableRefObject<(View | null)[]> = {
  current: [],
};
const rightPillViewRefs: React.MutableRefObject<(View | null)[]> = {
  current: [],
};

// ─── RightPill ────────────────────────────────────────────────────────────────
// Separate component so it can animate the "ready" state independently

function RightPill({
  label,
  isMatched,
  matchColor,
  isReady,
  onPress,
}: {
  label: string;
  isMatched: boolean;
  matchColor: string | null;
  isReady: boolean;
  onPress: () => void;
}) {
  const glow = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(glow, {
        toValue: isReady ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.spring(scale, {
        toValue: isReady ? 1.025 : 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isReady]);

  const handlePress = () => {
    if (!isReady && !isMatched) return;
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.93,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.08)", "rgba(110,231,247,0.7)"],
  });
  const bg =
    isMatched && matchColor
      ? matchColor + "1A"
      : isReady
        ? "rgba(110,231,247,0.07)"
        : "rgba(255,255,255,0.03)";

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={isMatched && !isReady}
    >
      <Animated.View
        style={[
          styles.pill,
          styles.pillRight,
          { backgroundColor: bg, transform: [{ scale }] },
          isMatched && matchColor && { borderColor: matchColor + "99" },
        ]}
      >
        {isReady && <View style={styles.readyPulse} pointerEvents="none" />}
        <Text
          style={[
            styles.pillText,
            isMatched && { color: matchColor ?? Colors.white, opacity: 0.8 },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {isReady && (
          <View style={styles.tapBadge}>
            <Text style={styles.tapBadgeText}>tap</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PILL_W = 138;
const PILL_H = 52;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#0D0C1E",
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.18)",
    marginBottom: Spacing.md,
    // Subtle inner glow
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },

  // Header
  headerRow: { marginBottom: 12 },
  headerLabels: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#A78BFA",
    letterSpacing: 2,
    textTransform: "uppercase",
    width: PILL_W,
    textAlign: "center",
  },
  instruction: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "500",
  },

  // Progress
  progressBar: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: "#34D399",
    shadowColor: "#34D399",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  progressText: {
    position: "absolute",
    right: 0,
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
  },

  // Arena
  arena: {
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 200,
  },

  // Columns
  col: { width: PILL_W, gap: 10 },

  // Pills
  pill: {
    width: PILL_W,
    minHeight: PILL_H,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.09)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    // Glass effect
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  pillRight: {
    // slightly different tint
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  activeGlowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 13,
    backgroundColor: "rgba(167,139,250,0.10)",
    borderWidth: 1.5,
    borderColor: "rgba(167,139,250,0.6)",
  },
  pillText: {
    flex: 1,
    fontSize: 12.5,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 18,
    fontWeight: "500",
  },
  pillTextActive: { color: "#E2D9FF", fontWeight: "600" },
  clearBtn: { marginLeft: 2 },

  // Ready indicator on right pills
  readyPulse: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "rgba(110,231,247,0.5)",
    backgroundColor: "rgba(110,231,247,0.05)",
  },
  tapBadge: {
    backgroundColor: "rgba(110,231,247,0.15)",
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  tapBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6EE7F7",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Review
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  reviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34D399",
    shadowColor: "#34D399",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  reviewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#34D399",
    letterSpacing: 0.5,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  reviewPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.2)",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  reviewBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  reviewText: {
    flex: 1,
    fontSize: 12,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 17,
  },
  reviewArrow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewLine: {
    width: 10,
    height: 1.5,
  },
  reviewArrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#34D399",
  },
});

export default MatchingQuestion;
