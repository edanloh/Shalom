import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, TextStyles } from "@/constants";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { MainStackParamList } from "@/types/navigation";
import { quizService } from "@/services";
import creditService from "../services/creditService";
import { showToast } from "@/components/common/Toast";
import { Images } from "../../assets";
import type {
  QuizQuestion,
  QuizDetailResponse,
  SubmitQuizResponse,
} from "@/services";
import Screen from "@/components/common/Screen";
import ActionButton from "@/components/ActionButton";
import MatchingQuestion from "@/components/MatchingQuestion";
import { useCourseNavigation } from "@/hooks";
import { useCourses } from "@/contexts/CourseContext";

type QuizDetail = QuizDetailResponse["data"];
type QuizResult = SubmitQuizResponse["data"] & {
  graded_answers?: Record<
    string,
    {
      pointsAwarded: number;
      maxPoints: number;
      feedback?: string | null;
      gradedAt: string;
    }
  >;
};

type QuizScreenNavigationProp = StackNavigationProp<
  MainStackParamList,
  "QuizScreen"
>;

const QuizScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<QuizScreenNavigationProp>();
  const { quizId, courseId, sectionId, userId, sourceScreen } =
    route.params as any;
  const { refreshMyCourses } = useCourses();

  const [loading, setLoading] = useState(true);
  const [quizDetail, setQuizDetail] = useState<QuizDetail | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Map<string, string | string[]>
  >(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [attemptsRemainingDisplay, setAttemptsRemainingDisplay] = useState<
    number | null
  >(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [initialTime, setInitialTime] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [attemptsBlocked, setAttemptsBlocked] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false); // For practicing after attempts exhausted
  const [gradingPending, setGradingPending] = useState(false); // For short-answer quizzes awaiting grading

  // Matching question states
  const [matchingState, setMatchingState] = useState<
    Map<string, Map<string, string>>
  >(new Map()); // questionId -> (leftItem -> rightItem)
  const [selectedMatchingLeft, setSelectedMatchingLeft] = useState<
    string | null
  >(null);
  const [scrambledMatchingOptions, setScrambledMatchingOptions] = useState<
    Map<string, any[]>
  >(new Map());

  // Use course navigation hook
  const { nextItem: nextItemInModule, isLastItem } = useCourseNavigation(
    courseId,
    userId,
    quizId,
    "quiz",
    sectionId,
  );

  useEffect(() => {
    fetchQuizDetail();
  }, [quizId]);

  const navigateBackToModuleDetail = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const resolvedSectionId = (quizDetail as any)?.section?.id || sectionId;
    const hasShortAnswerQuestions =
      quizDetail?.questions?.some(
        (q: any) => q.question_type === "short-answer",
      ) || false;
    const shouldMarkCompleted =
      hasShortAnswerQuestions && (gradingPending || !!quizResult);
    if (resolvedSectionId) {
      navigation.navigate("ModuleDetail", {
        courseId,
        sectionId: resolvedSectionId,
        userId,
        sourceScreen,
        ...(shouldMarkCompleted
          ? {
              quizCompleted: true,
              completedQuizId: quizId,
              timestamp: Date.now(),
            }
          : {}),
      } as any);
      return;
    }
    navigation.navigate("CourseDetail", { courseId, sourceScreen } as any);
  };

  // useEffect(() => {
  //   // Timer countdown - only runs when timer is active and not in review/results mode
  //   if (
  //     timerActive &&
  //     timeRemaining !== null &&
  //     timeRemaining > 0 &&
  //     !showResults &&
  //     !reviewMode
  //   ) {
  //     const timer = setInterval(() => {
  //       setTimeRemaining((prev) => {
  //         if (prev === null || prev <= 1) {
  //           setTimerActive(false);
  //           handleSubmitQuiz(); // Auto-submit when time runs out
  //           return 0;
  //         }
  //         return prev - 1;
  //       });
  //     }, 1000);

  //     return () => clearInterval(timer);
  //   }
  // }, [timerActive, timeRemaining, showResults, reviewMode]);

  const fetchQuizDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await quizService.getQuizDetail(courseId, quizId, userId);
      // Scramble options for all questions
      const scrambledData = {
        ...data,
        questions: data.questions.map((question) => {
          // Scramble MCQ options (except true-false)
          if (
            question.question_type === "multiple-choice" ||
            question.question_type === "multiple-correct"
          ) {
            const shuffledOptions = [...question.options].sort(
              () => Math.random() - 0.5,
            );
            return { ...question, options: shuffledOptions };
          }
          return question;
        }),
      };

      setQuizDetail(scrambledData);

      // Initialize scrambled matching options
      const scrambledMatching = new Map();
      scrambledData.questions.forEach((question) => {
        if (question.question_type === "matching" && question.matching_pairs) {
          // Scramble the right side options
          const rightOptions = question.matching_pairs.map(
            (pair) => pair.right,
          );
          const shuffled = [...rightOptions].sort(() => Math.random() - 0.5);
          scrambledMatching.set(question.id, shuffled);
        }
      });
      setScrambledMatchingOptions(scrambledMatching);

      const attempts = data.userAttempts || [];
      const attemptsRemaining = quizService.getAttemptsRemaining(
        attempts,
        data.max_attempts,
      );
      setAttemptsRemainingDisplay(attemptsRemaining);
      const isPassed = quizService.isQuizPassed(attempts);
      setAttemptsBlocked(attemptsRemaining === 0 && !isPassed);

      const buildResultFromAttempt = (
        attempt: any,
        passedOverride?: boolean,
      ) => {
        const totalQuestions =
          Number(attempt.total_questions) || data.questions.length || 0;
        const correctAnswers =
          Number(attempt.correct_answers) ||
          Math.round((attempt.score / 100) * totalQuestions);
        const answersMap = attempt.answers || {};

        // Parse graded_answers if it's a JSON string
        let gradedAnswersData = attempt.graded_answers;
        if (typeof gradedAnswersData === "string") {
          try {
            gradedAnswersData = JSON.parse(gradedAnswersData);
          } catch (e) {
            console.error("Failed to parse graded_answers:", e);
            gradedAnswersData = undefined;
          }
        }

        const gradedAnswers = data.questions
          .map((question) => {
            const selected = answersMap[question.id];
            if (!selected) return null;
            const correctAnswer = question.correct_answer || "";

            // Properly compare answers based on question type
            let isCorrect = false;
            if (question.question_type === "multiple-correct") {
              // For multiple-correct, compare arrays
              const selectedArray = Array.isArray(selected)
                ? selected
                : typeof selected === "string" && selected.startsWith("[")
                  ? JSON.parse(selected)
                  : [selected];
              const correctArray = Array.isArray(correctAnswer)
                ? correctAnswer
                : typeof correctAnswer === "string" &&
                    correctAnswer.startsWith("[")
                  ? JSON.parse(correctAnswer)
                  : [correctAnswer];
              isCorrect =
                JSON.stringify(selectedArray.sort()) ===
                JSON.stringify(correctArray.sort());
            } else if (question.question_type === "matching") {
              // For matching, compare JSON objects
              isCorrect =
                JSON.stringify(selected) === JSON.stringify(correctAnswer);
            } else {
              // For single answer questions
              isCorrect =
                String(selected).trim() === String(correctAnswer).trim();
            }

            return {
              questionId: question.id,
              isCorrect,
              correctAnswer,
            };
          })
          .filter(Boolean) as Array<{
          questionId: string;
          isCorrect: boolean;
          correctAnswer: string;
        }>;

        setSelectedAnswers(new Map(Object.entries(answersMap)));
        setQuizResult({
          score: attempt.score,
          totalQuestions,
          correctAnswers,
          isPassed: passedOverride ?? attempt.is_passed,
          attemptNumber: attempt.attempt_number,
          attemptsRemaining,
          answers: gradedAnswers,
          graded_answers: gradedAnswersData,
        });
      };

      // If user has any attempts (passed or failed), show results screen
      if (attempts.length > 0) {
        const latestAttempt = isPassed
          ? attempts.find((attempt) => attempt.is_passed)
          : quizService.getLatestAttempt(attempts);

        if (latestAttempt) {
          // Check if quiz has short-answer questions and grades are not released
          const hasShortAnswer = data.questions.some(
            (q) => q.question_type === "short-answer",
          );
          const gradesReleased = latestAttempt.grades_released !== false;

          if (hasShortAnswer && !gradesReleased) {
            // Show pending grading screen
            setSelectedAnswers(
              new Map(Object.entries(latestAttempt.answers || {})),
            );
            setGradingPending(true);
            setShowResults(false);
            setTimerActive(false);
            return;
          }

          buildResultFromAttempt(latestAttempt, isPassed);
          setAttemptsRemainingDisplay(attemptsRemaining);
          setShowResults(true);
          setReviewMode(false);
          setTimerActive(false);
          return;
        }
      }

      // No attempts yet - start fresh quiz
      // Record start time for all quizzes
      setQuizStartTime(new Date());

      // Set timer if quiz has time limit
      // if (data.time_limit_minutes) {
      //   const timeInSeconds = data.time_limit_minutes * 60;
      //   setTimeRemaining(timeInSeconds);
      //   setInitialTime(timeInSeconds);
      //   setTimerActive(true);
      // }
    } catch (err: any) {
      console.error("Error fetching quiz detail:", err);
      setError(err.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (
    questionId: string,
    optionText: string,
    isMultipleCorrect: boolean = false,
  ) => {
    setSelectedAnswers((prev) => {
      const newMap = new Map(prev);

      if (isMultipleCorrect) {
        // For multiple-correct, toggle the option in an array
        const currentAnswers = newMap.get(questionId);
        let answersArray: string[] = [];

        if (Array.isArray(currentAnswers)) {
          answersArray = [...currentAnswers];
        } else if (currentAnswers) {
          answersArray = [currentAnswers];
        }

        const optionIndex = answersArray.indexOf(optionText);
        if (optionIndex > -1) {
          // Remove if already selected
          answersArray.splice(optionIndex, 1);
        } else {
          // Add if not selected
          answersArray.push(optionText);
        }

        newMap.set(questionId, answersArray);
      } else {
        // For single-answer questions, just set the value
        newMap.set(questionId, optionText);
      }

      return newMap;
    });
  };

  // const handleMatchingSelect = (
  //   questionId: string,
  //   optionText: string,
  //   side: "left" | "right",
  // ) => {
  //   if (side === "left") {
  //     setSelectedMatchingLeft(optionText);
  //   } else if (side === "right" && selectedMatchingLeft) {
  //     // Create the match
  //     setMatchingState((prev) => {
  //       const newState = new Map(prev);
  //       let questionMatches = newState.get(questionId);
  //       if (!questionMatches) {
  //         questionMatches = new Map();
  //       } else {
  //         questionMatches = new Map(questionMatches);
  //       }
  //       questionMatches.set(selectedMatchingLeft, optionText);
  //       newState.set(questionId, questionMatches);
  //       return newState;
  //     });

  //     // Store in selectedAnswers as JSON string
  //     setSelectedAnswers((prev) => {
  //       const newMap = new Map(prev);
  //       const questionMatches = matchingState.get(questionId) || new Map();
  //       const updatedMatches = new Map(questionMatches);
  //       updatedMatches.set(selectedMatchingLeft, optionText);

  //       const matchArray = Array.from(updatedMatches.entries()).map(
  //         ([left, right]) => ({
  //           left,
  //           right,
  //         }),
  //       );
  //       newMap.set(questionId, JSON.stringify(matchArray));
  //       return newMap;
  //     });

  //     setSelectedMatchingLeft(null);
  //   }
  // };

  const handleClearMatch = (questionId: string, leftItem: string) => {
    setMatchingState((prev) => {
      const newState = new Map(prev);
      const questionMatches = newState.get(questionId);
      if (questionMatches) {
        const updated = new Map(questionMatches);
        updated.delete(leftItem);
        newState.set(questionId, updated);
      }
      return newState;
    });

    // Update selectedAnswers
    setSelectedAnswers((prev) => {
      const newMap = new Map(prev);
      const questionMatches = matchingState.get(questionId);
      if (questionMatches) {
        const updated = new Map(questionMatches);
        updated.delete(leftItem);
        const matchArray = Array.from(updated.entries()).map(
          ([left, right]) => ({
            left,
            right,
          }),
        );
        newMap.set(questionId, JSON.stringify(matchArray));
      }
      return newMap;
    });
  };

  const handleMatch = useCallback(
    (questionId: string, leftItem: string, rightItem: string) => {
      setMatchingState((prev) => {
        const next = new Map(prev);
        const qMap = new Map(next.get(questionId) ?? []);
        qMap.set(leftItem, rightItem);
        next.set(questionId, qMap);
        return next;
      });
      setSelectedAnswers((prev) => {
        const next = new Map(prev);
        const qMap = matchingState.get(questionId) ?? new Map();
        const updated = new Map(qMap);
        updated.set(leftItem, rightItem);
        const arr = Array.from(updated.entries()).map(([l, r]) => ({
          left: l,
          right: r,
        }));
        next.set(questionId, JSON.stringify(arr));
        return next;
      });
    },
    [matchingState],
  );

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

    // Check if we're in practice mode (attempts exhausted but user retrying)
    if (practiceMode) {
      // Practice mode: Calculate results locally without backend submission
      if (
        !quizService.validateAnswers(
          selectedAnswers,
          quizDetail.questions.length,
        )
      ) {
        Alert.alert(
          "Incomplete Quiz",
          "Please answer all questions before submitting.",
          [{ text: "OK" }],
        );
        return;
      }

      setTimerActive(false);
      setSubmitting(true);

      // Calculate results locally using per-question selected values
      let correctCount = 0;
      const gradedAnswers = quizDetail.questions.map((question) => {
        const userAnswer = selectedAnswers.get(question.id);
        const correctAnswer = question.correct_answer || "";

        // Compare answers based on question type
        let isCorrect = false;
        if (question.question_type === "multiple-correct") {
          // For multiple-correct, compare normalized arrays of selected option text
          const userAnswerArray = Array.isArray(userAnswer)
            ? userAnswer
            : typeof userAnswer === "string"
              ? (() => {
                  try {
                    const parsed = JSON.parse(userAnswer);
                    return Array.isArray(parsed) ? parsed : [userAnswer];
                  } catch {
                    return [userAnswer];
                  }
                })()
              : [];

          const correctAnswerArray = Array.isArray(correctAnswer)
            ? correctAnswer
            : typeof correctAnswer === "string"
              ? (() => {
                  try {
                    const parsed = JSON.parse(correctAnswer);
                    return Array.isArray(parsed) ? parsed : [correctAnswer];
                  } catch {
                    return [correctAnswer];
                  }
                })()
              : [];

          const normalizedUser = userAnswerArray
            .map((v) => String(v).trim())
            .filter(Boolean)
            .sort();
          const normalizedCorrect = correctAnswerArray
            .map((v) => String(v).trim())
            .filter(Boolean)
            .sort();

          isCorrect =
            normalizedUser.length === normalizedCorrect.length &&
            JSON.stringify(normalizedUser) ===
              JSON.stringify(normalizedCorrect);
        } else if (question.question_type === "matching") {
          // For matching, compare normalized left->right mappings
          const toPairArray = (
            value: any,
          ): Array<{ left: string; right: string }> => {
            if (Array.isArray(value))
              return value as Array<{ left: string; right: string }>;
            if (typeof value === "string") {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed)
                  ? (parsed as Array<{ left: string; right: string }>)
                  : [];
              } catch {
                return [];
              }
            }
            return [];
          };

          const normalizePairs = (
            pairs: Array<{ left: string; right: string }>,
          ) =>
            pairs
              .map((p) => `${String(p.left).trim()}=>${String(p.right).trim()}`)
              .sort();

          const normalizedUser = normalizePairs(toPairArray(userAnswer));
          const normalizedCorrect = normalizePairs(toPairArray(correctAnswer));
          isCorrect =
            JSON.stringify(normalizedUser) ===
            JSON.stringify(normalizedCorrect);
        } else {
          // For single answer questions, support both answer text and index-style correct_answer
          const selectedValue = Array.isArray(userAnswer)
            ? String(userAnswer[0] ?? "").trim()
            : String(userAnswer ?? "").trim();

          let normalizedCorrect = String(correctAnswer ?? "").trim();
          const parsedIndex = Number(normalizedCorrect);
          if (
            Number.isInteger(parsedIndex) &&
            parsedIndex >= 0 &&
            parsedIndex < (question.options?.length || 0)
          ) {
            normalizedCorrect = String(
              question.options?.[parsedIndex]?.option_text ?? normalizedCorrect,
            ).trim();
          }

          isCorrect = selectedValue === normalizedCorrect;
        }

        if (isCorrect) correctCount++;

        return {
          questionId: question.id,
          isCorrect,
          correctAnswer,
        };
      });

      const totalQuestions = quizDetail.questions.length;
      const score = Math.round((correctCount / totalQuestions) * 100);
      const isPassed = score >= (quizDetail.passing_score || 70);

      setQuizResult({
        score,
        totalQuestions,
        correctAnswers: correctCount,
        isPassed,
        attemptNumber: (quizDetail.userAttempts?.length || 0) + 1,
        attemptsRemaining: 0,
        answers: gradedAnswers,
      });
      setShowResults(true);
      setSubmitting(false);

      // Show practice mode message
      setTimeout(() => {
        Alert.alert(
          "Practice Mode",
          "This is a practice attempt and was not recorded. Your previous attempts are still saved.",
          [{ text: "OK" }],
        );
      }, 500);

      return;
    }

    // Regular mode: check if attempts are blocked
    if (attemptsBlocked) {
      Alert.alert(
        "Attempts limit reached",
        "You’ve used all attempts. Review your last submission.",
      );
      setReviewMode(true);
      setShowResults(false);
      setTimerActive(false);
      return;
    }

    // Check if all questions are answered
    if (
      !quizService.validateAnswers(selectedAnswers, quizDetail.questions.length)
    ) {
      Alert.alert(
        "Incomplete Quiz",
        "Please answer all questions before submitting.",
        [{ text: "OK" }],
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
      // Update attempts remaining display after submission
      if (
        result.attemptsRemaining !== undefined &&
        result.attemptsRemaining !== null
      ) {
        setAttemptsRemainingDisplay(result.attemptsRemaining);
        // Update attemptsBlocked based on new attempts remaining
        setAttemptsBlocked(result.attemptsRemaining === 0 && !result.isPassed);
      }

      // Check if quiz has short-answer questions
      const hasShortAnswer = quizDetail.questions.some(
        (q) => q.question_type === "short-answer",
      );

      if (hasShortAnswer) {
        // Keep students on pending screen until grading is released.
        // Completion for short-answer quizzes is handled when they leave this screen.
        setGradingPending(true);
        setShowResults(false);
        return;
      } else {
        setShowResults(true);
      }

      // Award credits for passing quizzes
      if (result.isPassed && userId) {
        creditService
          .recordCreditEvent({
            userId,
            type: "quiz_passed",
            title: quizDetail?.title || "Quiz completed",
            points: Math.max(10, result.score), // simple heuristic
            courseId,
          })
          .then(() => {
            showToast({
              title: "Credits earned",
              message: `+${Math.max(10, result.score)} for passing ${quizDetail?.title || "quiz"}`,
              type: "success",
            });
          })
          .catch((err) => {
            console.warn("Failed to record credit for quiz", err);
            showToast({
              title: "Unable to record credits",
              message: "Something unexpected happened. Please try again later.",
              type: "error",
            });
          });
      }
    } catch (err: any) {
      console.error("Error submitting quiz:", err);
      if (String(err?.message || "").includes("Maximum attempts reached")) {
        Alert.alert(
          "Attempts limit reached",
          "You’ve used all attempts. Review your last submission.",
        );
        const attempts = quizDetail.userAttempts || [];
        const latestAttempt = quizService.getLatestAttempt(attempts);
        if (latestAttempt) {
          const totalQuestions =
            Number(latestAttempt.total_questions) ||
            quizDetail.questions.length ||
            0;
          const correctAnswers =
            Number(latestAttempt.correct_answers) ||
            Math.round((latestAttempt.score / 100) * totalQuestions);
          const answersMap = latestAttempt.answers || {};
          const gradedAnswers = quizDetail.questions
            .map((question) => {
              const selected = answersMap[question.id];
              if (!selected) return null;
              const correctAnswer = question.correct_answer || "";

              // Properly compare answers based on question type
              let isCorrect = false;
              if (question.question_type === "multiple-correct") {
                // For multiple-correct, compare arrays
                const selectedArray = Array.isArray(selected)
                  ? selected
                  : typeof selected === "string" && selected.startsWith("[")
                    ? JSON.parse(selected)
                    : [selected];
                const correctArray = Array.isArray(correctAnswer)
                  ? correctAnswer
                  : typeof correctAnswer === "string" &&
                      correctAnswer.startsWith("[")
                    ? JSON.parse(correctAnswer)
                    : [correctAnswer];
                isCorrect =
                  JSON.stringify(selectedArray.sort()) ===
                  JSON.stringify(correctArray.sort());
              } else if (question.question_type === "matching") {
                // For matching, compare JSON objects
                isCorrect =
                  JSON.stringify(selected) === JSON.stringify(correctAnswer);
              } else {
                // For single answer questions
                isCorrect =
                  String(selected).trim() === String(correctAnswer).trim();
              }

              return {
                questionId: question.id,
                isCorrect,
                correctAnswer,
              };
            })
            .filter(Boolean) as Array<{
            questionId: string;
            isCorrect: boolean;
            correctAnswer: string;
          }>;
          setSelectedAnswers(new Map(Object.entries(answersMap)));
          setQuizResult({
            score: latestAttempt.score,
            totalQuestions,
            correctAnswers,
            isPassed: false,
            attemptNumber: latestAttempt.attempt_number,
            attemptsRemaining: 0,
            answers: gradedAnswers,
          });
          setReviewMode(true);
          setShowResults(false);
          setTimerActive(false);
          return;
        }
      } else {
        Alert.alert("Error", err.message || "Failed to submit quiz");
      }
      // Restart timer if submission failed
      setTimerActive(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (!quizDetail) return;

    // Check if quiz has short-answer questions - if so, don't allow retry
    const hasShortAnswer = quizDetail.questions.some(
      (q: any) => q.question_type === "short-answer",
    );

    if (hasShortAnswer) {
      // For short-answer quizzes, only allow review (not retry)
      Alert.alert(
        "Retry Not Available",
        "This quiz contains short-answer questions requiring manual grading. You can review your answers but cannot retake the quiz.",
        [{ text: "OK" }],
      );
      return;
    }

    // Enable practice mode if:
    // 1. User passed the quiz (no need to record another attempt)
    // 2. User failed and has no attempts remaining (practice mode)
    // Disable practice mode if user failed and still has attempts (normal retry)
    const shouldEnablePracticeMode =
      attemptsBlocked || quizResult?.isPassed === true;
    setPracticeMode(shouldEnablePracticeMode);

    // Reset quiz state completely
    setSelectedAnswers(new Map());
    setMatchingState(new Map());
    setSelectedMatchingLeft(null);
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setQuizResult(null);
    setReviewMode(false);

    // Reset start time for all quizzes
    setQuizStartTime(new Date());

    // Reset and restart timer if quiz has time limit
    // if (quizDetail.time_limit_minutes) {
    //   const timeInSeconds = quizDetail.time_limit_minutes * 60;
    //   setTimeRemaining(timeInSeconds);
    //   setInitialTime(timeInSeconds);
    //   setTimerActive(true);
    // }

    // Don't call fetchQuizDetail() - it would show results screen again
    // Just use the existing quizDetail data to start fresh
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

  const navigateAfterCompletion = () => {
    void refreshMyCourses().catch((err) => {
      console.warn("Failed to refresh My Courses after quiz completion", err);
    });

    // Extra safety check - make sure nextItemInModule AND nextItemInModule.item exist
    if (nextItemInModule && nextItemInModule.item) {
      // Navigate to next item (video, quiz, or document)
      if (nextItemInModule.item.type === "video") {
        navigation.replace("VideoPlayer", {
          videoId: nextItemInModule.item.id,
          courseId,
          sectionId: nextItemInModule.sectionId,
          userId,
        });
      } else if (nextItemInModule.item.type === "quiz") {
        navigation.replace("QuizScreen", {
          quizId: nextItemInModule.item.id,
          courseId,
          sectionId: nextItemInModule.sectionId,
          userId,
        });
      } else if (
        ["pdf", "document", "ppt"].includes(nextItemInModule.item.type)
      ) {
        navigation.replace("DocumentView", {
          documentId: nextItemInModule.item.id,
          courseId,
          sectionId: nextItemInModule.sectionId,
          userId,
          documentType: nextItemInModule.item.type,
        });
      }
      return;
    }

    if (isLastItem) {
      navigation.reset({
        index: 1,
        routes: [
          { name: "MainTabs", params: { screen: "Home" } as any },
          {
            name: "CourseDetail",
            params: {
              courseId,
              sourceScreen,
              quizCompleted: true,
              quizId,
            } as any,
          },
        ],
      });
      return;
    }

    // Default: Navigate back with state to refresh CourseDetail
    navigation.navigate("CourseDetail", {
      courseId,
      sourceScreen,
      quizCompleted: true,
      quizId,
    } as any);
  };

  const handleComplete = () => {
    console.log("🎯 handleComplete called:", {
      isPassed: quizResult?.isPassed,
      attemptsBlocked,
      practiceMode,
      attemptsRemainingDisplay,
      nextItemInModule: nextItemInModule,
      hasItem: nextItemInModule ? !!nextItemInModule.item : false,
      isLastItem,
    });

    // Check if quiz has short-answer questions requiring manual grading
    const hasShortAnswer =
      quizDetail?.questions.some(
        (q: any) => q.question_type === "short-answer",
      ) || false;

    // Mark as complete and auto-navigate if:
    // 1. Quiz has short-answer questions (manual grading - no strict checks needed), OR
    // 2. Quiz is passed (including practice-mode attempts), OR
    // 3. All attempts are exhausted (even if failed)
    // Additional safeguard: Don't complete if failed and still has attempts (unless manual grading)
    const hasFailed = quizResult && !quizResult.isPassed;
    const hasAttemptsRemaining =
      attemptsRemainingDisplay !== null && attemptsRemainingDisplay > 0;

    const canComplete =
      practiceMode ||
      hasShortAnswer ||
      (((quizResult && quizResult.isPassed) || attemptsBlocked) &&
        !(hasFailed && hasAttemptsRemaining));

    if (canComplete) {
      navigateAfterCompletion();
      return;
    } else {
      // Quiz not passed and still has attempts - cannot complete yet
      Alert.alert(
        "Cannot Complete Yet",
        "You need to pass this quiz or use all attempts before proceeding.",
        [{ text: "OK" }],
      );
      return;
    }
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

  // Pending Grading Screen - for short-answer quizzes
  if (gradingPending) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultsHeader}>
          <TouchableOpacity onPress={navigateBackToModuleDetail}>
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.resultsHeaderTitle}>Quiz Submitted</Text>
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
                source={Images.quizSuccess}
                style={styles.resultImage}
                resizeMode="contain"
              />
            </View>

            {/* Score Display */}
            <View style={styles.scoreSection}>
              <Text style={styles.scoreTitle}>Quiz Submitted</Text>
              <Text style={styles.scoreSubtext}>
                Your answers are being reviewed by your instructor.
              </Text>

              <View style={styles.attemptsContainer}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={Colors.purple400}
                />
                <Text style={styles.attemptsText}>Awaiting manual grading</Text>
              </View>

              <Text
                style={[
                  styles.scoreSubtext,
                  { marginTop: 12, fontSize: 14, lineHeight: 20 },
                ]}
              >
                You'll be notified once your instructor has finished grading all
                questions. Your final score will be available then.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={navigateBackToModuleDetail}
            >
              <Ionicons name="arrow-back" size={32} color={Colors.white} />
              <Text style={styles.actionButtonText}>Back</Text>
            </TouchableOpacity>
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
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (showResults && quizResult) {
    const isPassed = quizResult.isPassed;
    const scorePercentage = quizResult.score;

    // Check if this is the first time passing the quiz
    const isFirstPass = isPassed && quizResult.attemptNumber === 1;

    // Calculate actual points from graded_answers if available
    let totalPointsEarned = quizResult.correctAnswers || 0;
    let totalPointsPossible = quizResult.totalQuestions || 0;

    if (
      quizResult.graded_answers &&
      Object.keys(quizResult.graded_answers).length > 0 &&
      quizDetail
    ) {
      // When we have graded_answers, calculate points for each question type
      totalPointsEarned = 0;
      totalPointsPossible = 0;

      quizDetail.questions.forEach((question) => {
        if (
          quizResult.graded_answers &&
          question.id in quizResult.graded_answers
        ) {
          // Short answer question with manual grading
          const graded = quizResult.graded_answers[question.id];
          totalPointsEarned += graded.pointsAwarded;
          totalPointsPossible += graded.maxPoints;
        } else {
          // Auto-graded question (MCQ, true/false, etc.) - 1 point each
          const answer = quizResult.answers.find(
            (a) => a.questionId === question.id,
          );
          const points = answer?.isCorrect ? 1 : 0;
          totalPointsEarned += points;
          totalPointsPossible += 1;
        }
      });
    }

    console.log("📊 Points calculation:", {
      totalPointsEarned,
      totalPointsPossible,
      scorePercentage,
      hasGradedAnswers: !!quizResult.graded_answers,
      gradedAnswersCount: quizResult.graded_answers
        ? Object.keys(quizResult.graded_answers).length
        : 0,
    });

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultsHeader}>
          <TouchableOpacity onPress={navigateBackToModuleDetail}>
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.resultsHeaderTitle}>
            Quiz{practiceMode ? " (Practice)" : ""}
          </Text>
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
                {scorePercentage.toFixed(2)}%
              </Text>
              <Text
                style={[styles.scoreSubtext, { fontSize: 16, marginTop: 4 }]}
              >
                ({totalPointsEarned.toFixed(2)}/{totalPointsPossible.toFixed(2)}{" "}
                points)
              </Text>

              {/* Show passing mark for failed attempts */}
              {!isPassed && (
                <Text style={styles.passingMarkText}>
                  Passing Score: {quizDetail?.passing_score || 70}%
                </Text>
              )}

              {/* Show attempts remaining */}
              {!practiceMode &&
                attemptsRemainingDisplay !== null &&
                !isPassed && (
                  <View style={styles.attemptsContainer}>
                    <Ionicons
                      name={
                        attemptsRemainingDisplay > 0
                          ? "refresh-circle"
                          : "alert-circle"
                      }
                      size={18}
                      color={
                        attemptsRemainingDisplay > 0
                          ? Colors.purple400
                          : Colors.red
                      }
                    />
                    <Text
                      style={[
                        styles.attemptsText,
                        attemptsRemainingDisplay === 0 &&
                          styles.attemptsTextError,
                      ]}
                    >
                      {attemptsRemainingDisplay > 0
                        ? `${attemptsRemainingDisplay} attempt${attemptsRemainingDisplay === 1 ? "" : "s"} remaining`
                        : "No attempts remaining"}
                    </Text>
                  </View>
                )}

              <Text style={styles.scoreSubtext}>
                {isPassed
                  ? "Good effort! Keep going!"
                  : "Almost there — Try again!"}
              </Text>
            </View>
          </View>

          {/* Course Completion Card - Show only on first pass of last item (not in practice mode) */}
          {isPassed && isLastItem && isFirstPass && !practiceMode && (
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

          {/* Action Buttons - Show different buttons based on pass/fail */}
          {!(isPassed && isLastItem && isFirstPass && !practiceMode) && (
            <>
              {/* Completion Info Text - Only show when user can complete */}
              {(isPassed || attemptsBlocked) && (
                <View style={styles.completionInfoContainer}>
                  {isPassed ? (
                    <Text style={styles.completionInfoText}>
                      ✅ Quiz passed! Click Complete to proceed to the next
                      item.
                    </Text>
                  ) : attemptsBlocked ? (
                    <Text style={styles.completionInfoText}>
                      ⚠️ You've used all attempts. Click Complete to proceed to
                      the next item.
                    </Text>
                  ) : null}
                </View>
              )}

              <View style={styles.resultActions}>
                {(() => {
                  // Check if quiz has short-answer questions
                  const hasShortAnswer = quizDetail.questions.some(
                    (q: any) => q.question_type === "short-answer",
                  );

                  if (!isPassed && !attemptsBlocked && !practiceMode) {
                    // Failed with attempts remaining: Show Retry (unless short-answer) + Back only
                    return (
                      <>
                        {!hasShortAnswer && (
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
                        )}
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={navigateBackToModuleDetail}
                        >
                          <Ionicons
                            name="arrow-back"
                            size={32}
                            color={Colors.white}
                          />
                          <Text style={styles.actionButtonText}>Back</Text>
                        </TouchableOpacity>
                      </>
                    );
                  } else {
                    // Passed OR Failed with no attempts: Show Retry (no attempt, unless short-answer) + Review + Complete
                    return (
                      <>
                        {!hasShortAnswer && (
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
                        )}
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
                      </>
                    );
                  }
                })()}
              </View>
            </>
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

  // Check if current question is answered (for arrays, must have at least one selection)
  const isCurrentQuestionAnswered = (() => {
    if (!selectedAnswers.has(currentQuestion.id)) return false;
    const answer = selectedAnswers.get(currentQuestion.id);
    if (Array.isArray(answer)) return answer.length > 0;
    return Boolean(answer);
  })();

  const allQuestionsAnswered = quizDetail
    ? quizDetail.questions.every((question) => {
        if (!selectedAnswers.has(question.id)) return false;
        const answer = selectedAnswers.get(question.id);
        if (Array.isArray(answer)) return answer.length > 0;
        return Boolean(answer);
      })
    : false;

  // Get the correct answer for current question (if in review mode)
  const correctAnswerForCurrentQuestion =
    reviewMode && quizResult
      ? quizResult.answers.find((a) => a.questionId === currentQuestion.id)
      : null;

  // Generate progress segments
  const progressSegments = quizDetail.questions.map((question, index) => {
    const answer = selectedAnswers.get(question.id);
    const isAnswered =
      answer !== undefined &&
      (Array.isArray(answer) ? answer.length > 0 : Boolean(answer));
    const isCurrent = index === currentQuestionIndex;

    // In review mode, check if answer was correct
    let isCorrect = false;
    if (reviewMode && quizResult) {
      const answer = quizResult.answers.find(
        (a) => a.questionId === question.id,
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
              onPress: navigateBackToModuleDetail,
            },
          ],
        );
      }}
      headerRightComponent={
        <>
          {/* {timeRemaining !== null && timerActive && !reviewMode && (
            <View style={styles.modernTimer}>
              <Ionicons name="time-outline" size={18} color={Colors.yellow} />
              <Text style={styles.modernTimerText}>
                {formatTime(timeRemaining)}
              </Text>
            </View> 
          )}*/}
          {!timerActive && !reviewMode && <View style={{ width: 80 }} />}
        </>
      }
    >
      {/* Segmented Progress Bar */}
      <View style={styles.segmentedProgressContainer}>
        {!reviewMode && quizDetail?.max_attempts !== undefined && (
          <Text style={styles.attemptsInline}>
            {practiceMode ? (
              <Text style={{ color: Colors.yellow }}>
                Practice Mode (Not Recorded)
              </Text>
            ) : (
              <>
                Attempts left:{" "}
                {quizDetail.max_attempts === null
                  ? "Unlimited"
                  : attemptsRemainingDisplay}
              </>
            )}
          </Text>
        )}
        {/* Short Answer Quiz Notice */}
        {!reviewMode &&
          quizDetail?.questions.some(
            (q: any) => q.question_type === "short-answer",
          ) && (
            <Text style={styles.shortAnswerNotice}>
              ⚠️ This quiz requires manual grading. Only 1 attempt allowed.
            </Text>
          )}
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressLabel}>
            {reviewMode ? "Review Mode - " : ""}Question{" "}
            {currentQuestionIndex + 1} of {quizDetail.questions.length}
          </Text>
        </View>
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
        {/* Question Image - Show if image_url exists and is a valid URL */}
        {currentQuestion.image_url &&
          !currentQuestion.image_url.startsWith("[LOCAL_FILE:") &&
          currentQuestion.image_url.trim() !== "" && (
            <View style={styles.questionImageContainer}>
              <Image
                source={{ uri: currentQuestion.image_url }}
                style={styles.questionImage}
                resizeMode="contain"
                onError={(error) => {
                  console.log(
                    "Failed to load question image:",
                    error.nativeEvent.error,
                  );
                }}
              />
            </View>
          )}

        <Text style={styles.modernQuestionText}>
          {currentQuestion.question_text}
        </Text>

        {/* Points Earned Display in Review Mode */}
        {(() => {
          if (reviewMode) {
            console.log("🔍 Review mode - checking for graded answers:", {
              currentQuestionId: currentQuestion.id,
              hasQuizResult: !!quizResult,
              hasGradedAnswers: !!quizResult?.graded_answers,
              gradedAnswersKeys: quizResult?.graded_answers
                ? Object.keys(quizResult.graded_answers)
                : [],
              isInGradedAnswers: quizResult?.graded_answers
                ? currentQuestion.id in quizResult.graded_answers
                : false,
            });
          }
          return null;
        })()}
        {reviewMode &&
          quizResult?.graded_answers &&
          currentQuestion.id in quizResult.graded_answers && (
            <View
              style={{
                marginTop: 12,
                padding: 10,
                backgroundColor: Colors.purple850 + "40",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: Colors.purple400 + "30",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: Colors.purple200,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                Points Earned:
              </Text>
              <Text
                style={{
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: "bold",
                }}
              >
                {quizResult.graded_answers[
                  currentQuestion.id
                ].pointsAwarded.toFixed(2)}
                /
                {quizResult.graded_answers[
                  currentQuestion.id
                ].maxPoints.toFixed(2)}
              </Text>
            </View>
          )}
        {reviewMode &&
          quizResult?.graded_answers &&
          currentQuestion.id in quizResult.graded_answers &&
          quizResult.graded_answers[currentQuestion.id].feedback && (
            <View
              style={{
                marginTop: 8,
                padding: 10,
                backgroundColor: Colors.blue + "20",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: Colors.blue + "40",
              }}
            >
              <Text
                style={{
                  color: Colors.blue,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 4,
                }}
              >
                Instructor Feedback:
              </Text>
              <Text
                style={{ color: Colors.gray200, fontSize: 13, lineHeight: 18 }}
              >
                {quizResult.graded_answers[currentQuestion.id].feedback}
              </Text>
            </View>
          )}

        {/* Question Type Indicator */}
        {currentQuestion.question_type === "multiple-correct" && (
          <Text style={styles.questionTypeHint}>
            ℹ️ Select all correct answers
          </Text>
        )}
        {currentQuestion.question_type === "short-answer" && (
          <Text style={styles.questionTypeHint}>
            ℹ️ Short answer question (manually graded)
          </Text>
        )}
      </View>

      {/* Options - Only for MCQ types */}
      {(currentQuestion.question_type === "multiple-choice" ||
        currentQuestion.question_type === "multiple-correct" ||
        currentQuestion.question_type === "true-false") && (
        <View style={styles.modernOptionsContainer}>
          {currentQuestion.options?.filter(Boolean).map((option, index) => {
            const userAnswer = selectedAnswers.get(currentQuestion.id);
            const isSelected = Array.isArray(userAnswer)
              ? userAnswer.includes(option.option_text)
              : userAnswer === option.option_text;

            /* ----------  review-mode colours / icons  ---------- */
            let borderColor = "#3a3a4e";
            let backgroundColor = "#2a2a3e";
            let showCheckmark = false;
            let showCross = false;

            if (reviewMode && correctAnswerForCurrentQuestion) {
              let isCorrectAnswer = false;
              const correctAns = correctAnswerForCurrentQuestion.correctAnswer;

              if (currentQuestion.question_type === "multiple-correct") {
                // For multiple-correct, correct_answer contains option TEXT values
                try {
                  const correctAnswers = Array.isArray(correctAns)
                    ? correctAns
                    : JSON.parse(correctAns);
                  // Direct comparison: check if this option's text is in the correct answers array
                  isCorrectAnswer = correctAnswers.includes(option.option_text);
                } catch {
                  isCorrectAnswer = false;
                }
              } else if (currentQuestion.question_type === "true-false") {
                // True/false: correct_answer might be "True"/"False" (text) or "0"/"1" (index)
                const parsedIndex = parseInt(correctAns);
                if (!isNaN(parsedIndex)) {
                  isCorrectAnswer = parsedIndex === index;
                } else {
                  isCorrectAnswer = correctAns === option.option_text;
                }
              } else {
                // Multiple-choice: compare text or index
                isCorrectAnswer =
                  option.option_text === correctAns ||
                  String(index) === correctAns;
              }

              const wasUserAnswer = Array.isArray(userAnswer)
                ? userAnswer.includes(option.option_text)
                : option.option_text === userAnswer;

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
                key={String(
                  option.id ??
                    `option-${index}-${option.option_text ?? "choice"}`,
                )}
                style={[
                  styles.modernOptionCard,
                  { borderColor, backgroundColor },
                ]}
                onPress={() =>
                  !reviewMode &&
                  handleAnswerSelect(
                    currentQuestion.id,
                    option.option_text,
                    currentQuestion.question_type === "multiple-correct",
                  )
                }
                activeOpacity={reviewMode ? 1 : 0.7}
                disabled={reviewMode}
              >
                <View
                  style={[
                    currentQuestion.question_type === "multiple-correct"
                      ? styles.modernOptionCheckbox
                      : styles.modernOptionRadio,
                    { borderColor },
                  ]}
                >
                  {isSelected && !reviewMode && (
                    <View
                      style={
                        currentQuestion.question_type === "multiple-correct"
                          ? styles.modernOptionCheckboxInner
                          : styles.modernOptionRadioInner
                      }
                    />
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
                    isSelected &&
                      !reviewMode &&
                      styles.modernOptionTextSelected,
                  ]}
                >
                  {option.option_text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Short Answer Questions */}
      {currentQuestion.question_type === "short-answer" && (
        <View style={styles.shortAnswerContainer}>
          <Text style={styles.shortAnswerLabel}>
            This question requires a written answer and will be manually graded.
          </Text>
          {!reviewMode && (
            <TextInput
              style={styles.shortAnswerInput}
              placeholder="Type your answer here..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={4}
              value={(selectedAnswers.get(currentQuestion.id) as string) || ""}
              onChangeText={(text) =>
                handleAnswerSelect(currentQuestion.id, text, false)
              }
              editable={!reviewMode}
            />
          )}
          {reviewMode && (
            <View style={styles.shortAnswerReviewContainer}>
              <View style={styles.shortAnswerUserAnswer}>
                <Text style={styles.shortAnswerUserAnswerLabel}>
                  Your Answer:
                </Text>
                <Text style={styles.shortAnswerUserAnswerText}>
                  {selectedAnswers.get(currentQuestion.id) ||
                    "No answer provided"}
                </Text>
              </View>
              {currentQuestion.explanation && (
                <View style={styles.explanationCard}>
                  <Text style={styles.explanationTitle}>Sample Answer:</Text>
                  <Text style={styles.explanationText}>
                    {currentQuestion.explanation}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Matching Questions */}
      {currentQuestion.question_type === "matching" && (
        <MatchingQuestion
          question={currentQuestion}
          matchingState={matchingState}
          reviewMode={reviewMode}
          onMatch={handleMatch}
          onClearMatch={handleClearMatch}
        />
      )}
      {/* Show explanation in review mode for MCQ types */}
      {reviewMode &&
        currentQuestion.explanation &&
        (currentQuestion.question_type === "multiple-choice" ||
          currentQuestion.question_type === "multiple-correct" ||
          currentQuestion.question_type === "true-false") && (
          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>Explanation:</Text>
            <Text style={styles.explanationText}>
              {currentQuestion.explanation}
            </Text>
          </View>
        )}

      <View style={styles.questionNavRow}>
        <TouchableOpacity
          style={[
            styles.navIconButtonLarge,
            currentQuestionIndex === 0 && styles.navIconButtonDisabled,
          ]}
          onPress={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={
              currentQuestionIndex === 0 ? Colors.gray600 : Colors.textPrimary
            }
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navIconButtonLarge,
            (!reviewMode && !isCurrentQuestionAnswered) ||
            currentQuestionIndex === quizDetail.questions.length - 1
              ? styles.navIconButtonDisabled
              : null,
          ]}
          onPress={handleNextQuestion}
          disabled={
            (!reviewMode && !isCurrentQuestionAnswered) ||
            currentQuestionIndex === quizDetail.questions.length - 1
          }
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={
              (!reviewMode && !isCurrentQuestionAnswered) ||
              currentQuestionIndex === quizDetail.questions.length - 1
                ? Colors.gray600
                : Colors.textPrimary
            }
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={{ paddingVertical: Spacing.lg }}>
        {reviewMode
          ? currentQuestionIndex === quizDetail.questions.length - 1 && (
              <ActionButton onPress={handleDoneReview} text={"Done"} />
            )
          : allQuestionsAnswered && (
              <ActionButton
                onPress={handleSubmitQuiz}
                loading={submitting}
                disabled={submitting}
                text={"Submit"}
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
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  navIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray800,
    borderWidth: 1,
    borderColor: Colors.purple400,
  },
  navIconButtonDisabled: {
    opacity: 0.4,
    borderColor: Colors.gray600,
  },
  progressLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "left",
    flex: 1,
  },
  attemptsInline: {
    marginBottom: 6,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
    textAlign: "right",
  },
  shortAnswerNotice: {
    marginBottom: 6,
    marginTop: 2,
    fontSize: 11,
    color: Colors.yellow,
    fontWeight: "600",
    textAlign: "right",
    fontStyle: "italic",
  },
  questionNavRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: Spacing.md,
  },
  navIconButtonLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray800,
    borderWidth: 1,
    borderColor: Colors.purple400,
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
    height: 200,
    borderRadius: 16,
    backgroundColor: "#1a1a2e",
  },
  modernQuestionText: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.white,
    lineHeight: 28,
    textAlign: "left",
  },
  questionTypeHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    fontStyle: "italic",
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
  modernOptionCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: "#3a3a4e",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  modernOptionCheckboxInner: {
    width: 16,
    height: 16,
    borderRadius: 3,
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

  // Short Answer Styles
  shortAnswerContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 16,
    marginBottom: Spacing.md,
  },
  shortAnswerLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontStyle: "italic",
    marginBottom: Spacing.md,
  },
  shortAnswerInput: {
    backgroundColor: Colors.textInputBg,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 2,
    borderColor: Colors.gray600,
  },
  shortAnswerReviewContainer: {
    marginTop: Spacing.md,
  },
  shortAnswerUserAnswer: {
    backgroundColor: Colors.textInputBg,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  shortAnswerUserAnswerLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  shortAnswerUserAnswerText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },

  // Explanation Card
  explanationCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 16,
    marginTop: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.purple400,
  },
  explanationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.purple200,
    marginBottom: Spacing.sm,
  },
  explanationText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
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
    padding: Spacing.base,
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
  attemptsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.textInputBg,
    borderRadius: 8,
    gap: Spacing.xs,
  },
  attemptsText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.purple400,
  },
  attemptsTextError: {
    color: Colors.red,
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
    padding: Spacing.md,
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
    backgroundColor: Colors.purple400,
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
  completionInfoContainer: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  completionInfoText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
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
