export const ActivityFeed = () => {
  return (
    <div className="gradient-card border-border rounded-xl p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Recent Activity
      </h3>
      <div className="flex-1 rounded-lg border-2 border-dashed border-border bg-background/30 p-6 flex items-center justify-center">
        <p className="text-sm text-center text-muted-foreground">
          No recent activity yet
        </p>
      </div>
    </div>
  );
};
