import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Pressable,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { VideoView, useVideoPlayer } from "expo-video";
import { YouTubePlayerWrapper } from "@/components/YouTubePlayerWrapper";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, TextStyles } from "@/constants";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { MainStackParamList } from "@/types/navigation";
import { videoService } from "@/services";
import type { VideoDetailResponse } from "@/services";
import Screen from "@/components/common/Screen";
import { CourseCompletionCard } from "@/components";
import { useCourseNavigation } from "@/hooks";
import { useCourses } from "@/contexts/CourseContext";
import VimeoPlayer, { VimeoPlayerHandle } from "@/components/VimeoPlayer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const VIDEOWIDTH = SCREEN_WIDTH;
const VIDEO_HEIGHT = VIDEOWIDTH * (9 / 16);
const COMPLETION_THRESHOLD = 0.9; // 90%

type VideoDetail = VideoDetailResponse["data"];
type VideoPlayerNavProp = StackNavigationProp<
  MainStackParamList,
  "VideoPlayer"
>;

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

const isYouTubeUrl = (url: string) =>
  url.includes("youtube.com") || url.includes("youtu.be");

const isVimeoUrl = (url: string) =>
  url.includes("vimeo.com") || url.includes("player.vimeo.com");

const getYouTubeVideoId = (url: string): string | null => {
  const m = url.match(
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/,
  );
  return m && m[7].length === 11 ? m[7] : null;
};

