import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Pressable,
  Alert,
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

const width       = Dimensions.get("window").width;
const VIDEOWIDTH  = width - Spacing.lg * 2;
const VIDEO_HEIGHT = VIDEOWIDTH * (9 / 16);

type VideoDetail           = VideoDetailResponse["data"];
type VideoPlayerNavigationProp = StackNavigationProp<MainStackParamList, "VideoPlayer">;

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

const isYouTubeUrl   = (url: string) => url.includes("youtube.com") || url.includes("youtu.be");
const isVimeoUrl     = (url: string) => url.includes("vimeo.com")   || url.includes("player.vimeo.com");

const getYouTubeVideoId = (url: string): string | null => {
  const m = url.match(/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/);
  return m && m[7].length === 11 ? m[7] : null;
};

const getVimeoVideoId = (url: string): string | null => {
  for (const p of [/vimeo\.com\/(?:video\/)?(\d+)/, /player\.vimeo\.com\/video\/(\d+)/]) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const VideoPlayer = () => {
  const route      = useRoute();
  const navigation = useNavigation<VideoPlayerNavigationProp>();
  const { videoId, courseId, sectionId, userId, sourceScreen } = route.params as any;
  const { refreshMyCourses } = useCourses();

  // ── refs ──────────────────────────────────────────────────────────────────
  const youtubePlayerRef     = useRef<any>(null);
  const vimeoPlayerRef       = useRef<VimeoPlayerHandle>(null);
  const videoViewRef         = useRef<any>(null);
  const progressIntervalRef  = useRef<NodeJS.Timeout | null>(null);
  /**
   * Set synchronously in fetchVideoDetail BEFORE any setState so that
   * VimeoPlayer's very first render already has the correct resume position
   * baked into the iframe src. React state batching means currentPosition
   * would still be 0 on first render if we used state here.
   */
  const vimeoStartPositionRef = useRef<number>(0);

  // ── expo-video (direct mp4/hls) ───────────────────────────────────────────
  const [videoSource, setVideoSource] = useState<string>("");
  const player = useVideoPlayer(videoSource, (p) => { p.loop = false; });

  // ── state ─────────────────────────────────────────────────────────────────
  const [loading,          setLoading]          = useState(true);
  const [videoDetail,      setVideoDetail]      = useState<VideoDetail | null>(null);
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [currentPosition,  setCurrentPosition]  = useState(0);
  const [duration,         setDuration]         = useState(0);
  const [playbackSpeed,    setPlaybackSpeed]    = useState(1.0);
  const [showControls,     setShowControls]     = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [isYouTubeVideo,   setIsYouTubeVideo]   = useState(false);
  const [youtubeVideoId,   setYoutubeVideoId]   = useState<string | null>(null);
  const [isVimeoVideo,     setIsVimeoVideo]     = useState(false);
  const [vimeoVideoId,     setVimeoVideoId]     = useState<string | null>(null);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  const [isFullscreen,     setIsFullscreen]     = useState(false);
   
  /* True once Vimeo fires a seekRestricted event, meaning the video owner
   * has enabled "Prevent skipping" on this video via Vimeo's dashboard.
   * We show a persistent info banner below the player when this is true.
   */
  const [vimeoSeekRestricted, setVimeoSeekRestricted] = useState(false);

  // ── course navigation ─────────────────────────────────────────────────────
  const {
    nextItem: nextItemInModule,
    previousItem: prevItemInModule,
    isLastItem,
  } = useCourseNavigation(
    courseId, userId, videoId, "video",
    videoDetail?.section?.id || sectionId,
  );

  // ── lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchVideoDetail();
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      saveProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const refreshEnrollmentProgress = async () => {
    try { await refreshMyCourses(); }
    catch (err) { console.warn("Failed to refresh My Courses", err); }
  };

  // ── progress interval ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying && !isYouTubeVideo && !isVimeoVideo) {
      // Direct video — currentPosition is updated by the 100ms polling loop
      progressIntervalRef.current = setInterval(saveProgress, 10_000);
    } else if (isPlaying && isYouTubeVideo) {
      progressIntervalRef.current = setInterval(async () => {
        if (youtubePlayerRef.current) {
          try {
            const t = await youtubePlayerRef.current.getCurrentTime();
            const d = await youtubePlayerRef.current.getDuration();
            setCurrentPosition(t);
            if (duration === 0 && d > 0) setDuration(d);
          } catch (_) {}
        }
        saveProgress();
      }, 10_000);
    } else if (isPlaying && isVimeoVideo) {
      // Vimeo — currentPosition is kept up to date by onVimeoProgress via the
      // SDK timeupdate event. We just need to persist it periodically.
      progressIntervalRef.current = setInterval(saveProgress, 10_000);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentPosition, isYouTubeVideo, isVimeoVideo]);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchVideoDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      setVimeoSeekRestricted(false);

      const data = await videoService.getVideoDetail(courseId, videoId, userId);
      setVideoDetail(data);
      setIsVideoCompleted(data.userProgress?.is_completed || false);

      if (isYouTubeUrl(data.video_url)) {
        const ytId = getYouTubeVideoId(data.video_url);
        if (ytId) {
          setIsYouTubeVideo(true); setYoutubeVideoId(ytId);
          setIsVimeoVideo(false);  setVimeoVideoId(null);
          setVideoSource("");
          setDuration(data.duration_seconds || 0);
          if (data.userProgress?.last_position_seconds)
            setCurrentPosition(data.userProgress.last_position_seconds);
        } else {
          const msg = "Invalid YouTube URL format";
          setError(msg); showErrorAndRedirect(msg);
        }
      } else if (isVimeoUrl(data.video_url)) {
        const vmId = getVimeoVideoId(data.video_url);
        if (vmId) {
          // Set ref BEFORE setState so VimeoPlayer's first render gets the
          // correct start position baked into the iframe src hash (#t=Xs).
          vimeoStartPositionRef.current = data.userProgress?.last_position_seconds ?? 0;

          setIsVimeoVideo(true);   setVimeoVideoId(vmId);
          setIsYouTubeVideo(false); setYoutubeVideoId(null);
          setVideoSource("");
          setDuration(data.duration_seconds || 0);
          if (data.userProgress?.last_position_seconds)
            setCurrentPosition(data.userProgress.last_position_seconds);
        } else {
          const msg = "Invalid Vimeo URL format";
          setError(msg); showErrorAndRedirect(msg);
        }
      } else {
        setIsYouTubeVideo(false); setIsVimeoVideo(false);
        setVideoSource(data.video_url);
        if (data.userProgress?.last_position_seconds)
          player.currentTime = data.userProgress.last_position_seconds;
      }
    } catch (err: any) {
      const msg = err.message || "Failed to load video";
      setError(msg); showErrorAndRedirect(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── navigation helpers ────────────────────────────────────────────────────
  const navigateBackToModuleDetail = () => {
    if (navigation.canGoBack()) { navigation.goBack(); return; }
    const sid = videoDetail?.section?.id || sectionId;
    if (sid) {
      navigation.navigate("ModuleDetail", { courseId, sectionId: sid, userId, sourceScreen } as any);
      return;
    }
    navigation.navigate("CourseDetail", { courseId, sourceScreen } as any);
  };

  const showErrorAndRedirect = (msg: string) => {
    Alert.alert("Video Error", msg,
      [
        { text: "Go Back",      onPress: navigateBackToModuleDetail },
        { text: "Go to Course", onPress: () => navigation.navigate("CourseDetail", { courseId, sourceScreen } as any), style: "cancel" },
      ],
      { cancelable: false },
    );
  };

  // ── save progress ─────────────────────────────────────────────────────────
  const saveProgress = async () => {
    if (!userId || !videoDetail || duration === 0 || currentPosition < 1) return;
    try {
      const isCompleted = isVideoCompleted || currentPosition >= duration * 0.9;
      await videoService.updateProgress(courseId, {
        userId, videoId,
        watchTimeSeconds:    Math.floor(currentPosition),
        isCompleted,
        lastPositionSeconds: Math.floor(currentPosition),
      });
      if (isCompleted) void refreshEnrollmentProgress();
      if (videoDetail.userProgress) {
        setVideoDetail((prev) => prev && {
          ...prev,
          userProgress: {
            ...prev.userProgress!,
            is_completed:         isCompleted || prev.userProgress!.is_completed,
            watch_time_seconds:   Math.floor(currentPosition),
            last_position_seconds: Math.floor(currentPosition),
          },
        });
        if (isCompleted) setIsVideoCompleted(true);
      }
    } catch (err) { console.error("Error saving progress:", err); }
  };

  // ── expo-video polling ────────────────────────────────────────────────────
  useEffect(() => {
    if (!player || isYouTubeVideo || isVimeoVideo) return;
    const id = setInterval(() => {
      setCurrentPosition(player.currentTime);
      setDuration(player.duration);
      setIsPlaying(player.playing);
      if (player.duration > 0 && !isVideoCompleted && player.currentTime > 0)
        if ((player.currentTime / player.duration) * 100 >= 90) setIsVideoCompleted(true);
    }, 100);
    return () => clearInterval(id);
  }, [player, isYouTubeVideo, isVimeoVideo, isVideoCompleted]);

  
  useEffect(() => {
    if (!player || isYouTubeVideo || isVimeoVideo) return;
    const sub = player.addListener("playToEnd", async () => {
      setIsVideoCompleted(true);
      setVideoDetail((prev) => prev && {
        ...prev,
        userProgress: {
          ...prev.userProgress!,
          is_completed: true,
          watch_time_seconds: Math.floor(duration),
          last_position_seconds: Math.floor(duration),
        },
      });
      if (videoDetail && userId) {
        await videoService.updateProgress(courseId, {
          userId, videoId,
          watchTimeSeconds: Math.floor(duration), isCompleted: true,
          lastPositionSeconds: Math.floor(duration),
        });
        void refreshEnrollmentProgress();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, isYouTubeVideo, isVimeoVideo, videoDetail, duration]);

  // ── controls ──────────────────────────────────────────────────────────────
  const togglePlayPause = () => {
    if (isYouTubeVideo) { setIsPlaying((p) => !p); return; }
    player?.playing ? player.pause() : player?.play();
  };
  const handleSeek = (secs: number) => {
    if (!player) return;
    player.currentTime = Math.max(0, Math.min(currentPosition + secs, duration));
  };
  const handleSpeedChange = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    if (player) player.playbackRate = next;
    setPlaybackSpeed(next);
  };
  const handleProgressBarPress = (event: any) => {
    if (!player || !duration || !isFinite(duration)) return;
    event.target.measure((_x: number, _y: number, w: number, _h: number, px: number) => {
      const pct = Math.max(0, Math.min(1, (event.nativeEvent.pageX - px) / w));
      const t = pct * duration;
      if (isFinite(t) && t >= 0) { player.currentTime = t; setCurrentPosition(t); }
    });
  };
  const handleFullscreenToggle = () => {
    if (!videoViewRef.current) return;
    if (isFullscreen) {
      videoViewRef.current.exitFullscreen();
    } else {
      videoViewRef.current.enterFullscreen();
    }
  };

  // ── YouTube handlers ──────────────────────────────────────────────────────
  const onYouTubeError = () => {
    const msg = "Failed to play YouTube video. The video may be unavailable or restricted.";
    setError(msg); showErrorAndRedirect(msg);
  };
  const onYouTubeStateChange = async (state: string) => {
    if (state === "playing") {
      setIsPlaying(true);
      if (youtubePlayerRef.current) {
        try {
          const t = await youtubePlayerRef.current.getCurrentTime();
          const d = await youtubePlayerRef.current.getDuration();
          setCurrentPosition(t);
          if (duration === 0 && d > 0) setDuration(d);
        } catch (_) {}
      }
    } else if (state === "paused" || state === "ended") {
      setIsPlaying(false);
      if (youtubePlayerRef.current) {
        try {
          const t = await youtubePlayerRef.current.getCurrentTime();
          const d = await youtubePlayerRef.current.getDuration();
          setCurrentPosition(t);
          if (duration === 0 && d > 0) setDuration(d);
          if (t >= 1 && d > 0) {
            const done = isVideoCompleted || state === "ended" || t >= d * 0.9;
            if (done) {
              setIsVideoCompleted(true);
              setVideoDetail((prev) => prev && {
                ...prev,
                userProgress: { ...prev.userProgress!, is_completed: true, watch_time_seconds: Math.floor(t), last_position_seconds: Math.floor(t) },
              });
            }
            videoService.updateProgress(courseId, { userId, videoId, watchTimeSeconds: Math.floor(t), isCompleted: done, lastPositionSeconds: Math.floor(t) })
              .then(() => { if (done) void refreshEnrollmentProgress(); })
              .catch(console.error);
          }
        } catch (_) {}
      }
    }
  };
  const onYouTubeProgress = (p: { currentTime: number; duration: number }) => {
    setCurrentPosition(p.currentTime);
    if (duration === 0 && p.duration > 0) setDuration(p.duration);
    if (p.duration > 0 && !isVideoCompleted && p.currentTime > 0 && (p.currentTime / p.duration) * 100 >= 90)
      setIsVideoCompleted(true);
  };

  // ── Vimeo handlers ────────────────────────────────────────────────────────
  const onVimeoLoaded = (d: number) => setDuration(d);

  const onVimeoStateChange = async (state: "playing" | "paused" | "ended") => {
    if (state === "playing") {
      setIsPlaying(true);
    } else if (state === "paused") {
      setIsPlaying(false);
      void saveProgress();
    } else if (state === "ended") {
      setIsPlaying(false);
      setIsVideoCompleted(true);
      if (videoDetail && userId) {
        await videoService.updateProgress(courseId, {
          userId, videoId,
          watchTimeSeconds:    Math.floor(duration || currentPosition),
          isCompleted:         true,
          lastPositionSeconds: Math.floor(duration || currentPosition),
        });
        void refreshEnrollmentProgress();
      }
    }
  };

  const onVimeoProgress = (p: { currentTime: number; duration: number }) => {
    setCurrentPosition(p.currentTime);
    if (p.duration > 0) {
      setDuration(p.duration);
      if (!isVideoCompleted && p.currentTime > 0 && (p.currentTime / p.duration) * 100 >= 90) {
        setIsVideoCompleted(true);
        videoService.updateProgress(courseId, {
          userId, videoId,
          watchTimeSeconds: Math.floor(p.currentTime), isCompleted: true,
          lastPositionSeconds: Math.floor(p.currentTime),
        }).catch(console.error);
      }
    }
  };

  const onVimeoError = (msg: string) => { setError(msg); showErrorAndRedirect(msg); };

  /**
   * Called when Vimeo blocks a forward seek because the video owner has
   * enabled "Prevent skipping" / Playback Segments in their Vimeo dashboard.
   * We show a persistent banner below the player explaining this to the user.
   */
  const onVimeoSeekRestricted = () => setVimeoSeekRestricted(true);

  // ── item navigation ───────────────────────────────────────────────────────
  const navigateToItem = (item: typeof nextItemInModule) => {
    if (!item) return;
    saveProgress();
    const params = { courseId, sectionId: item.sectionId, userId, sourceScreen };
    if (item.item.type === "video")
      navigation.replace("VideoPlayer", { ...params, videoId: item.item.id });
    else if (item.item.type === "quiz")
      navigation.replace("QuizScreen", { ...params, quizId: item.item.id });
    else if (["pdf", "document", "ppt"].includes(item.item.type))
      navigation.replace("DocumentView", { ...params, documentId: item.item.id, documentType: item.item.type });
  };

  const handleNextVideo = () => {
    if (!isVideoCompleted) {
      Alert.alert("Complete This Lesson", "Please watch at least 90% of the video to unlock the next item.", [{ text: "OK" }]);
      return;
    }
    navigateToItem(nextItemInModule);
  };
  const handlePreviousVideo = () => navigateToItem(prevItemInModule);

  const formatTime = (s: number) => videoService.formatDuration(s);

  // ── loading / error guards ────────────────────────────────────────────────
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
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.errorText}>{error || "Video not found"}</Text>
          <View style={styles.errorButtonContainer}>
            <TouchableOpacity style={[styles.errorButton, styles.retryButton]}  onPress={fetchVideoDetail}>
              <Text style={styles.errorButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.errorButton, styles.goBackButton]} onPress={navigateBackToModuleDetail}>
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Screen
      title={videoDetail.course.title}
      subtitle={videoDetail.section.title}
      navigation={navigation}
      headerLeftIcon="chevron-back"
      customEdges={["top", "bottom"]}
      onHeaderLeftPress={() => { saveProgress(); navigateBackToModuleDetail(); }}
    >
      {/* ── Video player ── */}
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
              // In fullscreen iOS presents a native AVKit controller.
              // nativeControls must be true in that context so the system
              // renders its own Done button — without it the user is trapped.
              // In inline mode we use our custom overlay instead.
              nativeControls={isFullscreen}
              contentFit="contain"
              fullscreenOptions={{ enable: true }}
              allowsPictureInPicture
              startsPictureInPictureAutomatically
              onFullscreenEnter={() => setIsFullscreen(true)}
              onFullscreenExit={() => setIsFullscreen(false)}
            />
            {/* Only show custom controls when NOT in fullscreen.
                In fullscreen the native AVKit controls take over. */}
            {!isFullscreen && (
            <TouchableOpacity activeOpacity={1} onPress={() => setShowControls((v) => !v)} style={styles.touchableOverlay}>
              {showControls && (
                <View style={styles.controlsOverlay} pointerEvents="box-none">
                  <View style={styles.topControls}>
                    <TouchableOpacity style={styles.speedButton} onPress={handleSpeedChange} activeOpacity={0.8}>
                      <Text style={styles.speedText}>{playbackSpeed}x</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.centerControls}>
                    <TouchableOpacity onPress={() => handleSeek(-10)} activeOpacity={0.8} style={styles.seekButton}>
                      <Ionicons name="play-back" size={32} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={togglePlayPause} style={styles.playButton} activeOpacity={0.8}>
                      <Ionicons name={isPlaying ? "pause" : "play"} size={40} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleSeek(10)} activeOpacity={0.8} style={styles.seekButton}>
                      <Ionicons name="play-forward" size={32} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.bottomControls}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.timeText}>{formatTime(currentPosition)} / {formatTime(duration)}</Text>
                      <TouchableOpacity onPress={handleFullscreenToggle} activeOpacity={0.8} style={{ paddingHorizontal: 12, marginBottom: 8 }}>
                        <Ionicons name="expand-outline" size={24} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                    <Pressable onPress={handleProgressBarPress} hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${(currentPosition / duration) * 100}%` }]} />
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

      {/* ── Vimeo seek-restriction notice ── */}
      {vimeoSeekRestricted && (
        <View style={styles.seekRestrictedBanner}>
          <Ionicons name="lock-closed-outline" size={15} color={Colors.starGold} />
          <Text style={styles.seekRestrictedText}>
            This video's creator has disabled skipping ahead. You must watch the video in full before seeking forward.
          </Text>
        </View>
      )}

      {/* ── Info card ── */}
      <View style={styles.infoCard}>
        {videoDetail && (
          <View key={`badge-${isVideoCompleted}`} style={styles.progressBadge}>
            <Ionicons
              name={isVideoCompleted ? "checkmark-circle" : "time-outline"}
              size={16}
              color={isVideoCompleted ? Colors.green : Colors.starGold}
            />
            <Text style={[styles.progressText, isVideoCompleted && styles.progressTextCompleted]}>
              {isVideoCompleted
                ? "Completed"
                : videoDetail.userProgress
                  ? `Watched ${formatTime(videoDetail.userProgress.watch_time_seconds)}`
                  : "Not started"}
            </Text>
          </View>
        )}
        <Text style={styles.videoTitle}>{videoDetail.title}</Text>
        {videoDetail.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>About this lesson</Text>
            <Text style={styles.descriptionText}>{videoDetail.description}</Text>
          </View>
        )}
      </View>

      {/* ── Navigation ── */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, !prevItemInModule && styles.navButtonDisabled]}
          onPress={handlePreviousVideo}
          disabled={!prevItemInModule}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={prevItemInModule ? Colors.secondary : Colors.textSecondary} />
          <View style={styles.navButtonContent}>
            <Text style={[styles.navLabel, !prevItemInModule && styles.navLabelDisabled]}>
              {prevItemInModule?.item.type === "quiz" ? "PREVIOUS QUIZ"
                : ["pdf","document","ppt"].includes(prevItemInModule?.item.type||"") ? "PREVIOUS DOCUMENT"
                : "PREVIOUS LESSON"}
            </Text>
            {prevItemInModule
              ? <Text style={styles.navButtonText} numberOfLines={2}>{prevItemInModule.item.title}</Text>
              : <Text style={styles.navButtonTextDisabled}>No previous item</Text>}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          key={`next-btn-${isVideoCompleted}`}
          style={[styles.navButton, (!nextItemInModule || !isVideoCompleted) && styles.navButtonDisabled]}
          onPress={handleNextVideo}
          disabled={!nextItemInModule || !isVideoCompleted}
          activeOpacity={0.7}
        >
          <View style={styles.navButtonContent}>
            <Text style={[styles.navLabel, styles.navLabelRight, (!nextItemInModule || !isVideoCompleted) && styles.navLabelDisabled]}>
              {nextItemInModule?.item.type === "quiz" ? "NEXT QUIZ"
                : ["pdf","document","ppt"].includes(nextItemInModule?.item.type||"") ? "NEXT DOCUMENT"
                : "NEXT LESSON"}
            </Text>
            {nextItemInModule ? (
              <>
                <Text style={[styles.navButtonText, styles.navButtonTextRight, !isVideoCompleted && styles.navButtonTextDisabled]} numberOfLines={2}>
                  {nextItemInModule.item.title}
                </Text>
                {!isVideoCompleted && <Text style={styles.lockedText}>🔒 Complete this lesson first</Text>}
              </>
            ) : (
              <Text style={[styles.navButtonTextDisabled, styles.navButtonTextRight]}>No next item</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={nextItemInModule && isVideoCompleted ? Colors.secondary : Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Course completion ── */}
      {isLastItem && isVideoCompleted && (
        <CourseCompletionCard courseId={courseId} navigation={navigation} onBackToCourse={() => saveProgress()} />
      )}
    </Screen>
  );
};

export default VideoPlayer;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: Colors.primary },
  loadingContainer:     { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText:          { marginTop: Spacing.md, color: Colors.textSecondary, fontSize: TextStyles.body.fontSize },
  errorContainer:       { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.xl },
  errorText:            { marginTop: Spacing.md, color: Colors.textSecondary, fontSize: TextStyles.body.fontSize, textAlign: "center" },
  errorButtonContainer: { marginTop: Spacing.lg, flexDirection: "row", gap: Spacing.md },
  errorButton:          { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: 8, minWidth: 100 },
  retryButton:          { backgroundColor: Colors.secondary },
  goBackButton:         { backgroundColor: Colors.gray500 },
  errorButtonText:      { color: Colors.white, fontSize: TextStyles.body.fontSize, fontWeight: "600", textAlign: "center" },

  videoContainer:  { width: VIDEOWIDTH, height: VIDEO_HEIGHT, backgroundColor: Colors.black, alignSelf: "center", borderRadius: 12, overflow: "hidden" },
  videoWrapper:    { width: "100%", height: "100%" },
  video:           { width: "100%", height: "100%" },
  touchableOverlay: { ...StyleSheet.absoluteFillObject },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "space-between" },
  topControls:     { flexDirection: "row", justifyContent: "flex-end", padding: Spacing.md },
  speedButton:     { backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  speedText:       { color: Colors.white, fontSize: 13, fontWeight: "600" },
  centerControls:  { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 30 },
  seekButton:      { padding: 8 },
  playButton:      { backgroundColor: Colors.secondary, borderRadius: 32, width: 64, height: 64, justifyContent: "center", alignItems: "center", opacity: 0.9 },
  bottomControls:  { padding: Spacing.md },
  timeText:        { color: Colors.white, fontSize: 13, fontWeight: "500", marginBottom: 8 },
  progressBar:     { height: 8, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 4, overflow: "hidden" },
  progressFill:    { height: "100%", backgroundColor: Colors.secondary, opacity: 0.9 },

  // Seek-restriction notice — appears below the player when Vimeo blocks a seek
  seekRestrictedBanner: {
    flexDirection:   "row",
    alignItems:      "flex-start",
    gap:             8,
    backgroundColor: Colors.textInputBg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.starGold,
    borderRadius:    8,
    padding:         Spacing.md,
    marginTop:       Spacing.sm,
  },
  seekRestrictedText: {
    flex:       1,
    fontSize:   12,
    color:      Colors.starGold,
    lineHeight: 18,
  },

  infoCard:             { backgroundColor: Colors.textInputBg, marginTop: Spacing.lg, padding: Spacing.md, borderRadius: 12 },
  progressBadge:        { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white + "20", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, alignSelf: "flex-start", gap: 6, marginBottom: Spacing.sm },
  progressText:         { fontSize: 13, color: Colors.starGold, fontWeight: "600" },
  progressTextCompleted:{ color: Colors.green },
  videoTitle:           { fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginBottom: Spacing.sm, lineHeight: 24 },
  descriptionContainer: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.gray500 },
  descriptionTitle:     { fontSize: 15, fontWeight: "600", color: Colors.textPrimary, marginBottom: Spacing.sm },
  descriptionText:      { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  navigationContainer:   { marginTop: Spacing.lg, gap: Spacing.sm },
  navButton:             { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, backgroundColor: Colors.textInputBg, borderRadius: 10 },
  navButtonDisabled:     { opacity: 0.5 },
  navButtonContent:      { flex: 1, marginHorizontal: Spacing.sm },
  navLabel:              { fontSize: 11, color: Colors.secondary, marginBottom: 4, fontWeight: "700", letterSpacing: 0.5 },
  navLabelRight:         { textAlign: "right" },
  navLabelDisabled:      { color: Colors.textSecondary },
  navButtonText:         { fontSize: 14, fontWeight: "600", color: Colors.textPrimary, lineHeight: 18 },
  navButtonTextRight:    { textAlign: "right" },
  navButtonTextDisabled: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  lockedText:            { fontSize: 11, color: Colors.textSecondary, marginTop: 4, textAlign: "right", fontStyle: "italic" },
});