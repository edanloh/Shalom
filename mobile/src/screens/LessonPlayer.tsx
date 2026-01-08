import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
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
import { videoService, moduleService } from "@/services";
import type { VideoDetailResponse } from "@/services";
import Screen from "@/components/common/Screen";
import type { CourseSection, ModuleItem } from "@/services/moduleService";

const width = Dimensions.get("window").width;
const VIDEOWIDTH = width - Spacing.lg * 2;
const VIDEO_HEIGHT = VIDEOWIDTH * (9 / 16); // 16:9 aspect ratio

type VideoDetail = VideoDetailResponse["data"];
type LessonPlayerNavigationProp = StackNavigationProp<
  MainStackParamList,
  "LessonPlayer"
>;

// Helper function to check if URL is YouTube
const isYouTubeUrl = (url: string): boolean => {
  return url.includes("youtube.com") || url.includes("youtu.be");
};

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
};

// Helper function to convert YouTube URL to direct video URL (if possible)
const getPlayableVideoUrl = (url: string): string => {
  // For YouTube URLs, we need to note this won't work with expo-av
  // You'd need to use a WebView or react-native-youtube-iframe
  if (isYouTubeUrl(url)) {
    const videoId = getYouTubeVideoId(url);
    if (videoId) {
      // Return a placeholder message for now
      console.warn(
        "YouTube videos require a WebView or YouTube player component"
      );
      // You could return an embed URL, but expo-av won't play it
      return url;
    }
  }
  return url;
};

