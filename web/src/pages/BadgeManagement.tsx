import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ValidationModal } from "@/components/CourseBuilder/ValidationModal";
import { Plus, Award, Trash2, Search, Star, Trophy, Medal, Target, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Pagination } from "@/components/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AchievementRecord,
  createAchievement,
  deleteAchievement,
  listAchievements,
  updateAchievement,
  uploadAchievementIcon,
} from "@/services/achievementService";
import { useAuth } from "@/contexts/AuthContext";

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: string;
  points: number;
  active: boolean;
  earnedBy: number;
  type?: string;
  color?: string | null;
}

const BadgeManagement = () => {
  const { toast } = useToast();
  const { authUser } = useAuth();
  const instructorId = authUser?.id ?? "";
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeDescription, setNewBadgeDescription] = useState("");
  const [newBadgeCriteriaType, setNewBadgeCriteriaType] = useState("courses_completed");
  const [newBadgeCriteriaCount, setNewBadgeCriteriaCount] = useState("1");
  const [newBadgePoints, setNewBadgePoints] = useState("100");
  const [newBadgeIcon, setNewBadgeIcon] = useState<File | null>(null);
  const [badgeIconPreview, setBadgeIconPreview] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [deleteTarget, setDeleteTarget] = useState<BadgeItem | null>(null);

  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateErrors, setShowCreateErrors] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState({
    title: "",
    description: "",
  });

  const iconOptions = [
    { value: "trophy", icon: Trophy, label: "Trophy" },
    { value: "star", icon: Star, label: "Star" },
    { value: "medal", icon: Medal, label: "Medal" },
    { value: "target", icon: Target, label: "Target" },
    { value: "award", icon: Award, label: "Award" },
  ];

  const criteriaOptions = [
    { value: "courses_completed", label: "Courses completed" },
    { value: "goal_hits", label: "Goals hit" },
    { value: "total_credits", label: "Total credits earned" },
    { value: "streak_days", label: "Streak days" },
  ];

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : Award;
  };

  const isIconUrl = (iconValue?: string) =>
    !!iconValue && (iconValue.startsWith("http://") || iconValue.startsWith("https://"));

  const formatCriteria = (criteria: unknown) => {
    if (!criteria) return "";
    if (typeof criteria === "string") return criteria;
    try {
      const asObj = criteria as Record<string, unknown>;
      const type = typeof asObj.type === "string" ? asObj.type : "";
      const count = typeof asObj.count === "number" ? asObj.count : Number(asObj.count);
      const label = criteriaOptions.find((opt) => opt.value === type)?.label;
      if (label && Number.isFinite(count) && count > 0) {
        return `${label}: ${count}`;
      }
      return JSON.stringify(criteria);
    } catch {
      return String(criteria);
    }
  };

  const mapBadge = (record: AchievementRecord): BadgeItem => ({
    id: record.id,
    name: record.name,
    description: record.description ?? "",
    icon: record.icon ?? "award",
    criteria: formatCriteria(record.criteria),
    points: Number(record.points ?? 0),
    active: !!record.is_active,
    earnedBy: Number(record.earnedBy ?? 0),
    type: record.type,
    color: record.color ?? null,
  });

  const loadBadges = async () => {
    if (!instructorId) {
      setBadges([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await listAchievements(instructorId, { type: "badge" });
      const items = response.items.map(mapBadge);
      setBadges(items);
    } catch (error) {
      console.error("Failed to load badges:", error);
      toast({
        title: "Error",
        description: "Failed to load badges",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBadges();
  }, [instructorId]);

  const resetCreateForm = () => {
    setNewBadgeName("");
    setNewBadgeDescription("");
    setNewBadgeCriteriaType("courses_completed");
    setNewBadgeCriteriaCount("1");
    setNewBadgePoints("100");
    setNewBadgeIcon(null);
    setBadgeIconPreview("");
    setShowCreateErrors(false);
    setShowValidationModal(false);
  };

  const handleCreateBadge = async () => {
    if (!instructorId) {
      toast({
        title: "Missing account context",
        description: "Please sign in again and retry.",
        variant: "destructive",
      });
      return;
    }
    const criteriaCount = parseInt(newBadgeCriteriaCount, 10);
    const pointsValue = parseInt(newBadgePoints, 10);
    if (!newBadgeName.trim() || !newBadgeDescription.trim()) {
      setShowCreateErrors(true);
      setValidationMessage({
        title: "Missing required fields",
        description: "Please fill in all required fields before creating a badge.",
      });
      setShowValidationModal(true);
      return;
    }
    if (!newBadgeCriteriaType || !Number.isFinite(criteriaCount) || criteriaCount <= 0) {
      setShowCreateErrors(true);
      setValidationMessage({
        title: "Invalid criteria",
        description: "Please set a valid criteria type and count.",
      });
      setShowValidationModal(true);
      return;
    }
    if (!Number.isFinite(pointsValue) || pointsValue <= 0) {
      setShowCreateErrors(true);
      setValidationMessage({
        title: "Invalid points value",
        description: "Please enter a valid points value greater than 0.",
      });
      setShowValidationModal(true);
      return;
    }

    setIsSaving(true);
    try {
      let iconValue: string | null = "award";
      if (newBadgeIcon) {
        const upload = await uploadAchievementIcon(newBadgeIcon);
        iconValue = upload?.url || upload?.publicUrl || upload?.path || "award";
      }

      const created = await createAchievement(instructorId, {
        name: newBadgeName,
        description: newBadgeDescription,
        icon: iconValue,
        type: "badge",
        criteria: {
          type: newBadgeCriteriaType,
          count: criteriaCount,
        },
        points: parseInt(newBadgePoints, 10) || 100,
        isActive: true,
      });

      if (created?.id) {
        setBadges((prev) => [mapBadge(created), ...prev]);
      } else {
        await loadBadges();
      }

      toast({
        title: "Badge Created",
        description: `${newBadgeName} has been created successfully`,
      });

      setIsCreateDialogOpen(false);
      resetCreateForm();
    } catch (error) {
      console.error("Failed to create badge:", error);
      toast({
        title: "Error",
        description: "Failed to create badge",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewBadgeIcon(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBadgeIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleBadgeStatus = async (badgeId: string) => {
    if (!instructorId) return;
    const badge = badges.find((item) => item.id === badgeId);
    if (!badge) return;
    const nextActive = !badge.active;
    setBadges(badges.map(b => (b.id === badgeId ? { ...b, active: nextActive } : b)));
    try {
      await updateAchievement(instructorId, { id: badgeId, isActive: nextActive });
      toast({
        title: "Badge Status Updated",
        description: "Badge status has been changed",
      });
    } catch (error) {
      console.error("Failed to update badge:", error);
      setBadges(badges.map(b => (b.id === badgeId ? { ...b, active: badge.active } : b)));
      toast({
        title: "Error",
        description: "Failed to update badge status",
        variant: "destructive",
      });
    }
  };

  const deleteBadge = async (badgeId: string) => {
    if (!instructorId) return;
    const prev = badges;
    setBadges(badges.filter(badge => badge.id !== badgeId));
    try {
      await deleteAchievement(instructorId, badgeId);
      toast({
        title: "Badge Deleted",
        description: "Badge has been removed successfully",
      });
    } catch (error) {
      console.error("Failed to delete badge:", error);
      setBadges(prev);
      toast({
        title: "Error",
        description: "Failed to delete badge",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await deleteBadge(id);
  };

  const filteredBadges = useMemo(() => (
    badges.filter(badge =>
      badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      badge.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ), [badges, searchQuery]);

  const paginatedBadges = filteredBadges.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[32px] font-bold">Badge Management</h1>
            <p className="text-muted-foreground">Create and manage achievement badges for students</p>
          </div>
          
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              if (!open) resetCreateForm();
              if (open) setShowCreateErrors(false);
              if (open) setShowValidationModal(false);
              setIsCreateDialogOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Badge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Badge</DialogTitle>
                <DialogDescription>Define a new achievement badge</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="badge-name">
                    Badge Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="badge-name"
                    value={newBadgeName}
                    onChange={(e) => setNewBadgeName(e.target.value)}
                    placeholder="e.g., Course Master"
                  />
                  {showCreateErrors && !newBadgeName.trim() && (
                    <p className="text-xs text-red-500 mt-1">
                      Badge name is required.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="badge-description">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="badge-description"
                    value={newBadgeDescription}
                    onChange={(e) => setNewBadgeDescription(e.target.value)}
                    placeholder="Describe what this badge represents..."
                    rows={3}
                  />
                  {showCreateErrors && !newBadgeDescription.trim() && (
                    <p className="text-xs text-red-500 mt-1">
                      Description is required.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="badge-criteria">
                    Earning Criteria <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select value={newBadgeCriteriaType} onValueChange={setNewBadgeCriteriaType}>
                      <SelectTrigger id="badge-criteria">
                        <SelectValue placeholder="Select criteria type" />
                      </SelectTrigger>
                      <SelectContent>
                        {criteriaOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="badge-criteria-count"
                      type="number"
                      min={1}
                      value={newBadgeCriteriaCount}
                      onChange={(e) => setNewBadgeCriteriaCount(e.target.value)}
                      placeholder="Count"
                    />
                  </div>
                  {showCreateErrors && (!newBadgeCriteriaType || !Number.isFinite(parseInt(newBadgeCriteriaCount, 10)) || parseInt(newBadgeCriteriaCount, 10) <= 0) && (
                    <p className="text-xs text-red-500 mt-1">
                      Criteria type and count are required.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="badge-points">
                    Points Value <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="badge-points"
                    type="number"
                    value={newBadgePoints}
                    onChange={(e) => setNewBadgePoints(e.target.value)}
                    placeholder="100"
                  />
                  {showCreateErrors && (!Number.isFinite(parseInt(newBadgePoints, 10)) || parseInt(newBadgePoints, 10) <= 0) && (
                    <p className="text-xs text-red-500 mt-1">
                      Points value is required.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="badge-icon">Badge Icon (Optional)</Label>
                  <Input
                    id="badge-icon"
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    className="cursor-pointer"
                  />
                  {badgeIconPreview && (
                    <div className="mt-2">
                      <img src={badgeIconPreview} alt="Badge preview" className="w-16 h-16 rounded object-cover" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Upload a custom icon or use default</p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetCreateForm();
                    setIsCreateDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateBadge} disabled={isSaving}>
                  {isSaving ? "Creating..." : "Create Badge"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <ValidationModal
            open={showValidationModal}
            onOpenChange={setShowValidationModal}
            title={validationMessage.title}
            description={validationMessage.description}
          />
        </div>

        {/* Search */}
        <div className="gradient-card border border-border rounded-xl p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search badges..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Badge Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : paginatedBadges.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedBadges.map((badge) => {
                const IconComponent = getIconComponent(badge.icon);
                return (
                  <div key={badge.id} className="gradient-card border border-border rounded-xl p-6 hover-lift">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center overflow-hidden">
                        {isIconUrl(badge.icon) ? (
                          <img src={badge.icon} alt={`${badge.name} icon`} className="w-full h-full object-cover" />
                        ) : (
                          <IconComponent className="h-8 w-8 text-warning" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={badge.active}
                          onCheckedChange={() => toggleBadgeStatus(badge.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(badge)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold mb-2">{badge.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{badge.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Criteria:</span>
                        <span className="font-medium">{badge.criteria}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Points:</span>
                        <Badge variant="outline">{badge.points} pts</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Earned by:</span>
                        <span className="font-medium">{badge.earnedBy} students</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={badge.active ? "status-badge-published" : "status-badge-unpublished"}>
                        {badge.active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredBadges.length / itemsPerPage)}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              itemsPerPage={itemsPerPage}
              totalItems={filteredBadges.length}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? `No badges found matching "${searchQuery}"` : "No badges found matching your criteria"}
            </p>
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete badge?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name || "this badge"}
              </span>{" "}
              and any related notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Badge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BadgeManagement;
