import { Colors } from "../../../constants/Colors";

interface LessonBasicInfoProps {
  lesson: any;
  moduleId: string;
  updateLesson: (moduleId: string, lessonId: string, updates: any) => void;
  showValidationErrors: boolean;
  lessonTitleEmpty: boolean;
}

export const LessonBasicInfo = ({
  lesson,
  moduleId,
  updateLesson,
  showValidationErrors,
  lessonTitleEmpty,
}: LessonBasicInfoProps) => {
  return (
    <>
      <div>
        <label
          style={{ color: Colors.textSecondary }}
          className="block text-sm font-medium mb-2"
        >
          Lesson Title<span className="text-red-500 ml-1">*</span>
        </label>
        <div
          style={{
            color: Colors.textMuted,
            fontSize: "12px",
            marginBottom: "8px",
          }}
        ></div>
        <input
          type="text"
          value={lesson?.baseTitle || ""}
          onChange={(e) =>
            updateLesson(moduleId, lesson.id, { baseTitle: e.target.value })
          }
          style={{
            backgroundColor: Colors.textInputBg,
            borderColor: Colors.gray600,
            color: Colors.textPrimary,
          }}
          placeholder="Enter lesson title"
          className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80"
        />
        {showValidationErrors && lessonTitleEmpty && (
          <p className="text-xs text-red-400 mt-1">Lesson title is required.</p>
        )}
      </div>
      <div>
        <label
          style={{ color: Colors.textSecondary }}
          className="block text-sm font-medium mb-2"
        >
          Description / Content
        </label>
        <textarea
          value={lesson?.content || ""}
          onChange={(e) =>
            updateLesson(moduleId, lesson.id, { content: e.target.value })
          }
          rows={8}
          style={{
            backgroundColor: Colors.textInputBg,
            borderColor: Colors.gray600,
            color: Colors.textPrimary,
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:border-opacity-80 resize-none"
          placeholder="Enter lesson description..."
        />
      </div>
    </>
  );
};