const LessonPlayer = () => {
  const route = useRoute();
  const navigation = useNavigation<LessonPlayerNavigationProp>();
  const { videoId, courseId, sectionId, userId } = route.params as any;

  const youtubePlayerRef = useRef<any>(null);
  const videoViewRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [videoSource, setVideoSource] = useState<string>("");

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
  });

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
  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [nextItemInModule, setNextItemInModule] = useState<{
    item: ModuleItem;
    sectionId: string;
  } | null>(null);
  const [prevItemInModule, setPrevItemInModule] = useState<{
    item: ModuleItem;
    sectionId: string;
  } | null>(null);

  useEffect(() => {
    fetchVideoDetail();
    fetchCourseSections();

    // Save progress when user leaves the screen
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // Save final progress before unmounting
      saveProgress();
    };
  }, [videoId]);

  useEffect(() => {
    if (isPlaying) {
      if (!isYouTubeVideo) {
        // Only use interval for non-YouTube videos
        progressIntervalRef.current = setInterval(() => {
          saveProgress();
        }, 10000);
      } else {
        // For YouTube, save progress every 10 seconds while playing
        progressIntervalRef.current = setInterval(async () => {
          // Manually get current time from YouTube player if available
          if (youtubePlayerRef.current) {
            try {
              const currentTime =
                await youtubePlayerRef.current.getCurrentTime();
              const videoDuration =
                await youtubePlayerRef.current.getDuration();

              setCurrentPosition(currentTime);
              if (duration === 0 && videoDuration > 0) {
                setDuration(videoDuration);
              }
            } catch (err) {
              console.log("⚠️ Could not get YouTube time:", err);
            }
          }
          saveProgress();
        }, 10000);
      }
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, currentPosition, isYouTubeVideo]);

  const fetchVideoDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await videoService.getVideoDetail(courseId, videoId, userId);
      setVideoDetail(data);

      // Check if it's a YouTube video
      if (isYouTubeUrl(data.video_url)) {
        const ytId = getYouTubeVideoId(data.video_url);
        if (ytId) {
          setIsYouTubeVideo(true);
          setYoutubeVideoId(ytId);
          // Set duration from database
          setDuration(data.duration_seconds || 0);
          // Set initial position from user progress
          if (data.userProgress?.last_position_seconds) {
            setCurrentPosition(data.userProgress.last_position_seconds);
          }
        } else {
          const errorMsg = "Invalid YouTube URL format";
          setError(errorMsg);
          showErrorAndRedirect(errorMsg);
        }
      } else {
        setIsYouTubeVideo(false);
        setVideoSource(data.video_url);
        // For direct videos, set position after video loads
        if (data.userProgress?.last_position_seconds) {
          player.currentTime = data.userProgress.last_position_seconds;
        }
      }
    } catch (err: any) {
      console.error("Error fetching video detail:", err);
      const errorMsg = err.message || "Failed to load video";
      setError(errorMsg);
      showErrorAndRedirect(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const showErrorAndRedirect = (errorMessage: string) => {
    Alert.alert(
      "Video Error",
      errorMessage,
      [
        {
          text: "Go Back",
          onPress: () => {
            navigation.goBack();
          },
        },
        {
          text: "Go to Course",
          onPress: () => {
            navigation.navigate("CourseDetail", { courseId });
          },
          style: "cancel",
        },
      ],
      { cancelable: false }
    );
  };

  const fetchCourseSections = async () => {
    try {
      const moduleDetail = await moduleService.getModuleDetail(courseId, userId);
      setCourseSections(moduleDetail.sections);
    } catch (err) {
      console.error('Error fetching course sections:', err);
    }
  };

  const findNextItemAcrossModules = (): { item: ModuleItem; sectionId: string } | null => {
    if (!videoDetail || courseSections.length === 0) return null;

    // Find current section
    const currentSectionIndex = courseSections.findIndex(
      (section) => section.id === videoDetail.section.id
    );

    if (currentSectionIndex === -1) return null;

    const currentSection = courseSections[currentSectionIndex];
    
    // First, try to find next item in CURRENT module
    if (currentSection.items && currentSection.items.length > 0) {
      const currentItemIndex = currentSection.items.findIndex(
        (item) => item.id === videoId && item.type === 'video'
      );
      
      // If current video found and there's a next item in this module
      if (currentItemIndex !== -1 && currentItemIndex < currentSection.items.length - 1) {
        return {
          item: currentSection.items[currentItemIndex + 1],
          sectionId: currentSection.id,
        };
      }
    }

    // If no next item in current module, look through remaining sections
    for (let i = currentSectionIndex + 1; i < courseSections.length; i++) {
      const section = courseSections[i];
      if (section.items && section.items.length > 0) {
        // Return the first item (video or quiz) in the next module
        return {
          item: section.items[0],
          sectionId: section.id,
        };
      }
    }

    return null;
  };

  const findPreviousItemAcrossModules = (): { item: ModuleItem; sectionId: string } | null => {
    if (!videoDetail || courseSections.length === 0) return null;

    // Find current section
    const currentSectionIndex = courseSections.findIndex(
      (section) => section.id === videoDetail.section.id
    );

    if (currentSectionIndex === -1) return null;

    const currentSection = courseSections[currentSectionIndex];
    
    // First, try to find previous item in CURRENT module
    if (currentSection.items && currentSection.items.length > 0) {
      const currentItemIndex = currentSection.items.findIndex(
        (item) => item.id === videoId && item.type === 'video'
      );
      
      // If current video found and there's a previous item in this module
      if (currentItemIndex > 0) {
        return {
          item: currentSection.items[currentItemIndex - 1],
          sectionId: currentSection.id,
        };
      }
    }

    // If no previous item in current module, look through previous sections
    for (let i = currentSectionIndex - 1; i >= 0; i--) {
      const section = courseSections[i];
      if (section.items && section.items.length > 0) {
        // Return the last item (video or quiz) in the previous module
        return {
          item: section.items[section.items.length - 1],
          sectionId: section.id,
        };
      }
    }

    return null;
  };

  useEffect(() => {
    if (videoDetail && courseSections.length > 0) {
      // Always check for next item in sequential order (current module first, then next module)
      const nextItem = findNextItemAcrossModules();
      setNextItemInModule(nextItem);

      // Always check for previous item in sequential order (current module first, then previous module)
      const prevItem = findPreviousItemAcrossModules();
      setPrevItemInModule(prevItem);
    }
  }, [videoDetail, courseSections]);

  const saveProgress = async () => {
    // Skip if essential data is missing
    if (!userId || !videoDetail || duration === 0) {
      console.log("⚠️ Skipping progress save - missing data:", {
        hasUserId: !!userId,
        hasVideoDetail: !!videoDetail,
        duration,
        currentPosition,
      });
      return;
    }

    // Skip if no meaningful progress (user hasn't watched at least 1 second)
    if (currentPosition < 1) {
      console.log("⚠️ Skipping progress save - no meaningful progress yet:", {
        currentPosition,
        duration,
      });
      return;
    }

    try {
      // Only mark as completed if user watched at least 90% of the video
      const watchPercentage = (currentPosition / duration) * 100;
      const isCompleted = currentPosition >= duration * 0.90;
      
      console.log('💾 Saving progress:', {
        currentPosition,
        duration,
        watchPercentage: watchPercentage.toFixed(2) + '%',
        isCompleted,
      });

      const result = await videoService.updateProgress(courseId, {
        userId,
        videoId,
        watchTimeSeconds: Math.floor(currentPosition),
        isCompleted,
        lastPositionSeconds: Math.floor(currentPosition),
      });

      // Update local state if video is now completed
      if (isCompleted && videoDetail && videoDetail.userProgress) {
        console.log('✅ Updating local state - video completed!');
        setVideoDetail({
          ...videoDetail,
          userProgress: {
            ...videoDetail.userProgress,
            is_completed: true,
            watch_time_seconds: Math.floor(currentPosition),
            last_position_seconds: Math.floor(currentPosition),
          },
        });
      } else if (videoDetail && videoDetail.userProgress) {
        // Also update watch time even if not completed
        setVideoDetail({
          ...videoDetail,
          userProgress: {
            ...videoDetail.userProgress,
            watch_time_seconds: Math.floor(currentPosition),
            last_position_seconds: Math.floor(currentPosition),
          },
        });
      }
    } catch (err) {
      console.error(" Error saving progress:", err);
    }
  };

  // Monitor player status changes
  useEffect(() => {
    if (!player || isYouTubeVideo) return;

    const interval = setInterval(() => {
      setCurrentPosition(player.currentTime);
      setDuration(player.duration);
      setIsPlaying(player.playing);
    }, 100);

    return () => clearInterval(interval);
  }, [player, isYouTubeVideo]);

  // Listen for playback end
  useEffect(() => {
    if (!player || isYouTubeVideo) return;

    const subscription = player.addListener("playToEnd", async () => {
      console.log("🏁 Video finished! Marking as complete...");
      
      // Force completion when video ends
      if (videoDetail && userId) {
        try {
          await videoService.updateProgress(courseId, {
            userId,
            videoId,
            watchTimeSeconds: Math.floor(duration),
            isCompleted: true,
            lastPositionSeconds: Math.floor(duration),
          });
          
          // Update local state
          setVideoDetail({
            ...videoDetail,
            userProgress: {
              ...videoDetail.userProgress!,
              is_completed: true,
              watch_time_seconds: Math.floor(duration),
              last_position_seconds: Math.floor(duration),
            },
          });
          
          console.log('✅ Video marked as complete!');
        } catch (err) {
          console.error('❌ Error marking video as complete:', err);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [player, isYouTubeVideo]);

  const togglePlayPause = () => {
    if (isYouTubeVideo) {
      // YouTube player controls managed by component
      setIsPlaying(!isPlaying);
    } else if (player) {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    }
  };

  const handleSeek = (seconds: number) => {
    if (player) {
      const newPosition = Math.max(
        0,
        Math.min(currentPosition + seconds, duration)
      );
      player.currentTime = newPosition;
    }
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

    if (player) {
      player.playbackRate = nextSpeed;
      setPlaybackSpeed(nextSpeed);
    }
  };

  const handleProgressBarPress = (event: any) => {
    if (!player || !duration || duration <= 0 || !isFinite(duration)) return;

    // Get the touch position relative to the progress bar
    const { pageX } = event.nativeEvent;

    // Measure the progress bar to get its actual position and width
    event.target.measure(
      (
        x: number,
        y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number
      ) => {
        const touchX = event.nativeEvent.pageX - pageX;
        const percentage = Math.max(0, Math.min(1, touchX / width));
        const newTime = percentage * duration;

        // Additional safety check
        if (isFinite(newTime) && newTime >= 0) {
          player.currentTime = newTime;
          setCurrentPosition(newTime);
        }
      }
    );
  };

  const handleNextVideo = () => {
    if (nextItemInModule) {
      saveProgress();
      
      if (nextItemInModule.item.type === 'video') {
        navigation.replace("LessonPlayer", {
          videoId: nextItemInModule.item.id,
          courseId,
          sectionId: nextItemInModule.sectionId,
          userId,
        });
      } else if (nextItemInModule.item.type === 'quiz') {
        navigation.navigate("QuizScreen", {
          quizId: nextItemInModule.item.id,
          courseId,
          sectionId: nextItemInModule.sectionId,
          userId,
        });
      }
    }
  };

  const handlePreviousVideo = () => {
    if (prevItemInModule) {
      saveProgress();
      
      if (prevItemInModule.item.type === 'video') {
        navigation.replace("LessonPlayer", {
          videoId: prevItemInModule.item.id,
          courseId,
          sectionId: prevItemInModule.sectionId,
          userId,
        });
      } else if (prevItemInModule.item.type === 'quiz') {
        navigation.navigate("QuizScreen", {
          quizId: prevItemInModule.item.id,
          courseId,
          sectionId: prevItemInModule.sectionId,
          userId,
        });
      }
    }
  };

  const handleFullScreen = () => {
    if (videoViewRef.current) {
      videoViewRef.current.enterFullscreen();
    }
  };

  // YouTube player error handler
  const onYouTubeError = (error: string) => {
    console.error("YouTube player error:", error);
    const errorMsg = "Failed to play YouTube video. The video may be unavailable or restricted.";
    setError(errorMsg);
    showErrorAndRedirect(errorMsg);
  };

  // Video player error handler
  const onVideoError = (error: any) => {
    console.error("Video player error:", error);
    const errorMsg = "Failed to play video. The video file may be corrupted or unavailable.";
    setError(errorMsg);
    showErrorAndRedirect(errorMsg);
  };

  // YouTube player handlers
  const onYouTubeStateChange = async (state: string) => {
    if (state === "playing") {
      setIsPlaying(true);

      // Immediately get current position when video starts playing
      if (youtubePlayerRef.current) {
        try {
          const currentTime = await youtubePlayerRef.current.getCurrentTime();
          const videoDuration = await youtubePlayerRef.current.getDuration();

          setCurrentPosition(currentTime);
          if (duration === 0 && videoDuration > 0) {
            setDuration(videoDuration);
          }
        } catch (err) {
          console.error("❌ Error getting YouTube position on play:", err);
        }
      }
    } else if (state === "paused" || state === "ended") {
      setIsPlaying(false);

      // Save progress when paused or ended
      if (youtubePlayerRef.current) {
        try {
          const currentTime = await youtubePlayerRef.current.getCurrentTime();
          const videoDuration = await youtubePlayerRef.current.getDuration();

          // Update state
          setCurrentPosition(currentTime);
          if (duration === 0 && videoDuration > 0) {
            setDuration(videoDuration);
          }

          // Save progress directly with the values we just got
          if (currentTime >= 1 && videoDuration > 0) {
            const watchPercentage = (currentTime / videoDuration) * 100;
            // Force completion if state is "ended", otherwise use 90% threshold
            const isCompleted = state === "ended" || currentTime >= videoDuration * 0.90;

            console.log("📹 Saving YouTube progress directly:", {
              currentTime,
              videoDuration,
              watchPercentage: watchPercentage.toFixed(2) + "%",
              isCompleted,
              state,
            });

            try {
              const result = await videoService.updateProgress(courseId, {
                userId,
                videoId,
                watchTimeSeconds: Math.floor(currentTime),
                isCompleted,
                lastPositionSeconds: Math.floor(currentTime),
              });

              // Update local state if video is now completed
              if (isCompleted && videoDetail && videoDetail.userProgress) {
                console.log('✅ Updating local state - YouTube video completed!');
                setVideoDetail({
                  ...videoDetail,
                  userProgress: {
                    ...videoDetail.userProgress,
                    is_completed: true,
                    watch_time_seconds: Math.floor(currentTime),
                    last_position_seconds: Math.floor(currentTime),
                  },
                });
              }
            } catch (err) {
              console.error("❌ Error saving YouTube progress:", err);
            }
          } else {
            console.log(
              "⚠️ Skipping YouTube progress save - insufficient data:",
              {
                currentTime,
                videoDuration,
              }
            );
          }
        } catch (err) {
          console.error(`❌ Error getting YouTube position on ${state}:`, err);
        }
      }

      if (state === "ended") {
        console.log("🏁 YouTube video ended! Video marked as complete.");
      }
    }
  };

  const onYouTubeProgress = (progress: {
    currentTime: number;
    duration: number;
  }) => {
    setCurrentPosition(progress.currentTime);
    if (duration === 0 && progress.duration > 0) {
      setDuration(progress.duration);
    }
  };

  const formatTime = (seconds: number) => {
    return videoService.formatDuration(seconds);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple600} />
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
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Screen
      title={videoDetail.course.title}
      subtitle={videoDetail.section.title}
      navigation={navigation}
      headerLeftIcon="chevron-back"
      customEdges={["top", "bottom"]}
      onHeaderLeftPress={() => {
        saveProgress();
        // Pass state to refresh CourseDetail if video was completed
        if (videoDetail?.userProgress?.is_completed) {
          navigation.navigate('CourseDetail', {
            courseId,
            videoCompleted: true,
            videoId,
          } as any);
        } else {
          navigation.goBack();
        }
      }}
    >
      {/* Video Player */}
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
            initialPlayerParams={{
              start: Math.floor(currentPosition),
            }}
          />
        ) : (
          <View style={styles.videoWrapper}>
            <VideoView
              ref={videoViewRef}
              player={player}
              style={styles.video}
              nativeControls={false}
              contentFit="contain"
              fullscreenOptions={{ enable: true }}
              allowsPictureInPicture
              startsPictureInPictureAutomatically
              onError={onVideoError}
            />

            {/* Touchable overlay for showing/hiding controls */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowControls(!showControls)}
              style={styles.touchableOverlay}
            >
              {/* Custom Controls Overlay */}
              {showControls && (
                <View style={styles.controlsOverlay} pointerEvents="box-none">
                  {/* Top Controls */}
                  <View style={styles.topControls}>
                    <TouchableOpacity
                      style={styles.speedButton}
                      onPress={handleSpeedChange}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.speedText}>{playbackSpeed}x</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Center Play/Pause */}
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

                  {/* Bottom Controls */}
                  <View style={styles.bottomControls}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text style={styles.timeText}>
                        {formatTime(currentPosition)} / {formatTime(duration)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleFullScreen()}
                        activeOpacity={0.8}
                        style={{ paddingHorizontal: 12, marginBottom: 8 }}
                      >
                        <Ionicons
                          name="tablet-landscape-outline"
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
          </View>
        )}
      </View>

      {/* Video Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.videoTitle}>{videoDetail.title}</Text>

        {videoDetail.userProgress && (
          <View style={styles.progressBadge}>
            <Ionicons
              name={
                videoDetail.userProgress.is_completed
                  ? "checkmark-circle"
                  : "time-outline"
              }
              size={16}
              color={
                videoDetail.userProgress.is_completed
                  ? Colors.green
                  : Colors.starGold
              }
            />
            <Text
              style={[
                styles.progressText,
                videoDetail.userProgress.is_completed &&
                  styles.progressTextCompleted,
              ]}
            >
              {videoDetail.userProgress.is_completed
                ? "Completed"
                : `Watched ${formatTime(
                    videoDetail.userProgress.watch_time_seconds
                  )}`}
            </Text>
          </View>
        )}

        {videoDetail.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>About this lesson</Text>
            <Text style={styles.descriptionText}>
              {videoDetail.description}
            </Text>
          </View>
        )}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
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
            color={
              prevItemInModule
                ? Colors.purple600
                : Colors.textSecondary
            }
          />
          <View style={styles.navButtonContent}>
            <Text
              style={[
                styles.navLabel,
                !prevItemInModule && styles.navLabelDisabled,
              ]}
            >
              PREVIOUS
            </Text>
            {prevItemInModule ? (
              <Text style={styles.navButtonText} numberOfLines={2}>
                {prevItemInModule.item.title}
              </Text>
            ) : (
              <Text style={styles.navButtonTextDisabled}>
                No previous lesson
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            !nextItemInModule && styles.navButtonDisabled,
          ]}
          onPress={handleNextVideo}
          disabled={!nextItemInModule}
          activeOpacity={0.7}
        >
          <View style={styles.navButtonContent}>
            <Text
              style={[
                styles.navLabel,
                styles.navLabelRight,
                !nextItemInModule && styles.navLabelDisabled,
              ]}
            >
              NEXT
            </Text>
            {nextItemInModule ? (
              <Text
                style={[styles.navButtonText, styles.navButtonTextRight]}
                numberOfLines={2}
              >
                {nextItemInModule.item.title}
              </Text>
            ) : (
              <Text
                style={[
                  styles.navButtonTextDisabled,
                  styles.navButtonTextRight,
                ]}
              >
                No next lesson
              </Text>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              nextItemInModule
                ? Colors.purple600
                : Colors.textSecondary
            }
          />
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  retryButton: {
    backgroundColor: Colors.purple600,
  },
  goBackButton: {
    backgroundColor: Colors.gray500,
  },
  errorButtonText: {
    color: Colors.white,
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
    textAlign: "center",
  },
  videoContainer: {
    width: VIDEOWIDTH,
    height: VIDEO_HEIGHT,
    backgroundColor: Colors.black,
    position: "relative",
    alignSelf: "center",
  },
  videoWrapper: {
    width: "100%",
    height: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  touchableOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "space-between",
  },
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
  speedText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  centerControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
  },
  seekButton: {
    padding: 8,
  },
  playButton: {
    backgroundColor: Colors.purple600,
    borderRadius: 32,
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.8,
  },
  bottomControls: {
    padding: Spacing.md,
  },
  timeText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.purple600,
    opacity: 0.8,
  },
  infoCard: {
    backgroundColor: Colors.textInputBg,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 12,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 24,
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
  progressText: {
    fontSize: 13,
    color: Colors.starGold,
    fontWeight: "600",
  },
  progressTextCompleted: {
    color: Colors.green,
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
  navigationContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.textInputBg,
    borderRadius: 10,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonContent: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  navLabel: {
    fontSize: 11,
    color: Colors.purple600,
    marginBottom: 4,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  navLabelRight: {
    textAlign: "right",
  },
  navLabelDisabled: {
    color: Colors.textSecondary,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  navButtonTextRight: {
    textAlign: "right",
  },
  navButtonTextDisabled: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});

export default LessonPlayer;
