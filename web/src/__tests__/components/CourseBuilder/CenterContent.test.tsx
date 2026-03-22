import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CenterContent } from '@/components/CourseBuilder/CenterContent';

const mockUseCourseBuilder = vi.fn();
const mockUseContentManagement = vi.fn();

vi.mock('@/components/CourseBuilder/useCourseBuilder', () => ({
  useCourseBuilder: () => mockUseCourseBuilder(),
}));

vi.mock('@/components/CourseBuilder/useContentManagement', () => ({
  useContentManagement: () => mockUseContentManagement(),
}));

vi.mock('@/components/CourseBuilder/Module/index', () => ({
  ModuleEditor: () => <div>Mock Module Editor</div>,
}));

vi.mock('@/components/CourseBuilder/Lesson/index', () => ({
  LessonBasicInfo: () => <div>Mock Lesson Basic Info</div>,
  DocumentUpload: () => <div>Mock Document Upload</div>,
  VideoUpload: () => <div>Mock Video Upload</div>,
}));

vi.mock('@/components/CourseBuilder/Quiz', () => ({
  MatchingEditor: () => <div>Mock Matching Editor</div>,
  OptionsEditor: () => <div>Mock Options Editor</div>,
  QuizHeader: () => <div>Mock Quiz Header</div>,
  QuestionNavigation: () => <div>Mock Question Navigation</div>,
  ErrorBanner: () => <div>Mock Error Banner</div>,
  QuestionImageUpload: () => <div>Mock Question Image Upload</div>,
  QuestionCardHeader: () => <div>Mock Question Card Header</div>,
}));

vi.mock('@/components/CourseBuilder/useVideoUpload', () => ({
  useVideoUpload: () => ({
    isFetchingDuration: false,
    isUploading: false,
    uploadProgress: { thumbnail: 0, video: 0 },
    thumbnailInputType: 'url',
    setThumbnailInputType: vi.fn(),
    videoInputType: 'url',
    setVideoInputType: vi.fn(),
    selectedThumbnailFile: null,
    selectedVideoFile: null,
    extractYouTubeId: vi.fn(),
    handleVideoUrlChange: vi.fn(),
    handleThumbnailFileChange: vi.fn(),
    handleVideoFileChange: vi.fn(),
    clearThumbnail: vi.fn(),
    clearVideo: vi.fn(),
  }),
}));

describe('CenterContent', () => {
  const setSelectedItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseContentManagement.mockReturnValue({
      updateModule: vi.fn(),
      updateLesson: vi.fn(),
      updateQuiz: vi.fn(),
      addQuestion: vi.fn(),
      deleteQuestion: vi.fn(),
      updateQuestion: vi.fn(),
      addOption: vi.fn(),
      removeOption: vi.fn(),
    });

    mockUseCourseBuilder.mockReturnValue({
      selectedItem: null,
      setSelectedItem,
      modules: [],
      showValidationErrors: false,
    });
  });

  it('renders empty state when nothing is selected', () => {
    render(<CenterContent />);

    expect(screen.getByText('Course Builder')).toBeInTheDocument();
    expect(
      screen.getByText('Select an item from the left sidebar to edit content'),
    ).toBeInTheDocument();
  });

  it('renders module editor when selected item is a module', () => {
    mockUseCourseBuilder.mockReturnValue({
      selectedItem: { type: 'module', id: 'm1' },
      setSelectedItem,
      modules: [{ id: 'm1', lessons: [], quizzes: [] }],
      showValidationErrors: false,
    });

    render(<CenterContent />);

    expect(screen.getByText('Edit Module')).toBeInTheDocument();
    expect(screen.getByText('Mock Module Editor')).toBeInTheDocument();
  });

  it('clears selection when close button is clicked', () => {
    mockUseCourseBuilder.mockReturnValue({
      selectedItem: { type: 'module', id: 'm1' },
      setSelectedItem,
      modules: [{ id: 'm1', lessons: [], quizzes: [] }],
      showValidationErrors: false,
    });

    render(<CenterContent />);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(setSelectedItem).toHaveBeenCalledWith(null);
  });
});
