import React from "react";
import { ArrowLeft } from "lucide-react";
import { useCourseBuilder } from './CourseBuilderContext';

export const CoursePreview = () => {
  const {
    courseName,
    setPreviewMode,
    modules,
  } = useCourseBuilder();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Preview Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPreviewMode(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editor
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{courseName}</h1>
            <p className="text-sm text-slate-400">Course Preview</p>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Course Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{modules.length}</div>
                <div className="text-sm text-slate-300">Modules</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {modules.reduce((sum, m) => sum + m.lessons.length, 0)}
                </div>
                <div className="text-sm text-slate-300">Lessons</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {modules.reduce((sum, m) => sum + m.quizzes.length, 0)}
                </div>
                <div className="text-sm text-slate-300">Quizzes</div>
              </div>
            </div>
          </div>

          {/* Module List */}
          <div className="border-t border-slate-700">
            {modules.map((module, moduleIndex) => (
              <div key={module.id} className="border-b border-slate-700 last:border-b-0">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">{module.title}</h3>
                  <p className="text-slate-300 mb-4">{module.description}</p>
                  
                  {/* Lessons and Quizzes */}
                  <div className="space-y-2">
                    {[...module.lessons, ...module.quizzes]
                      .sort((a, b) => {
                        // Sort by title to maintain order
                        return a.title.localeCompare(b.title);
                      })
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg"
                        >
                          <span className="text-lg">
                            {item.title.includes('Lesson') ? '📚' : '❓'}
                          </span>
                          <div className="flex-1">
                            <div className="text-white font-medium">{item.title}</div>
                            <div className="text-sm text-slate-400">
                              {item.title.includes('Lesson') 
                                ? 'Video Lesson' 
                                : `Quiz • ${(item as any).questions?.length || 0} questions`}
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs ${
                            item.status === 'published' 
                              ? 'bg-green-600 text-green-100' 
                              : 'bg-yellow-600 text-yellow-100'
                          }`}>
                            {item.status}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};