const getVimeoVideoId = (url: string): string | null => {
  for (const pattern of [
    /vimeo\.com\/(?:video\/)?(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ]) {
    const m = url.match(pattern);
    if (m?.[1]) return m[1];
  }
  return null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const VideoPlayer = () => {
  const route = useRoute();
  const navigation = useNavigation<VideoPlayerNavProp>();
  const { videoId, courseId, sectionId, userId, sourceScreen } =
    route.params as any;
  const { refreshMyCourses } = useCourses();

  // ── Refs ────────────────────────────────────────────────────────────────
  const youtubePlayerRef = useRef<any>(null);
  const vimeoPlayerRef = useRef<VimeoPlayerHandle>(null);
  const videoViewRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Mirrors isVideoCompleted state so interval/event callbacks always read
   * the latest value without needing to be in their dependency arrays.
   * State causes re-renders (UI); the ref ensures closure correctness.
   */
  const isCompletedRef = useRef(false);

  /**
   * Mirror refs for currentPosition, duration, and videoDetail.
   * saveProgress is called from cleanup functions and navigation handlers
   * where the state closure is stale. Refs are always current.
   */
  const currentPositionRef = useRef(0);
  const durationRef = useRef(0);
  const videoDetailRef = useRef<VideoDetail | null>(null);

  /**
   * The resume position loaded from the backend. Stored separately from
   * currentPositionRef so the 100ms polling loop can't overwrite it before
   * the statusChange → readyToPlay seek fires.
   */
  const savedResumePositionRef = useRef<number>(0);

  /**
   * Set synchronously before setState in fetchVideoDetail so VimeoPlayer's
   * first render has the correct resume position baked into the iframe src.
   * React batching means currentPosition state is still 0 on first render.
   */
  const vimeoStartPositionRef = useRef<number>(0);

  // ── expo-video player ────────────────────────────────────────────────────
  const [videoSource, setVideoSource] = useState("");
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
  });

  // ── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [videoDetail, setVideoDetail] = useState<VideoDetail | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isYouTubeVideo, setIsYouTubeVideo] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [isVimeoVideo, setIsVimeoVideo] = useState(false);
  const [vimeoVideoId, setVimeoVideoId] = useState<string | null>(null);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [vimeoSeekRestricted, setVimeoSeekRestricted] = useState(false);

  // Wrapped setters that keep mirror refs in sync
  const setCurrentPositionSynced = (v: number) => {
    currentPositionRef.current = v;
    setCurrentPosition(v);
  };
  const setDurationSynced = (v: number) => {
    durationRef.current = v;
    setDuration(v);
  };
  const setVideoDetailSynced = (
    v: VideoDetail | null | ((p: VideoDetail | null) => VideoDetail | null),
  ) => {
    if (typeof v === "function") {
      setVideoDetail((prev) => {
        const next = v(prev);
        videoDetailRef.current = next;
        return next;
      });
    } else {
      videoDetailRef.current = v;
      setVideoDetail(v);
    }
  };

  // ── Course navigation ────────────────────────────────────────────────────
  const {
    nextItem: nextItemInModule,
    previousItem: prevItemInModule,
    isLastItem,
  } = useCourseNavigation(
    courseId,
    userId,
    videoId,
    "video",
    videoDetail?.section?.id || sectionId,
  );

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchVideoDetail();
    return () => {
      clearProgressInterval();
      saveProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const clearProgressInterval = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const refreshEnrollmentProgress = async () => {
    try {
      await refreshMyCourses();
    } catch (err) {
      console.warn("Failed to refresh enrollment progress", err);
    }
  };

  /**
   * Central completion handler — called whenever we have a fresh
   * position + duration pair from any player type.
   *
   * Uses isCompletedRef (not the state variable) so it is always
   * accurate inside interval/event closures without stale captures.
   */
  const markCompleteIfNeeded = useCallback(
    (position: number, total: number) => {
      if (isCompletedRef.current) return; // already done
      if (!total || total <= 0) return;
      if (position / total < COMPLETION_THRESHOLD) return;

      // Update ref immediately so any subsequent call in the same tick is a no-op
      isCompletedRef.current = true;
      setIsVideoCompleted(true);

      videoService
        .updateProgress(courseId, {
          userId,
          videoId,
          watchTimeSeconds: Math.floor(position),
          isCompleted: true,
          lastPositionSeconds: Math.floor(position),
        })
        .then(() => refreshEnrollmentProgress())
        .catch(console.error);
    },
    [courseId, userId, videoId],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Progress interval ────────────────────────────────────────────────────
  // All three sources save ONLY on: >=90% watched, pause/end, back/exit.
  // No periodic 10s saves. This interval exists only to poll YouTube position
  // for completion detection (YouTube has no push-based progress event).
  useEffect(() => {
    clearProgressInterval();

    if (!isPlaying || !isYouTubeVideo) return;

    progressIntervalRef.current = setInterval(async () => {
      if (!youtubePlayerRef.current) return;
      try {
        const t = await youtubePlayerRef.current.getCurrentTime();
        const d = await youtubePlayerRef.current.getDuration();
        setCurrentPositionSynced(t);
        if (d > 0) setDurationSynced(d);
        markCompleteIfNeeded(t, d);
      } catch (_) {}
    }, 1_000);

    return clearProgressInterval;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isYouTubeVideo]);

  // ── Fetch video detail ───────────────────────────────────────────────────
  const fetchVideoDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      setVimeoSeekRestricted(false);

      const data = await videoService.getVideoDetail(courseId, videoId, userId);
      setVideoDetailSynced(data);

      const alreadyCompleted = data.userProgress?.is_completed || false;
      isCompletedRef.current = alreadyCompleted;
      setIsVideoCompleted(alreadyCompleted);

      if (isYouTubeUrl(data.video_url)) {
        const ytId = getYouTubeVideoId(data.video_url);
        if (!ytId) {
          handleUrlError("Invalid YouTube URL format");
          return;
        }
        setIsYouTubeVideo(true);
        setYoutubeVideoId(ytId);
        setIsVimeoVideo(false);
        setVimeoVideoId(null);
        setVideoSource("");
        setDurationSynced(data.duration_seconds || 0);
        if (data.userProgress?.last_position_seconds)
          setCurrentPositionSynced(data.userProgress.last_position_seconds);
      } else if (isVimeoUrl(data.video_url)) {
        const vmId = getVimeoVideoId(data.video_url);
        if (!vmId) {
          handleUrlError("Invalid Vimeo URL format");
          return;
        }
        // Set ref BEFORE setState — VimeoPlayer reads this on first render
        vimeoStartPositionRef.current =
          data.userProgress?.last_position_seconds ?? 0;
        setIsVimeoVideo(true);
        setVimeoVideoId(vmId);
        setIsYouTubeVideo(false);
        setYoutubeVideoId(null);
        setVideoSource("");
        setDurationSynced(data.duration_seconds || 0);
        if (data.userProgress?.last_position_seconds)
          setCurrentPositionSynced(data.userProgress.last_position_seconds);
      } else {
        setIsYouTubeVideo(false);
        setIsVimeoVideo(false);
        savedResumePositionRef.current =
          data.userProgress?.last_position_seconds ?? 0;
        hasResumedRef.current = false;
        setVideoSource(data.video_url);
      }
    } catch (err: any) {
      handleUrlError(err.message || "Failed to load video");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlError = (msg: string) => {
    setError(msg);
    showErrorAndRedirect(msg);
  };

  // ── Navigation ───────────────────────────────────────────────────────────
  const navigateBackToModuleDetail = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const sid = videoDetail?.section?.id || sectionId;
    if (sid) {
      navigation.navigate("ModuleDetail", {
        courseId,
        sectionId: sid,
        userId,
        sourceScreen,
      } as any);
      return;
    }
    navigation.navigate("CourseDetail", { courseId, sourceScreen } as any);
  };

  const showErrorAndRedirect = (msg: string) => {
    Alert.alert(
      "Video Error",
      msg,
      [
        { text: "Go Back", onPress: navigateBackToModuleDetail },
        {
          text: "Go to Course",
          onPress: () =>
            navigation.navigate("CourseDetail", {
              courseId,
              sourceScreen,
            } as any),
          style: "cancel",
        },
      ],
      { cancelable: false },
    );
  };

  // ── Save progress ────────────────────────────────────────────────────────
  const saveProgress = async () => {
    // Always read from refs — never from closure-captured state
    const pos = currentPositionRef.current;
    const dur = durationRef.current;
    const detail = videoDetailRef.current;

    if (!userId || !detail || dur === 0 || pos < 1) return;
    try {
      await videoService.updateProgress(courseId, {
        userId,
        videoId,
        watchTimeSeconds: Math.floor(pos),
        isCompleted: isCompletedRef.current,
        lastPositionSeconds: Math.floor(pos),
      });
      if (isCompletedRef.current) void refreshEnrollmentProgress();

      // Update local detail — create userProgress record if it didn't exist yet
      setVideoDetailSynced((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          userProgress: prev.userProgress
            ? {
                ...prev.userProgress,
                is_completed:
                  isCompletedRef.current || prev.userProgress.is_completed,
                watch_time_seconds: Math.floor(pos),
                last_position_seconds: Math.floor(pos),
              }
            : {
                // First save — userProgress was null, create a minimal record
                is_completed: isCompletedRef.current,
                watch_time_seconds: Math.floor(pos),
                last_position_seconds: Math.floor(pos),
              },
        };
      });
    } catch (err) {
      console.error("Error saving progress:", err);
    }
  };

  // ── expo-video: poll player state at 100ms ───────────────────────────────
  useEffect(() => {
    if (!player || isYouTubeVideo || isVimeoVideo) return;
    const id = setInterval(() => {
      const t = player.currentTime;
      const d = player.duration;
      setCurrentPositionSynced(t);
      setDurationSynced(d);
      setIsPlaying(player.playing);
      markCompleteIfNeeded(t, d);
    }, 100);
    return () => clearInterval(id);
  }, [player, isYouTubeVideo, isVimeoVideo, markCompleteIfNeeded]);

  // ── expo-video: pause → save progress ────────────────────────────────────
  useEffect(() => {
    if (!player || isYouTubeVideo || isVimeoVideo) return;
    const sub = player.addListener(
      "playingChange",
      ({ isPlaying: playing }: { isPlaying: boolean }) => {
        if (!playing) {
          void saveProgress();
        }
      },
    );
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, isYouTubeVideo, isVimeoVideo]);

  // ── expo-video: resume from saved position ────────────────────────────────
  // We use a dedicated savedResumePositionRef — separate from currentPositionRef —
  // so the 100ms polling loop cannot overwrite the saved position before the
  // seek fires. A short delay after readyToPlay ensures the buffer is ready.
  const hasResumedRef = useRef(false);

  useEffect(() => {
    if (!player || isYouTubeVideo || isVimeoVideo) return;
    const sub = player.addListener(
      "statusChange",
      ({ status }: { status: string }) => {
        if (status === "readyToPlay" && !hasResumedRef.current) {
          const pos = savedResumePositionRef.current;
          if (pos > 1) {
            hasResumedRef.current = true;
            // Small delay — readyToPlay can fire before the buffer has enough
            // data at the target position for the seek to actually land.
            setTimeout(() => {
              player.currentTime = pos;
            }, 300);
          }
        }
      },
    );
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, isYouTubeVideo, isVimeoVideo]);

  // ── expo-video: end of video ─────────────────────────────────────────────
  useEffect(() => {
    if (!player || isYouTubeVideo || isVimeoVideo) return;
    const sub = player.addListener("playToEnd", async () => {
      isCompletedRef.current = true;
      setIsVideoCompleted(true);
      const dur = durationRef.current;
      setVideoDetailSynced((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          userProgress: prev.userProgress
            ? {
                ...prev.userProgress,
                is_completed: true,
                watch_time_seconds: Math.floor(dur),
                last_position_seconds: Math.floor(dur),
              }
            : {
                is_completed: true,
                watch_time_seconds: Math.floor(dur),
                last_position_seconds: Math.floor(dur),
              },
        };
      });
      if (videoDetailRef.current && userId) {
        await videoService.updateProgress(courseId, {
          userId,
          videoId,
          watchTimeSeconds: Math.floor(dur),
          isCompleted: true,
          lastPositionSeconds: Math.floor(dur),
        });
        void refreshEnrollmentProgress();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, isYouTubeVideo, isVimeoVideo]);

  // ── Playback controls ────────────────────────────────────────────────────
  const togglePlayPause = () => {
    if (isYouTubeVideo) {
      setIsPlaying((p) => !p);
      return;
    }
    player?.playing ? player.pause() : player?.play();
  };

  const handleSeek = (secs: number) => {
    if (!player) return;
    player.currentTime = Math.max(
      0,
      Math.min(currentPosition + secs, duration),
    );
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    if (player) player.playbackRate = next;
    setPlaybackSpeed(next);
  };

  const handleProgressBarPress = (event: any) => {
    if (!player || !duration || !isFinite(duration)) return;
    event.target.measure(
      (_x: number, _y: number, w: number, _h: number, px: number) => {
        const pct = Math.max(
          0,
          Math.min(1, (event.nativeEvent.pageX - px) / w),
        );
        const t = pct * duration;
        if (isFinite(t) && t >= 0) {
          player.currentTime = t;
          setCurrentPositionSynced(t);
        }
      },
    );
  };

  const handleFullscreenToggle = () => {
    if (!videoViewRef.current) return;
    isFullscreen
      ? videoViewRef.current.exitFullscreen()
      : videoViewRef.current.enterFullscreen();
  };

  // ── YouTube event handlers ───────────────────────────────────────────────
  const onYouTubeError = () => {
    const msg =
      "Failed to play YouTube video. The video may be unavailable or restricted.";
    setError(msg);
    showErrorAndRedirect(msg);
  };

  const onYouTubeStateChange = async (state: string) => {
    if (state === "playing") {
      setIsPlaying(true);
      if (!youtubePlayerRef.current) return;
      try {
        const t = await youtubePlayerRef.current.getCurrentTime();
        const d = await youtubePlayerRef.current.getDuration();
        setCurrentPositionSynced(t);
        if (d > 0) setDurationSynced(d);
      } catch (_) {}
      return;
    }

    if (state !== "paused" && state !== "ended") return;
    setIsPlaying(false);
    if (!youtubePlayerRef.current) return;
    try {
      const t = await youtubePlayerRef.current.getCurrentTime();
      const d = await youtubePlayerRef.current.getDuration();
      setCurrentPositionSynced(t);
      if (d > 0) setDurationSynced(d);
      if (t >= 1 && d > 0) {
        markCompleteIfNeeded(t, d);
        // saveProgress reads from refs so always has fresh t and d
        await saveProgress();
      }
    } catch (_) {}
  };

  const onYouTubeProgress = ({
    currentTime,
    duration: dur,
  }: {
    currentTime: number;
    duration: number;
  }) => {
    setCurrentPositionSynced(currentTime);
    if (dur > 0) setDurationSynced(dur);
    markCompleteIfNeeded(currentTime, dur);
  };

  // ── Vimeo event handlers ─────────────────────────────────────────────────
  const onVimeoLoaded = (d: number) => setDurationSynced(d);

  const onVimeoStateChange = async (state: "playing" | "paused" | "ended") => {
    if (state === "playing") {
      setIsPlaying(true);
      return;
    }

    setIsPlaying(false);

    if (state === "paused") {
      void saveProgress();
      return;
    }

    // ended
    isCompletedRef.current = true;
    setIsVideoCompleted(true);
    const pos = currentPositionRef.current;
    const dur = durationRef.current;
    await videoService.updateProgress(courseId, {
      userId,
      videoId,
      watchTimeSeconds: Math.floor(dur || pos),
      isCompleted: true,
      lastPositionSeconds: Math.floor(dur || pos),
    });
    void refreshEnrollmentProgress();
  };

  const onVimeoProgress = ({
    currentTime,
    duration: dur,
  }: {
    currentTime: number;
    duration: number;
  }) => {
    setCurrentPositionSynced(currentTime);
    if (dur > 0) setDurationSynced(dur);
    markCompleteIfNeeded(currentTime, dur);
  };

  const onVimeoError = (msg: string) => {
    setError(msg);
    showErrorAndRedirect(msg);
  };
  const onVimeoSeekRestricted = () => setVimeoSeekRestricted(true);

  // ── Item navigation ──────────────────────────────────────────────────────
  const navigateToItem = (item: typeof nextItemInModule) => {
    if (!item) return;
    saveProgress();
    const params = {
      courseId,
      sectionId: item.sectionId,
      userId,
      sourceScreen,
    };
    if (item.item.type === "video")
      navigation.replace("VideoPlayer", { ...params, videoId: item.item.id });
    else if (item.item.type === "quiz")
      navigation.replace("QuizScreen", { ...params, quizId: item.item.id });
    else if (["pdf", "document", "ppt"].includes(item.item.type))
      navigation.replace("DocumentView", {
        ...params,
        documentId: item.item.id,
        documentType: item.item.type,
      });
  };

  const handleNextVideo = () => {
    if (!isVideoCompleted) {
      Alert.alert(
        "Complete This Lesson",
        "Please watch at least 90% of the video to unlock the next item.",
        [{ text: "OK" }],
      );
      return;
    }
    navigateToItem(nextItemInModule);
  };

  const handlePreviousVideo = () => navigateToItem(prevItemInModule);
  const formatTime = (s: number) => videoService.formatDuration(s);

  const navItemLabel = (
    item: typeof nextItemInModule,
    prefix: "PREVIOUS" | "NEXT",
  ) => {
    if (!item) return `${prefix} LESSON`;
    if (item.item.type === "quiz") return `${prefix} QUIZ`;
    if (["pdf", "document", "ppt"].includes(item.item.type))
      return `${prefix} DOCUMENT`;
    return `${prefix} LESSON`;
  };

  // ── Loading / error screens ──────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !videoDetail) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={Colors.textSecondary}
          />
          <Text style={styles.errorText}>{error || "Video not found"}</Text>
          <View style={styles.errorButtonContainer}>
            <TouchableOpacity
              style={[styles.errorButton, styles.retryButton]}
              onPress={fetchVideoDetail}
            >
              <Text style={styles.errorButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.errorButton, styles.goBackButton]}
              onPress={navigateBackToModuleDetail}
            >
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/*
        Compact header — always visible but slim.
        Shows only the back button + a single truncated title line.
        This replaces the full Screen header which was consuming too much
        vertical space above the video, especially on YouTube where the
        player's own chrome already occupies the top area.
      */}
      <View style={styles.compactHeader}>
        <TouchableOpacity
          onPress={() => {
            saveProgress();
            navigateBackToModuleDetail();
          }}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {videoDetail.course.title}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {videoDetail.section.title}
          </Text>
        </View>
      </View>

      {/* Video player — sits directly below the slim header, full width */}
      <View style={styles.videoContainer}>
        {isYouTubeVideo && youtubeVideoId ? (
          <YouTubePlayerWrapper
            ref={youtubePlayerRef}
            height={VIDEO_HEIGHT}
            videoId={youtubeVideoId}
            play={isPlaying}
            onChangeState={onYouTubeStateChange}
            onProgress={onYouTubeProgress}
            onError={onYouTubeError}
            initialPlayerParams={{ start: Math.floor(currentPosition) }}
          />
        ) : isVimeoVideo && vimeoVideoId ? (
          <VimeoPlayer
            ref={vimeoPlayerRef}
            videoId={vimeoVideoId}
            height={VIDEO_HEIGHT}
            startPosition={vimeoStartPositionRef.current}
            onLoaded={onVimeoLoaded}
            onStateChange={onVimeoStateChange}
            onProgress={onVimeoProgress}
            onError={onVimeoError}
            onSeekRestricted={onVimeoSeekRestricted}
          />
        ) : (
          <View style={styles.videoWrapper}>
            <VideoView
              ref={videoViewRef}
              player={player}
              style={styles.video}
              nativeControls={isFullscreen}
              contentFit="contain"
              fullscreenOptions={{ enable: true }}
              allowsPictureInPicture
              startsPictureInPictureAutomatically
              onFullscreenEnter={() => setIsFullscreen(true)}
              onFullscreenExit={() => setIsFullscreen(false)}
            />
            {!isFullscreen && (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setShowControls((v) => !v)}
                style={styles.touchableOverlay}
              >
                {showControls && (
                  <View style={styles.controlsOverlay} pointerEvents="box-none">
                    <View style={styles.topControls}>
                      <TouchableOpacity
                        style={styles.speedButton}
                        onPress={handleSpeedChange}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.speedText}>{playbackSpeed}x</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.centerControls}>
                      <TouchableOpacity
                        onPress={() => handleSeek(-10)}
                        activeOpacity={0.8}
                        style={styles.seekButton}
                      >
                        <Ionicons
                          name="play-back"
                          size={32}
                          color={Colors.white}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={togglePlayPause}
                        style={styles.playButton}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isPlaying ? "pause" : "play"}
                          size={40}
                          color={Colors.white}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleSeek(10)}
                        activeOpacity={0.8}
                        style={styles.seekButton}
                      >
                        <Ionicons
                          name="play-forward"
                          size={32}
                          color={Colors.white}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.bottomControls}>
                      <View style={styles.timeRow}>
                        <Text style={styles.timeText}>
                          {formatTime(currentPosition)} / {formatTime(duration)}
                        </Text>
                        <TouchableOpacity
                          onPress={handleFullscreenToggle}
                          activeOpacity={0.8}
                          style={styles.fullscreenButton}
                        >
                          <Ionicons
                            name="expand-outline"
                            size={24}
                            color={Colors.white}
                          />
                        </TouchableOpacity>
                      </View>
                      <Pressable
                        onPress={handleProgressBarPress}
                        hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
                      >
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${(currentPosition / duration) * 100}%`,
                              },
                            ]}
                          />
                        </View>
                      </Pressable>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Scrollable content below the player */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Vimeo seek-restriction banner */}
        {vimeoSeekRestricted && (
          <View style={styles.seekRestrictedBanner}>
            <Ionicons
              name="lock-closed-outline"
              size={15}
              color={Colors.starGold}
            />
            <Text style={styles.seekRestrictedText}>
              This video's creator has disabled skipping ahead. You must watch
              the video in full before seeking forward.
            </Text>
          </View>
        )}

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.progressBadge}>
            <Ionicons
              name={isVideoCompleted ? "checkmark-circle" : "time-outline"}
              size={16}
              color={isVideoCompleted ? Colors.green : Colors.starGold}
            />
            <Text
              style={[
                styles.progressText,
                isVideoCompleted && styles.progressTextCompleted,
              ]}
            >
              {isVideoCompleted
                ? "Completed"
                : videoDetail.userProgress
                  ? `Watched ${formatTime(videoDetail.userProgress.watch_time_seconds)}`
                  : "Not started"}
            </Text>
          </View>
          <Text style={styles.videoTitle}>{videoDetail.title}</Text>
          {videoDetail.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>About this lesson</Text>
              <Text style={styles.descriptionText}>
                {videoDetail.description}
              </Text>
            </View>
          )}
        </View>

        {/* Lesson navigation */}
        <View style={styles.navigationContainer}>
          {/* Previous */}
          <TouchableOpacity
            style={[
              styles.navButton,
              !prevItemInModule && styles.navButtonDisabled,
            ]}
            onPress={handlePreviousVideo}
            disabled={!prevItemInModule}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={prevItemInModule ? Colors.secondary : Colors.textSecondary}
            />
            <View style={styles.navButtonContent}>
              <Text
                style={[
                  styles.navLabel,
                  !prevItemInModule && styles.navLabelDisabled,
                ]}
              >
                {navItemLabel(prevItemInModule, "PREVIOUS")}
              </Text>
              <Text
                style={
                  prevItemInModule
                    ? styles.navButtonText
                    : styles.navButtonTextDisabled
                }
                numberOfLines={2}
              >
                {prevItemInModule?.item.title ?? "No previous item"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity
            style={[
              styles.navButton,
              (!nextItemInModule || !isVideoCompleted) &&
                styles.navButtonDisabled,
            ]}
            onPress={handleNextVideo}
            disabled={!nextItemInModule || !isVideoCompleted}
            activeOpacity={0.7}
          >
            <View style={styles.navButtonContent}>
              <Text
                style={[
                  styles.navLabel,
                  styles.navLabelRight,
                  (!nextItemInModule || !isVideoCompleted) &&
                    styles.navLabelDisabled,
                ]}
              >
                {navItemLabel(nextItemInModule, "NEXT")}
              </Text>
              {nextItemInModule ? (
                <>
                  <Text
                    style={[
                      styles.navButtonText,
                      styles.navButtonTextRight,
                      !isVideoCompleted && styles.navButtonTextDisabled,
                    ]}
                    numberOfLines={2}
                  >
                    {nextItemInModule.item.title}
                  </Text>
                  {!isVideoCompleted && (
                    <Text style={styles.lockedText}>
                      🔒 Complete this lesson first
                    </Text>
                  )}
                </>
              ) : (
                <Text
                  style={[
                    styles.navButtonTextDisabled,
                    styles.navButtonTextRight,
                  ]}
                >
                  No next item
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={
                nextItemInModule && isVideoCompleted
                  ? Colors.secondary
                  : Colors.textSecondary
              }
            />
          </TouchableOpacity>
        </View>

        {/* Course completion card */}
        {isLastItem && isVideoCompleted && (
          <CourseCompletionCard
            courseId={courseId}
            navigation={navigation}
            onBackToCourse={saveProgress}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default VideoPlayer;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Root
  container: { flex: 1, backgroundColor: Colors.primary },

  // Compact header — slim, just back button + truncated title
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    gap: Spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitles: { flex: 1 },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 17,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "400",
    color: Colors.textSecondary,
    lineHeight: 15,
    marginTop: 1,
  },

  // Loading / error
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
    textAlign: "center",
  },
  errorButtonContainer: {
    marginTop: Spacing.lg,
    flexDirection: "row",
    gap: Spacing.md,
  },
  errorButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 8,
    minWidth: 100,
  },
  retryButton: { backgroundColor: Colors.secondary },
  goBackButton: { backgroundColor: Colors.gray500 },
  errorButtonText: {
    color: Colors.white,
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
    textAlign: "center",
  },

  // Video — full width, 50% screen height, edge-to-edge
  videoContainer: {
    width: SCREEN_WIDTH,
    height: VIDEO_HEIGHT,
    backgroundColor: Colors.black,
  },
  videoWrapper: { width: "100%", height: "100%" },
  video: { width: "100%", height: "100%" },
  touchableOverlay: { ...StyleSheet.absoluteFillObject },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "space-between",
  },

  // Custom controls (direct video)
  topControls: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: Spacing.md,
  },
  speedButton: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  speedText: { color: Colors.white, fontSize: 13, fontWeight: "600" },
  centerControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
  },
  seekButton: { padding: 8 },
  playButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 32,
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.9,
  },
  bottomControls: { padding: Spacing.md },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timeText: { color: Colors.white, fontSize: 13, fontWeight: "500" },
  fullscreenButton: { paddingHorizontal: 4 },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.secondary,
    opacity: 0.9,
  },

  // Scrollable content
  scrollView: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },

  // Seek restriction banner
  seekRestrictedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.textInputBg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.starGold,
    borderRadius: 8,
    padding: Spacing.md,
  },
  seekRestrictedText: {
    flex: 1,
    fontSize: 12,
    color: Colors.starGold,
    lineHeight: 18,
  },

  // Info card
  infoCard: {
    backgroundColor: Colors.textInputBg,
    padding: Spacing.md,
    borderRadius: 12,
  },
  progressBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white + "20",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: Spacing.sm,
  },
  progressText: { fontSize: 13, color: Colors.starGold, fontWeight: "600" },
  progressTextCompleted: { color: Colors.green },
  videoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  descriptionContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray500,
  },
  descriptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Lesson navigation
  navigationContainer: { gap: Spacing.sm },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.textInputBg,
    borderRadius: 10,
  },
  navButtonDisabled: { opacity: 0.5 },
  navButtonContent: { flex: 1, marginHorizontal: Spacing.sm },
  navLabel: {
    fontSize: 11,
    color: Colors.secondary,
    marginBottom: 4,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  navLabelRight: { textAlign: "right" },
  navLabelDisabled: { color: Colors.textSecondary },
  navButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  navButtonTextRight: { textAlign: "right" },
  navButtonTextDisabled: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  lockedText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "right",
    fontStyle: "italic",
  },
});
