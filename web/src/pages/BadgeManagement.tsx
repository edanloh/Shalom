import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Award, Edit, Trash2, Search, Star, Trophy, Medal, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: string;
  points: number;
  active: boolean;
  earnedBy: number;
}

const BadgeManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeDescription, setNewBadgeDescription] = useState("");
  const [newBadgeCriteria, setNewBadgeCriteria] = useState("");
  const [newBadgePoints, setNewBadgePoints] = useState("100");
  const [newBadgeIcon, setNewBadgeIcon] = useState<File | null>(null);
  const [badgeIconPreview, setBadgeIconPreview] = useState<string>("");

  const [badges, setBadges] = useState<BadgeItem[]>([
    {
      id: "1",
      name: "Course Completion Master",
      description: "Complete 5 courses with 90% or higher score",
      icon: "trophy",
      criteria: "Complete 5 courses >= 90%",
      points: 500,
      active: true,
      earnedBy: 45,
    },
    {
      id: "2",
      name: "Quiz Champion",
      description: "Score 100% on 10 different quizzes",
      icon: "star",
      criteria: "Score 100% on 10 quizzes",
      points: 300,
      active: true,
      earnedBy: 78,
    },
    {
      id: "3",
      name: "Early Bird",
      description: "Complete lessons within 24 hours of release",
      icon: "medal",
      criteria: "Complete 10 lessons within 24hrs",
      points: 200,
      active: true,
      earnedBy: 23,
    },
    {
      id: "4",
      name: "Perfect Streak",
      description: "Maintain a 30-day learning streak",
      icon: "target",
      criteria: "30-day streak",
      points: 400,
      active: false,
      earnedBy: 12,
    },
  ]);

  const iconOptions = [
    { value: "trophy", icon: Trophy, label: "Trophy" },
    { value: "star", icon: Star, label: "Star" },
    { value: "medal", icon: Medal, label: "Medal" },
    { value: "target", icon: Target, label: "Target" },
    { value: "award", icon: Award, label: "Award" },
  ];

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : Award;
  };

  const handleCreateBadge = () => {
    if (!newBadgeName || !newBadgeDescription || !newBadgeCriteria) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const newBadge: BadgeItem = {
      id: Date.now().toString(),
      name: newBadgeName,
      description: newBadgeDescription,
      icon: "award",
      criteria: newBadgeCriteria,
      points: parseInt(newBadgePoints) || 100,
      active: true,
      earnedBy: 0,
    };

    setBadges([...badges, newBadge]);
    toast({
      title: "Badge Created",
      description: `${newBadgeName} has been created successfully`
    });

    setIsCreateDialogOpen(false);
    setNewBadgeName("");
    setNewBadgeDescription("");
    setNewBadgeCriteria("");
    setNewBadgePoints("100");
    setNewBadgeIcon(null);
    setBadgeIconPreview("");
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

  const toggleBadgeStatus = (badgeId: string) => {
    setBadges(badges.map(badge => 
      badge.id === badgeId ? { ...badge, active: !badge.active } : badge
    ));
    toast({
      title: "Badge Status Updated",
      description: "Badge status has been changed"
    });
  };

  const deleteBadge = (badgeId: string) => {
    setBadges(badges.filter(badge => badge.id !== badgeId));
    toast({
      title: "Badge Deleted",
      description: "Badge has been removed successfully"
    });
  };

  const filteredBadges = badges.filter(badge =>
    badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    badge.description.toLowerCase().includes(searchQuery.toLowerCase())
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
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                  <Label htmlFor="badge-name">Badge Name *</Label>
                  <Input
                    id="badge-name"
                    value={newBadgeName}
                    onChange={(e) => setNewBadgeName(e.target.value)}
                    placeholder="e.g., Course Master"
                  />
                </div>
                <div>
                  <Label htmlFor="badge-description">Description *</Label>
                  <Textarea
                    id="badge-description"
                    value={newBadgeDescription}
                    onChange={(e) => setNewBadgeDescription(e.target.value)}
                    placeholder="Describe what this badge represents..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="badge-criteria">Earning Criteria *</Label>
                  <Input
                    id="badge-criteria"
                    value={newBadgeCriteria}
                    onChange={(e) => setNewBadgeCriteria(e.target.value)}
                    placeholder="e.g., Complete 3 courses with 85%+ score"
                  />
                </div>
                <div>
                  <Label htmlFor="badge-points">Points Value</Label>
                  <Input
                    id="badge-points"
                    type="number"
                    value={newBadgePoints}
                    onChange={(e) => setNewBadgePoints(e.target.value)}
                    placeholder="100"
                  />
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
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateBadge}>Create Badge</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBadges.map((badge) => {
            const IconComponent = getIconComponent(badge.icon);
            return (
              <div key={badge.id} className="gradient-card border border-border rounded-xl p-6 hover-lift">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
                    <IconComponent className="h-8 w-8 text-warning" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={badge.active}
                      onCheckedChange={() => toggleBadgeStatus(badge.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteBadge(badge.id)}
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

        {filteredBadges.length === 0 && (
          <div className="text-center py-12">
            <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No badges found matching your criteria</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default BadgeManagement;
