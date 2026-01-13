import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, TextStyles } from "@/constants";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { MainStackParamList } from "@/types/navigation";
import { quizService } from "@/services";
import { Images } from "../../assets";
import type {
  QuizQuestion,
  QuizDetailResponse,
  SubmitQuizResponse,
} from "@/services";
import Screen from "@/components/common/Screen";
import ActionButton from "@/components/ActionButton";
import { CourseCompletionCard } from "@/components";
import { useCourseNavigation } from "@/hooks";

type QuizDetail = QuizDetailResponse["data"];
type QuizResult = SubmitQuizResponse["data"];

type QuizScreenNavigationProp = StackNavigationProp<
  MainStackParamList,
  "QuizScreen"
>;

const QuizScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<QuizScreenNavigationProp>();
  const { quizId, courseId, sectionId, userId } = route.params as any;

  const [loading, setLoading] = useState(true);
  const [quizDetail, setQuizDetail] = useState<QuizDetail | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Map<string, string>>(
    new Map()
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [initialTime, setInitialTime] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  // Use course navigation hook
  const { nextItem: nextItemInModule, isLastItem } = useCourseNavigation(
    courseId,
    userId,
    quizId,
    "quiz",
    sectionId
  );

  useEffect(() => {
    fetchQuizDetail();
  }, [quizId]);

  useEffect(() => {
    // Timer countdown - only runs when timer is active and not in review/results mode
    if (
      timerActive &&
      timeRemaining !== null &&
      timeRemaining > 0 &&
      !showResults &&
      !reviewMode
    ) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            setTimerActive(false);
            handleSubmitQuiz(); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timerActive, timeRemaining, showResults, reviewMode]);

  const fetchQuizDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await quizService.getQuizDetail(courseId, quizId, userId);
      setQuizDetail(data);

      // Record start time for all quizzes
      setQuizStartTime(new Date());

      // Set timer if quiz has time limit
      if (data.time_limit_minutes) {
        const timeInSeconds = data.time_limit_minutes * 60;
        setTimeRemaining(timeInSeconds);
        setInitialTime(timeInSeconds);
        setTimerActive(true);
      }
    } catch (err: any) {
      console.error("Error fetching quiz detail:", err);
      setError(err.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseSections = async () => {
    try {
      const moduleDetail = await moduleService.getModuleDetail(
        courseId,
        userId
      );
      setCourseSections(moduleDetail.sections);
    } catch (err) {
      console.error("Error fetching course sections:", err);
    }
  };

  const handleAnswerSelect = (questionId: string, optionText: string) => {
    setSelectedAnswers((prev) => {
      const newMap = new Map(prev);
      newMap.set(questionId, optionText);
      return newMap;
    });
  };

  const handleNextQuestion = () => {
    if (quizDetail && currentQuestionIndex < quizDetail.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizDetail) return;

    // Check if all questions are answered
    if (
      !quizService.validateAnswers(selectedAnswers, quizDetail.questions.length)
    ) {
      Alert.alert(
        "Incomplete Quiz",
        "Please answer all questions before submitting.",
        [{ text: "OK" }]
      );
      return;
    }

    // Stop the timer
    setTimerActive(false);

    try {
      setSubmitting(true);

      const answersArray = quizService.convertAnswersToArray(selectedAnswers);

      // Calculate time taken in minutes
      let timeTakenMinutes = null;
      if (quizStartTime) {
        const endTime = new Date();
        const timeElapsedMs = endTime.getTime() - quizStartTime.getTime();
        const timeElapsedMinutes = Math.ceil(timeElapsedMs / (1000 * 60)); // Convert to minutes and round up
        timeTakenMinutes = timeElapsedMinutes;
      }

      const result = await quizService.submitQuiz(courseId, quizId, {
        userId,
        quizId,
        answers: answersArray,
        timeTakenMinutes,
      });

      setQuizResult(result);
      setShowResults(true);
    } catch (err: any) {
      console.error("Error submitting quiz:", err);
      Alert.alert("Error", err.message || "Failed to submit quiz");
      // Restart timer if submission failed
      setTimerActive(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (!quizDetail) return;

    // Reset quiz state completely
    setSelectedAnswers(new Map());
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setQuizResult(null);
    setReviewMode(false);

    // Reset start time for all quizzes
    setQuizStartTime(new Date());

    // Reset and restart timer if quiz has time limit
    if (quizDetail.time_limit_minutes) {
      const timeInSeconds = quizDetail.time_limit_minutes * 60;
      setTimeRemaining(timeInSeconds);
      setInitialTime(timeInSeconds);
      setTimerActive(true);
    }
  };

  const handleReview = () => {
    setShowResults(false);
    setReviewMode(true);
    setCurrentQuestionIndex(0);
  };

  const handleDoneReview = () => {
    // Go back to results page after reviewing
    setReviewMode(false);
    setShowResults(true);
  };
 const handleComplete = () => {
    console.log('🎯 handleComplete called:', {
      isPassed: quizResult?.isPassed,
      nextItemInModule: nextItemInModule,
      hasItem: nextItemInModule ? !!nextItemInModule.item : false,
      isLastItem,
    });

    // Only auto-navigate if quiz was passed
    if (quizResult && quizResult.isPassed) {
      console.log('🎯 Quiz passed! Checking next item...', {
        currentQuizId: quizId,
        currentSectionId: sectionId,
        isLastItem,
        nextItemInModule,
      });
      
      // Extra safety check - make sure nextItemInModule AND nextItemInModule.item exist
      if (nextItemInModule && nextItemInModule.item) {
        console.log('✅ Next item found:', {
          id: nextItemInModule.item.id,
          type: nextItemInModule.item.type,
          title: nextItemInModule.item.title,
          sectionId: nextItemInModule.sectionId,
        });

        // Navigate to next item (video, quiz, or pdf)
        if (nextItemInModule.item.type === 'video') {
          navigation.replace('LessonPlayer', {
            videoId: nextItemInModule.item.id,
            courseId,
            sectionId: nextItemInModule.sectionId,
            userId,
          });
        } else if (nextItemInModule.item.type === 'quiz') {
          navigation.replace('QuizScreen', {
            quizId: nextItemInModule.item.id,
            courseId,
            sectionId: nextItemInModule.sectionId,
            userId,
          });
        } else if (nextItemInModule.item.type === 'pdf') {
          navigation.replace('PDFView', {
            pdfId: nextItemInModule.item.id,
            courseId,
            sectionId: nextItemInModule.sectionId,
            userId,
          });
        }
        return;
      } else {
        console.log('⚠️ No valid next item - nextItemInModule:', nextItemInModule);
      }
    }
    
    // Default: Navigate back with state to refresh CourseDetail
    navigation.navigate('CourseDetail', {
      courseId,
      quizCompleted: true,
      quizId,
    } as any);
  };


  const formatTime = (seconds: number) => {
    return quizService.formatTime(seconds);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.purple400} />
          <Text style={styles.loadingText}>Loading quiz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !quizDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.red} />
          <Text style={styles.errorText}>{error || "Quiz not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchQuizDetail}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showResults && quizResult) {
    const isPassed = quizResult.isPassed;
    const scorePercentage = quizResult.score;

    // Check if this is the first time passing the quiz
    const isFirstPass = isPassed && quizResult.attemptNumber === 1;

    // Calculate passing mark in questions
    const passingMarkQuestions = quizDetail
      ? Math.ceil((quizDetail.passing_score / 100) * quizResult.totalQuestions)
      : 0;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultsHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.resultsHeaderTitle}>Quiz</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.resultsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Result Section */}
          <View style={styles.resultSection}>
            <View style={styles.resultContainer}>
              <Image
                source={isPassed ? Images.quizSuccess : Images.quizFail}
                style={styles.resultImage}
                resizeMode="contain"
              />
            </View>

            {/* Score Display */}
            <View style={styles.scoreSection}>
              <Text style={styles.scoreTitle}>Your Score</Text>
              <Text style={styles.scoreValue}>
                {quizResult.correctAnswers}/{quizResult.totalQuestions}
              </Text>

              {/* Show points only on first pass */}
              {isFirstPass && (
                <View style={styles.pointsContainer}>
                  <Text style={styles.pointsText}>
                    +{quizResult.correctAnswers * 10} Points
                  </Text>
                </View>
              )}

              {/* Show passing mark for failed attempts */}
              {!isPassed && (
                <Text style={styles.passingMarkText}>
                  Passing Mark: {passingMarkQuestions}/
                  {quizResult.totalQuestions}
                </Text>
              )}

              <Text style={styles.scoreSubtext}>
                {isPassed
                  ? "Good effort! Keep going!"
                  : "Almost there — Try again!"}
              </Text>
            </View>
          </View>

          {/* Course Completion Card - Show only if passed and is last item */}
          {isPassed && isLastItem && (
            <View style={styles.courseCompletionCard}>
              <View style={styles.courseCompletionHeader}>
                <Ionicons name="trophy" size={32} color={Colors.starGold} />
                <Text style={styles.courseCompletionTitle}>
                  🎉 Congratulations!
                </Text>
              </View>
              <Text style={styles.courseCompletionText}>
                You've completed this course. Great job!
              </Text>
              <TouchableOpacity
                style={styles.backToCourseButton}
                onPress={handleComplete}
                activeOpacity={0.8}
              >
                <Text style={styles.backToCourseButtonText}>
                  Back to Course Overview
                </Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons - Only show if NOT last item or if failed */}
          {(!isLastItem || !isPassed) && (
            <View style={styles.resultActions}>
              {quizResult.attemptsRemaining > 0 && !isPassed ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleRetry}
                >
                  <Image
                    source={Images.quizRetry}
                    style={styles.actionButtonIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.actionButtonText}>Retry</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleReview}
                >
                  <Image
                    source={Images.quizReview}
                    style={styles.actionButtonIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.actionButtonText}>Review</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleComplete}
              >
                <Image
                  source={Images.quizComplete}
                  style={styles.actionButtonIcon}
                  resizeMode="contain"
                />
                <Text style={styles.actionButtonText}>Complete</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // const currentQuestion = quizDetail.questions[currentQuestionIndex];
  /* ----------  safe current-question helpers  ---------- */
  const currentQuestion = quizDetail.questions[currentQuestionIndex];
  if (!currentQuestion) {
    // ➜ prevents the crash
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.purple400} />
        <Text style={styles.loadingText}>Building question…</Text>
      </SafeAreaView>
    );
  }
  const answeredCount = selectedAnswers.size;
  const isCurrentQuestionAnswered = selectedAnswers.has(currentQuestion.id);

  // Get the correct answer for current question (if in review mode)
  const correctAnswerForCurrentQuestion =
    reviewMode && quizResult
      ? quizResult.answers.find((a) => a.questionId === currentQuestion.id)
      : null;

  // Generate progress segments
  const progressSegments = quizDetail.questions.map((question, index) => {
    const isAnswered = Array.from(selectedAnswers.keys()).includes(
      quizDetail.questions[index].id
    );
    const isCurrent = index === currentQuestionIndex;

    // In review mode, check if answer was correct
    let isCorrect = false;
    if (reviewMode && quizResult) {
      const answer = quizResult.answers.find(
        (a) => a.questionId === question.id
      );
      isCorrect = answer?.isCorrect || false;
    }

    return {
      isAnswered,
      isCurrent,
      isCorrect,
    };
  });

  return (
    <Screen
      title="Quiz"
      navigation={navigation}
      headerLeftIcon="close"
      customEdges={["top", "bottom"]}
      onHeaderLeftPress={() => {
        Alert.alert(
          "Exit Quiz",
          "Are you sure you want to exit? Your progress will be lost.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Exit",
              style: "destructive",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }}
      headerRightComponent={
        <>
          {timeRemaining !== null && timerActive && !reviewMode && (
            <View style={styles.modernTimer}>
              <Ionicons name="time-outline" size={18} color={Colors.yellow} />
              <Text style={styles.modernTimerText}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
          )}
          {!timerActive && !reviewMode && <View style={{ width: 80 }} />}
        </>
      }
    >
      {/* Segmented Progress Bar */}
      <View style={styles.segmentedProgressContainer}>
        <Text style={styles.progressLabel}>
          {reviewMode ? "Review Mode - " : ""}Question{" "}
          {currentQuestionIndex + 1} of {quizDetail.questions.length}
        </Text>
        <View style={styles.segmentsWrapper}>
          {progressSegments.map((segment, index) => (
            <View
              key={index}
              style={[
                styles.progressSegment,
                {
                  backgroundColor: reviewMode
                    ? segment.isCorrect
                      ? Colors.green // Correct answer: green
                      : Colors.red // Incorrect answer: red
                    : segment.isAnswered
                    ? Colors.purple400 // Answered: bright purple
                    : segment.isCurrent
                    ? Colors.secondary // Current: medium purple
                    : Colors.gray600, // Not answered: gray
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Question Card */}
      <View style={styles.modernQuestionCard}>
        {/* Question Image - Only show if image_url exists */}
        {currentQuestion.image_url && (
          <View style={styles.questionImageContainer}>
            <View style={styles.questionImagePlaceholder}>
              <Ionicons
                name="image"
                size={64}
                color={Colors.purple400 + "40"}
              />
              {/* TODO: Replace with actual image when available */}
              {/* <Image source={{ uri: currentQuestion.image_url }} style={styles.questionImage} /> */}
            </View>
          </View>
        )}

        <Text style={styles.modernQuestionText}>
          {currentQuestion.question_text}
        </Text>
      </View>

      {/* Options */}
      <View style={styles.modernOptionsContainer}>
        {currentQuestion.options?.filter(Boolean).map((option, index) => {
          const isSelected =
            selectedAnswers.get(currentQuestion.id) === option.option_text;

          /* ----------  review-mode colours / icons  ---------- */
          let borderColor = "#3a3a4e";
          let backgroundColor = "#2a2a3e";
          let showCheckmark = false;
          let showCross = false;

          if (reviewMode && correctAnswerForCurrentQuestion) {
            const isCorrectAnswer =
              option.option_text ===
              correctAnswerForCurrentQuestion.correctAnswer;
            const userAnswer = selectedAnswers.get(currentQuestion.id);
            const wasUserAnswer = option.option_text === userAnswer;

            if (isCorrectAnswer) {
              borderColor = Colors.green;
              backgroundColor = "#1a3a2a";
              showCheckmark = true;
            } else if (wasUserAnswer && !isCorrectAnswer) {
              borderColor = Colors.red;
              backgroundColor = "#3a1a1a";
              showCross = true;
            }
          } else if (isSelected) {
            borderColor = Colors.purple400;
            backgroundColor = "#3a2a5e";
          }

          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.modernOptionCard,
                { borderColor, backgroundColor },
              ]}
              onPress={() =>
                !reviewMode &&
                handleAnswerSelect(currentQuestion.id, option.option_text)
              }
              activeOpacity={reviewMode ? 1 : 0.7}
              disabled={reviewMode}
            >
              <View style={[styles.modernOptionRadio, { borderColor }]}>
                {isSelected && !reviewMode && (
                  <View style={styles.modernOptionRadioInner} />
                )}
                {reviewMode && showCheckmark && (
                  <Ionicons name="checkmark" size={20} color={Colors.green} />
                )}
                {reviewMode && showCross && (
                  <Ionicons name="close" size={20} color={Colors.red} />
                )}
              </View>
              <Text
                style={[
                  styles.modernOptionText,
                  isSelected && !reviewMode && styles.modernOptionTextSelected,
                ]}
              >
                {option.option_text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom Navigation */}
      <View style={{ paddingVertical: Spacing.lg }}>
        {reviewMode ? (
          <View style={{ flexDirection: "column" }}>
            {currentQuestionIndex < quizDetail.questions.length - 1 ? (
              <ActionButton onPress={handleNextQuestion} text={"Next"} />
            ) : (
              <ActionButton onPress={handleDoneReview} text={"Done"} />
            )}
            {currentQuestionIndex > 0 && (
              <ActionButton
                onPress={handlePreviousQuestion}
                text={"Previous"}
              />
            )}
          </View>
        ) : currentQuestionIndex === quizDetail.questions.length - 1 ? (
          <ActionButton
            onPress={handleSubmitQuiz}
            loading={submitting}
            disabled={submitting}
            text={"Submit"}
          />
        ) : (
          <ActionButton
            onPress={handleNextQuestion}
            text={"Next"}
            disabled={!reviewMode && !isCurrentQuestionAnswered}
            style={
              !reviewMode && !isCurrentQuestionAnswered && { opacity: 0.2 }
            }
          />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
  },
  errorText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
    textAlign: "center",
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
  },

  // Modern Header Styles
  modernTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modernTimerText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.yellow,
  },

  // Segmented Progress Bar
  segmentedProgressContainer: {
    paddingVertical: Spacing.lg,
  },
  progressLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 10,
    textAlign: "left",
  },
  segmentsWrapper: {
    flexDirection: "row",
    gap: 6,
    height: 8,
  },
  progressSegment: {
    flex: 1,
    borderRadius: 4,
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  modernQuestionCard: {
    marginBottom: Spacing.lg,
  },
  questionImageContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  questionImagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  questionImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  modernQuestionText: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.white,
    lineHeight: 28,
    textAlign: "left",
  },

  // Modern Options
  modernOptionsContainer: {
    gap: Spacing.md,
  },
  modernOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#3a3a4e",
  },
  modernOptionCardSelected: {
    borderColor: Colors.purple400,
    backgroundColor: "#3a2a5e",
  },
  modernOptionRadio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#3a3a4e",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  modernOptionRadioSelected: {
    borderColor: Colors.purple400,
  },
  modernOptionRadioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.purple400,
  },
  modernOptionText: {
    flex: 1,
    fontSize: 16,
    color: Colors.white,
    lineHeight: 22,
  },
  modernOptionTextSelected: {
    fontWeight: "600",
    color: Colors.white,
  },

  // Results Screen Styles
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  resultsHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.white,
    flex: 1,
    textAlign: "center",
  },
  resultsScrollContent: {
    padding: Spacing.xl,
  },

  // Result Section
  resultSection: {
    backgroundColor: Colors.surface,
    opacity: 0.9,
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
    position: "relative",
    overflow: "hidden",
  },
  resultContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  resultImage: {
    minWidth: 200,
    minHeight: 200,
    maxHeight: 265,
    maxWidth: 265,
  },

  // Score Section
  scoreSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  scoreTitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: "700",
    color: Colors.white,
    marginVertical: Spacing.sm,
  },
  pointsContainer: {
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginVertical: Spacing.md,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  passingMarkText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.yellow,
    marginVertical: Spacing.sm,
  },
  scoreSubtext: {
    fontSize: 20,
    color: Colors.white,
    marginTop: Spacing.md,
  },

  // Course Completion Card
  courseCompletionCard: {
    backgroundColor: Colors.textInputBg,
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.starGold + "40",
  },
  courseCompletionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  courseCompletionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  courseCompletionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  backToCourseButton: {
    backgroundColor: Colors.purple600,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 10,
    gap: Spacing.sm,
  },
  backToCourseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },

  // Result Actions
  resultActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 16,
  },
  actionButtonIcon: {
    width: 48,
    height: 48,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#2a2a3e",
    borderRadius: 20,
    padding: Spacing.xl,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});

export default QuizScreen;
