import { Eye, Save, Settings, Clock, Users, BarChart3 } from "lucide-react";
import { useCourseBuilder } from './CourseBuilderContext';

export const CourseBuilderHeader = () => {
  const {
    courseName,
    setCourseName,
    previewMode,
    setPreviewMode,
    modules,
  } = useCourseBuilder();

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
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-white">{courseName}</h1>
        <p className="text-sm text-slate-400">Build and manage your course content</p>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{modules.length} modules</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{totalLessons} lessons</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>{totalQuizzes} quizzes ({totalPoints} points)</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Eye className="h-4 w-4" />
            {previewMode ? "Edit" : "Preview"}
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
            <Save className="h-4 w-4" />
            Save
          </button>
          
          <button className="p-2 hover:bg-slate-600 text-slate-400 hover:text-white rounded-lg transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};