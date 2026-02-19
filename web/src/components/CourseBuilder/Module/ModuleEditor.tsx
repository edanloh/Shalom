interface ModuleEditorProps {
  selectedItem: any;
  modules: any[];
  updateModule: (moduleId: string, updates: any) => void;
  showValidationErrors: boolean;
}

export const ModuleEditor = ({
  selectedItem,
  modules,
  updateModule,
  showValidationErrors,
}: ModuleEditorProps) => {
  const module = modules.find((m: any) => m.id === selectedItem.id);

  // Extract the base title without "Module X:" prefix for editing
  const baseTitle = module?.title?.replace(/^Module \d+:\s*/, "") || "";
  const isModuleTitleEmpty = !baseTitle.trim();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Module Title<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={baseTitle}
          onChange={(e) => {
            // Update with the user's input, the prefix will be added by the numbering system
            const moduleNumber =
              modules.findIndex((m: any) => m.id === selectedItem.id) + 1;
            updateModule(selectedItem.id, {
              title: `Module ${moduleNumber}: ${e.target.value}`,
            });
          }}
          placeholder="Enter module title"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
        />
        {showValidationErrors && isModuleTitleEmpty && (
          <p className="text-xs text-red-400 mt-1">Module title is required.</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Description
        </label>
        <textarea
          value={module?.description || ""}
          onChange={(e) =>
            updateModule(selectedItem.id, { description: e.target.value })
          }
          rows={3}
          placeholder="Enter module description..."
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>
    </div>
  );
};
