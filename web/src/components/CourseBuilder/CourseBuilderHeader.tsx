import { Eye, Save, Settings, Clock, Users, BarChart3, ArrowLeft } from "lucide-react";
import { useCourseBuilder } from './CourseBuilderContext';
import { useNavigate } from 'react-router-dom';
import { Colors } from '../../constants/Colors';

export const CourseBuilderHeader = () => {
  const navigate = useNavigate();
  const {
    courseName,
    setCourseName,
    previewMode,
    setPreviewMode,
    modules,
    saveCourse,
    isSaving,
    showModal,
  } = useCourseBuilder();

  const handleSave = async () => {
    // Show confirmation dialog before saving
    showModal({
      title: 'Save Course?',
      message: 'Are you sure you want to save your changes? This will update the course for all students.',
      type: 'warning',
      confirmText: 'Save Changes',
      cancelText: 'Cancel',
      showCancel: true,
      onConfirm: async () => {
        const result = await saveCourse();
        if (!result.success) {
          console.error('Save failed:', result.message);
        }
      },
    });
  };

  // Calculate statistics
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalQuizzes = modules.reduce((sum, m) => sum + m.quizzes.length, 0);
  const totalPoints = modules.reduce(
    (sum, m) =>
      sum +
      m.quizzes.reduce(
        (quizSum, q) => quizSum + q.questions.reduce((pointSum, qu) => pointSum + qu.points, 0),
        0
      ),
    0
  );

  return (
    <div 
      style={{ 
        background: `linear-gradient(to right, ${Colors.cardBackground}, ${Colors.surface})`,
        borderBottom: `1px solid ${Colors.gray800}`
      }}
      className="px-6 py-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          style={{ 
            backgroundColor: Colors.backgroundGray,
            color: Colors.textSecondary
          }}
          className="p-2 rounded-lg hover:opacity-80 transition-opacity"
          title="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h4 style={{ color: Colors.textPrimary }} className="text-3xl font-bold">{courseName || 'New Course'}</h4>
          <p style={{ color: Colors.textSecondary }} className="text-sm">Build and manage your course content</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-6 text-sm" style={{ color: Colors.textPrimary }}>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: Colors.yellow }} />
            <span>{modules.length} modules</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: Colors.green }} />
            <span>{totalLessons} lessons</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" style={{ color: Colors.accent }} />
            <span>{totalQuizzes} quizzes ({totalPoints} points)</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            style={{ 
              backgroundColor: Colors.secondary,
              color: Colors.textPrimary
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Eye className="h-4 w-4" />
            {previewMode ? "Edit" : "Preview"}
          </button>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            style={{ 
              backgroundColor: Colors.green,
              color: Colors.textPrimary
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};