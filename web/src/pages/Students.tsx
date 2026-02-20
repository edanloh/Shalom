import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Mail, MoreVertical, TrendingUp, BookOpen, Clock, Award, Target, CheckCircle, Star, UserX, Loader2, UserCheck, X, HelpCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/Pagination";
import { courseService, studentService } from "@/services";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { postNotification } from "@/services/notificationService";
import { disableUser } from "@/services/userService";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Students = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [profileCache, setProfileCache] = useState<Record<string, any>>({});
  const [profileLoadingId, setProfileLoadingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { toast } = useToast();

  const [isMessageAllDialogOpen, setIsMessageAllDialogOpen] = useState(false);
  const [messageToAll, setMessageToAll] = useState(["",""]);

  const [isMessageStudentDialogOpen, setIsMessageStudentDialogOpen] = useState(false);
  const [messageStudent, setMessageStudent] = useState(["",""]);

  const [filterEnrolledFrom, setFilterEnrolledFrom] = useState("");
  const [filterEnrolledTo, setFilterEnrolledTo] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterProgressMin, setFilterProgressMin] = useState("");
  const [filterProgressMax, setFilterProgressMax] = useState("");
  const [filterEngagementMin, setFilterEngagementMin] = useState("");
  const [filterEngagementMax, setFilterEngagementMax] = useState("");
  const [filterLastActivityDays, setFilterLastActivityDays] = useState("all");

  const [draftEnrolledFrom, setDraftEnrolledFrom] = useState("");
  const [draftEnrolledTo, setDraftEnrolledTo] = useState("");
  const [draftStatus, setDraftStatus] = useState<"all" | "active" | "inactive">("all");
  const [draftProgressMin, setDraftProgressMin] = useState("");
  const [draftProgressMax, setDraftProgressMax] = useState("");
  const [draftEngagementMin, setDraftEngagementMin] = useState("");
  const [draftEngagementMax, setDraftEngagementMax] = useState("");
  const [draftLastActivityDays, setDraftLastActivityDays] = useState("all");
  const SectionHelp = ({
    title,
    items,
  }: {
    title: string;
    items: Array<{ label: string; description: string; className?: string }>;
  }) => (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`${title} help`}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-xs text-sm">
          <div className="space-y-3">
            <p className="font-semibold text-foreground">{title}</p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.label} className="space-y-1">
                  <p className={`text-sm font-medium ${item.className ?? ""}`}>
                    {item.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

	const fetchStudents = async () => {
		setLoading(true);
		setError("");
		try {
			const result = await courseService.getAllStudents();
			
			// Transform API data to match the expected structure
			const transformedStudents = result.students.map((student: any) => ({
				id: student.id,
				name: student.name || "Unknown User",
				email: student.email || "",
				enrolledDate: student.enrolledDate || new Date().toISOString().split('T')[0],
				progress: student.progress || 0,
				lastActivity: student.lastActivity || "Unknown",
				engagement: student.engagement || 0,
				coursesEnrolled: student.coursesEnrolled || 0,
				completedCourses: student.completedCourses || 0,
				totalHours: student.totalHours || 0,
				enabled: student.enabled !== false, // Get from API, default to true if null/undefined
			}));
			
			setStudents(transformedStudents);
		} catch (err: any) {
			setError(err.message || "Error fetching students");
		} finally {
			setLoading(false);
		}
	};

  useEffect(() => {
    fetchStudents();
  }, []);

  const activeProfileBase = selectedStudent
    ? profileCache[selectedStudent.id] || selectedStudent
    : null;
  const activeProfile = selectedStudent
    ? profileCache[selectedStudent.id] || null
    : null;
  const activeProfileLoading = selectedStudent
    ? profileLoadingId === selectedStudent.id
    : false;
  const activeProfileCurrentCourses = activeProfile?.currentCourses || [];
  const activeProfileCompletedCourses = activeProfile?.completedCoursesData || [];
  const activeProfileQuizResults = activeProfile?.quizResults || [];

  const loadStudentProfile = async (studentId: string) => {
    if (profileCache[studentId]) return;
    setProfileLoadingId(studentId);
    try {
      const profile = await studentService.getStudentProfile(studentId);
      setProfileCache((prev) => ({ ...prev, [studentId]: profile }));
      if (selectedStudent?.id === studentId) {
        setSelectedStudent(profile);
      }
    } catch (err) {
      console.error("Failed to load student profile:", err);
    } finally {
      setProfileLoadingId(null);
    }
  };

  // const students = [
  //   {
  //     id: 1,
  //     name: "Sarah Johnson",
  //     email: "sarah.j@email.com",
  //     enrolledDate: "2024-01-15",
  //     progress: 78,
  //     lastActivity: "2 hours ago",
  //     engagement: 92,
  //     coursesEnrolled: 3,
  //     completedCourses: 2,
  //     currentCourses: [
  //       { id: 1, name: "Data Science Fundamentals", progress: 85, grade: 92 },
  //       { id: 2, name: "Machine Learning A-Z", progress: 67, grade: 88 }
  //     ],
  //     completedCoursesData: [
  //       { id: 3, name: "Python for Beginners", completedDate: "2024-03-15", grade: 95, certificate: true }
  //     ],
  //     quizResults: [
  //       { quiz: "Data Science Quiz 1", score: 92, date: "2024-04-10" },
  //       { quiz: "ML Algorithms Test", score: 88, date: "2024-04-08" }
  //     ],
  //     totalHours: 124,
  //     streak: 15,
  //     badges: 5,
  //     averageScore: 91
  //   },
  //   {
  //     id: 2,
  //     name: "Michael Chen",
  //     email: "m.chen@email.com",
  //     enrolledDate: "2024-02-03",
  //     progress: 45,
  //     lastActivity: "1 day ago",
  //     engagement: 67,
  //     coursesEnrolled: 2,
  //     completedCourses: 0,
  //     currentCourses: [
  //       { id: 1, name: "Python for Beginners", progress: 45, grade: 78 },
  //       { id: 2, name: "Data Visualization", progress: 30, grade: 72 }
  //     ],
  //     completedCoursesData: [],
  //     quizResults: [
  //       { quiz: "Python Basics Quiz", score: 78, date: "2024-04-05" }
  //     ],
  //     totalHours: 56,
  //     streak: 7,
  //     badges: 2,
  //     averageScore: 75
  //   },
  //   {
  //     id: 3,
  //     name: "Emma Wilson",
  //     email: "emma.w@email.com",
  //     enrolledDate: "2024-01-28",
  //     progress: 92,
  //     lastActivity: "30 mins ago",
  //     engagement: 95,
  //     coursesEnrolled: 4,
  //     completedCourses: 3,
  //     currentCourses: [
  //       { id: 1, name: "Advanced Analytics", progress: 92, grade: 96 }
  //     ],
  //     completedCoursesData: [
  //       { id: 2, name: "Data Science Fundamentals", completedDate: "2024-03-20", grade: 98, certificate: true },
  //       { id: 3, name: "Machine Learning A-Z", completedDate: "2024-03-25", grade: 94, certificate: true },
  //       { id: 4, name: "Python for Beginners", completedDate: "2024-02-28", grade: 97, certificate: true }
  //     ],
  //     quizResults: [
  //       { quiz: "Advanced Analytics Quiz", score: 96, date: "2024-04-12" },
  //       { quiz: "ML Final Test", score: 94, date: "2024-04-09" }
  //     ],
  //     totalHours: 187,
  //     streak: 22,
  //     badges: 8,
  //     averageScore: 96
  //   },
  //   {
  //     id: 4,
  //     name: "James Rodriguez",
  //     email: "james.r@email.com",
  //     enrolledDate: "2024-03-10",
  //     progress: 23,
  //     lastActivity: "3 days ago",
  //     engagement: 45,
  //     coursesEnrolled: 1,
  //     completedCourses: 0,
  //     currentCourses: [
  //       { id: 1, name: "Data Science Fundamentals", progress: 23, grade: 65 }
  //     ],
  //     completedCoursesData: [],
  //     quizResults: [
  //       { quiz: "Intro Quiz", score: 65, date: "2024-04-01" }
  //     ],
  //     totalHours: 18,
  //     streak: 2,
  //     badges: 1,
  //     averageScore: 65
  //   }
  // ];

  const parseDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
    return null;
  };

  const parseRelativeActivity = (value?: string) => {
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    if (normalized === "unknown") return null;
    if (normalized === "just now") return new Date();
    const match = normalized.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/);
    if (!match) return parseDate(value);
    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount)) return null;
    const now = new Date();
    const multipliers: Record<string, number> = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };
    return new Date(now.getTime() - amount * (multipliers[unit] || 0));
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterStatus !== "all") {
      const isActive = student.enabled === true;
      if (filterStatus === "active" && !isActive) return false;
      if (filterStatus === "inactive" && isActive) return false;
    }

    const progressValue = Number(student.progress ?? 0);
    if (filterProgressMin !== "" && progressValue < Number(filterProgressMin)) {
      return false;
    }
    if (filterProgressMax !== "" && progressValue > Number(filterProgressMax)) {
      return false;
    }

    const engagementValue = Number(student.engagement ?? 0);
    if (filterEngagementMin !== "" && engagementValue < Number(filterEngagementMin)) {
      return false;
    }
    if (filterEngagementMax !== "" && engagementValue > Number(filterEngagementMax)) {
      return false;
    }

    if (filterEnrolledFrom || filterEnrolledTo) {
      const enrolledDate = parseDate(student.enrolledDate);
      if (!enrolledDate) return false;
      if (filterEnrolledFrom) {
        const fromDate = parseDate(filterEnrolledFrom);
        if (fromDate && enrolledDate < fromDate) return false;
      }
      if (filterEnrolledTo) {
        const toDate = parseDate(filterEnrolledTo);
        if (toDate) {
          const endOfDay = new Date(toDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (enrolledDate > endOfDay) return false;
        }
      }
    }

    if (filterLastActivityDays !== "all") {
      const lastActivityDate = parseRelativeActivity(student.lastActivity);
      if (!lastActivityDate) return false;
      const days = Number(filterLastActivityDays);
      if (Number.isFinite(days)) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        if (lastActivityDate < cutoff) return false;
      }
    }

    return true;
  });

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getEngagementColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "destructive";
  };

  const sendMessageToAll = async () => {
    // Ensure message is not empty
    if (!messageToAll || !messageToAll[0].trim() || !messageToAll[1].trim()) {
      toast({
        title: "Error",
        description: "Title or message cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    await postNotification({
      userIds: students.map(student => student.id),
      title: messageToAll[0],
      message: messageToAll[1],
      type: "general",
    });
    toast({
      title: "Message Sent",
      description: "Your message has been sent to all students.",
    });
    setIsMessageAllDialogOpen(false);
    setMessageToAll(["",""]);
  }

  const sendMessageToStudent = async () => {
    // Ensure message is not empty
    if (!messageStudent || !messageStudent[0].trim() || !messageStudent[1].trim()) {
      toast({
        title: "Error",
        description: "Title or message cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    await postNotification({
      userIds: [selectedStudent?.id],
      title: messageStudent[0],
      message: messageStudent[1],
      type: "general",
    });
    toast({
      title: "Message Sent",
      description: `Your message has been sent to ${selectedStudent?.name}.`,
    });
    setIsMessageStudentDialogOpen(false);
    setMessageStudent(["",""]);
  }

  const handleDisableUser = async (email: string, enable: boolean) => {
    console.log(selectedStudent)
    const sessionResponse = await supabase.auth.getSession();
    const accessToken = sessionResponse.data.session?.access_token;
    try {
      const response = await disableUser(email, accessToken, enable);
      toast({
        title: "Success",
        description: "User status has been updated successfully.",
        variant: "default",
      });
      return response;
    } catch (error) {
      console.error('Error disabling/enabling user:', error);
      toast({
        title: "Error",
        description: "There was an error updating the user status.",
        variant: "destructive",
      });
      return;
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filterEnrolledFrom,
    filterEnrolledTo,
    filterStatus,
    filterProgressMin,
    filterProgressMax,
    filterEngagementMin,
    filterEngagementMax,
    filterLastActivityDays,
  ]);

  const resetFilters = () => {
    setDraftEnrolledFrom("");
    setDraftEnrolledTo("");
    setDraftStatus("all");
    setDraftProgressMin("");
    setDraftProgressMax("");
    setDraftEngagementMin("");
    setDraftEngagementMax("");
    setDraftLastActivityDays("all");
  };

  const applyFilters = () => {
    setFilterEnrolledFrom(draftEnrolledFrom);
    setFilterEnrolledTo(draftEnrolledTo);
    setFilterStatus(draftStatus);
    setFilterProgressMin(draftProgressMin);
    setFilterProgressMax(draftProgressMax);
    setFilterEngagementMin(draftEngagementMin);
    setFilterEngagementMax(draftEngagementMax);
    setFilterLastActivityDays(draftLastActivityDays);
    setIsFilterOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Student Management</h1>
            <p className="text-muted-foreground">Monitor and support your students</p>
          </div>
          
            <Dialog open={isMessageAllDialogOpen} onOpenChange={setIsMessageAllDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Mail className="h-4 w-4" />
                  Message All
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Message All Students</DialogTitle>
                  <DialogDescription>
                    Send a notification to all students.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                    placeholder="Title"
                    value={messageToAll ? messageToAll[0] : ""}
                    onChange={(e) => setMessageToAll([e.target.value, messageToAll[1]])}
                  />
                  <textarea
                    value={messageToAll ? messageToAll[1] : ""}
                    placeholder="Message"
                    onChange={(e) =>
                      setMessageToAll([messageToAll[0], e.target.value])
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <Button
                    onClick={() => {
                      sendMessageToAll();
                    }}
                    className="w-full gap-2"
                  >
                    <Mail className="h-4 w-4" />
                      Message All
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isMessageStudentDialogOpen} onOpenChange={setIsMessageStudentDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Message {selectedStudent?.name}</DialogTitle>
                  <DialogDescription>
                    Send a notification to {selectedStudent?.name}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                    placeholder="Title"
                    value={messageStudent ? messageStudent[0] : ""}
                    onChange={(e) => setMessageStudent([e.target.value, messageStudent[1]])}
                  />
                  <textarea
                    value={messageStudent ? messageStudent[1] : ""}
                    placeholder="Message"
                    onChange={(e) =>
                      setMessageStudent([messageStudent[0], e.target.value])
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <Button
                    onClick={() => {
                      sendMessageToStudent();
                    }}
                    className="w-full gap-2"
                  >
                    <Mail className="h-4 w-4" />
                      Message {selectedStudent?.name}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
        </div>

        <Card className="p-6 gradient-card border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="bottom"
                collisionPadding={16}
                className="w-[420px] p-0 max-h-[55vh] flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Filter Students
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFilterOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Enrollment Date
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        className="w-full min-w-[140px] pr-10"
                        style={{ colorScheme: "dark" }}
                        value={draftEnrolledFrom}
                        onChange={(e) => setDraftEnrolledFrom(e.target.value)}
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="date"
                        className="w-full min-w-[140px] pr-10"
                        style={{ colorScheme: "dark" }}
                        value={draftEnrolledTo}
                        onChange={(e) => setDraftEnrolledTo(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Status
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {["all", "active", "inactive"].map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant={draftStatus === status ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setDraftStatus(status as "all" | "active" | "inactive")
                          }
                        >
                          {status === "all"
                            ? "All"
                            : status === "active"
                              ? "Active"
                              : "Inactive"}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Progress (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Min"
                        className="w-full min-w-0"
                        value={draftProgressMin}
                        onChange={(e) => setDraftProgressMin(e.target.value)}
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Max"
                        className="w-full min-w-0"
                        value={draftProgressMax}
                        onChange={(e) => setDraftProgressMax(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Engagement (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Min"
                        className="w-full min-w-0"
                        value={draftEngagementMin}
                        onChange={(e) => setDraftEngagementMin(e.target.value)}
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Max"
                        className="w-full min-w-0"
                        value={draftEngagementMax}
                        onChange={(e) => setDraftEngagementMax(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Last Activity
                    </label>
                    <Select
                      value={draftLastActivityDays}
                      onValueChange={setDraftLastActivityDays}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="365">Last year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 px-4 py-3">
                  <Button variant="outline" className="flex-1" onClick={resetFilters}>
                    Reset
                  </Button>
                  <Button className="flex-1" onClick={applyFilters}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchStudents()}>Retry</Button>
          </div>
        ) : (
          <Card className="gradient-card border-border">
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled Date</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.enabled ? "default" : "destructive"}>
                        {student.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{student.enrolledDate}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{student.progress}%</span>
                        </div>
                        <Progress value={student.progress} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEngagementColor(student.engagement) as any}>
                        {student.engagement}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{student.lastActivity}</TableCell>
                    <TableCell className="text-right">
                      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                      <SheetTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedStudent(student);
                              loadStudentProfile(student.id);
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full">
                          <SheetHeader>
                            <SheetTitle>Student Profile</SheetTitle>
                          </SheetHeader>
                          {activeProfileBase && (
                            <>
                            <div className="space-y-6 mt-6 flex flex-col min-h-0">
                              {/* Header */}
                              <div className="flex items-center gap-4 pb-6 border-b border-border">
                                <Avatar className="h-20 w-20">
                                  <AvatarFallback className="text-2xl bg-primary">
                                    {activeProfileBase.name.split(' ').map((n: string) => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-2xl text-foreground">{activeProfileBase.name}</h3>
                                  <p className="text-sm text-muted-foreground mb-2">{activeProfileBase.email}</p>
                                  <div className="flex gap-2">
                                    <Badge variant={activeProfileBase.enabled ? "default" : "destructive"}>
                                      {activeProfileBase.enabled ? "Active" : "Inactive"}
                                    </Badge>
                                    <Badge variant="outline">{activeProfileBase.coursesEnrolled} Courses</Badge>
                                  </div>
                                </div>
                              </div>
                              {activeProfileLoading && (
                                <div className="flex items-center justify-center py-12">
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    Loading profile details...
                                  </div>
                                </div>
                              )}

                              {!activeProfile && !activeProfileLoading && (
                                <div className="text-sm text-muted-foreground">
                                  Profile details are not available yet.
                                </div>
                              )}

                              {activeProfile && (
                                <>
                              {/* Quick Stats Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                                  <Target className="h-5 w-5 text-primary mb-2" />
                                  <p className="text-2xl font-bold">{activeProfile.averageScore}%</p>
                                  <p className="text-xs text-muted-foreground">Avg Score</p>
                                </div>
                                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                                  <CheckCircle className="h-5 w-5 text-success mb-2" />
                                  <p className="text-2xl font-bold">{activeProfile.completedCourses}</p>
                                  <p className="text-xs text-muted-foreground">Completed</p>
                                </div>
                                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                                  <Clock className="h-5 w-5 text-warning mb-2" />
                                  <p className="text-2xl font-bold">{activeProfile.totalHours}h</p>
                                  <p className="text-xs text-muted-foreground">Study Time</p>
                                </div>
                                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                                  <Award className="h-5 w-5 text-accent mb-2" />
                                  <p className="text-2xl font-bold">{activeProfile.badges}</p>
                                  <p className="text-xs text-muted-foreground">Badges</p>
                                </div>
                              </div>

                              {/* Tabs for detailed information */}
                              <Tabs defaultValue="journey" className="w-full flex flex-col flex-1 min-h-0">
                                <TabsList className="grid w-full grid-cols-3">
                                  <TabsTrigger value="journey">Learning Journey</TabsTrigger>
                                  <TabsTrigger value="performance">Performance</TabsTrigger>
                                  <TabsTrigger value="activity">Activity</TabsTrigger>
                                </TabsList>

                              <TabsContent value="journey" className="space-y-4 mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
                                <div>
                                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-primary" />
                                    Current Courses
                                  </h4>
                                  <div className="space-y-3">
                                    {activeProfileCurrentCourses.map((course: any) => (
                                      <div key={course.id} className="p-4 rounded-lg bg-background/50 border border-border">
                                          <div className="flex items-center justify-between mb-2">
                                          <p className="font-medium">{course.name}</p>
                                          <Badge variant="outline">{course.grade}%</Badge>
                                        </div>
                                        <Progress value={course.progress} className="h-2" />
                                        <p className="text-xs text-muted-foreground mt-1">{course.progress}% Complete</p>
                                      </div>
                                    ))}
                                    {activeProfileCurrentCourses.length === 0 && (
                                      <div className="text-sm text-muted-foreground">No active courses</div>
                                    )}
                                  </div>
                                </div>

                                {activeProfileCompletedCourses.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-success" />
                                      Completed Courses
                                    </h4>
                                    <div className="space-y-3">
                                      {activeProfileCompletedCourses.map((course: any) => (
                                        <div key={course.id} className="p-4 rounded-lg bg-success/10 border border-success/20">
                                            <div className="flex items-center justify-between">
                                              <div className="flex-1">
                                              <p className="font-medium">{course.name}</p>
                                              <p className="text-xs text-muted-foreground">Completed {course.completedDate}</p>
                                              </div>
                                              <div className="flex items-center gap-2">
                                              <Badge className="bg-success">{course.grade}%</Badge>
                                                {course.certificate && (
                                                  <Award className="h-4 w-4 text-warning" />
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </TabsContent>

                              <TabsContent value="performance" className="space-y-4 mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                      <TrendingUp className="h-4 w-4 text-primary" />
                                      <span className="text-sm font-medium">Overall Progress</span>
                                    </div>
                                    <Progress value={activeProfile.progress} className="h-2 mb-2" />
                                    <p className="text-2xl font-bold">{activeProfile.progress}%</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Star className="h-4 w-4 text-warning" />
                                      <span className="text-sm font-medium">Engagement</span>
                                    </div>
                                    <Progress value={activeProfile.engagement} className="h-2 mb-2" />
                                    <p className="text-2xl font-bold">{activeProfile.engagement}%</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-3">Recent Quiz Results</h4>
                                  <div className="space-y-2">
                                    {activeProfileQuizResults.map((quiz: any, index: number) => (
                                      <div key={index} className="p-3 rounded-lg bg-background/50 border border-border flex items-center justify-between">
                                          <div>
                                          <p className="font-medium text-sm">{quiz.quiz}</p>
                                          <p className="text-xs text-muted-foreground">{quiz.date}</p>
                                          </div>
                                        <Badge variant={quiz.score >= 80 ? "default" : "outline"}>
                                            {quiz.score}%
                                          </Badge>
                                        </div>
                                    ))}
                                    {activeProfileQuizResults.length === 0 && (
                                      <div className="text-sm text-muted-foreground">No quiz results yet</div>
                                    )}
                                  </div>
                                </div>

                                <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold">Performance Summary</h4>
                                    <SectionHelp
                                      title="Performance Summary"
                                      items={[
                                        {
                                          label: "Strengths",
                                          description:
                                            "Quiz Performance (avg score >= 85), Course Completion (completed courses > 0), Consistency (engagement >= 70).",
                                          className: "text-success",
                                        },
                                        {
                                          label: "Areas to Improve",
                                          description:
                                            "Quiz Performance (0 < avg score < 70), Low Engagement (engagement < 50), Course Progress (avg progress < 50).",
                                          className: "text-destructive",
                                        },
                                      ]}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Strengths</p>
                                      <p className="font-medium">
                                        {activeProfile.strengths?.length
                                          ? activeProfile.strengths.join(", ")
                                          : "No strengths detected"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Areas to Improve</p>
                                      <p className="font-medium">
                                        {activeProfile.risks?.length
                                          ? activeProfile.risks.join(", ")
                                          : "No risks detected"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="activity" className="space-y-4 mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Clock className="h-4 w-4 text-warning" />
                                      <span className="text-sm font-medium">Last Activity</span>
                                    </div>
                                    <p className="text-xl font-bold">{activeProfile.lastActivity}</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                      <TrendingUp className="h-4 w-4 text-success" />
                                      <span className="text-sm font-medium">Current Streak</span>
                                    </div>
                                    <p className="text-xl font-bold">{activeProfile.streak} days</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-3">Engagement Metrics</h4>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">Total Study Hours</span>
                                      <span className="font-bold">{activeProfile.totalHours}h</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">Enrolled Since</span>
                                      <span className="font-medium">{activeProfile.enrolledDate}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">Active Courses</span>
                                      <span className="font-medium">{activeProfileCurrentCourses.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">Badges Earned</span>
                                      <span className="font-medium">{activeProfile.badges}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-sm">Activity Status</h4>
                                    <SectionHelp
                                      title="Activity Status"
                                      items={[
                                        {
                                          label: "Engagement",
                                          description:
                                            "Based on last activity recency: <= 7 days (100), <= 14 (70), <= 30 (50), > 30 or none (30).",
                                        },
                                        {
                                          label: "Status",
                                          description:
                                            "Highly Engaged if engagement >= 70, otherwise Needs Attention.",
                                        },
                                      ]}
                                    />
                                  </div>
                                  <Badge className={activeProfile.engagement >= 70 ? "status-badge-published" : "status-badge-draft"}>
                                    {activeProfile.engagement >= 70 ? "Highly Engaged" : "Needs Attention"}
                                  </Badge>
                                </div>
                              </TabsContent>
                            </Tabs>
                            </>
                            )}
                          </div>
                          {activeProfile && (
                          <div className="mt-auto border-t border-border bg-background/95 backdrop-blur">
                            <div className="flex flex-col gap-2 p-4">
                              <Button className="w-full gap-2" onClick={() => {
                              setIsMessageStudentDialogOpen(true);
                            }}>
                                <Mail className="h-4 w-4" />
                                Send Message
                              </Button>
                              
                            {activeProfile.enabled ? (
                              <Button
                                className="w-full gap-2"
                                variant="destructive"
                                onClick={async () => {
                                  try {
                                    const toastInstance = toast({
                                      title: "Disabling user",
                                      description: (
                                        <span className="inline-flex items-center gap-2">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Updating access...
                                        </span>
                                      ),
                                    });
                                    const result = await handleDisableUser(activeProfile.email, false);
                                    if (result) {
                                        // Update local state immediately
                                        setSelectedStudent({ ...activeProfile, enabled: false });
                                      setProfileCache((prev) => ({
                                        ...prev,
                                        [activeProfile.id]: { ...activeProfile, enabled: false },
                                      }));
                                      setStudents((prev) =>
                                        prev.map((student) =>
                                          student.id === activeProfile.id
                                            ? { ...student, enabled: false }
                                            : student
                                        )
                                      );
                                      // Refresh the full list
                                      fetchStudents();
                                      setIsSheetOpen(false);
                                      toastInstance.update({
                                        id: toastInstance.id,
                                        title: "User disabled",
                                        description: `${activeProfile.email} can no longer log in.`,
                                      });
                                    } else {
                                      console.error("disableStudent failed:", result);
                                      toastInstance.update({
                                        id: toastInstance.id,
                                        title: "Disable failed",
                                        description: "Unable to update user status.",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (err) {
                                    const message =
                                      err instanceof Error ? err.message : "Unable to update user status.";
                                    toast({
                                      title: "Disable failed",
                                      description: message,
                                variant: "destructive",
                              });
                            }
                          }}
                              >
                                <UserX className="h-4 w-4" />
                                Disable User
                                </Button>
                              ) : (
                              <Button
                                className="w-full gap-2 bg-primary hover:bg-primary/90"
                                variant="default"
                                onClick={async () => {
                                  try {
                                    const toastInstance = toast({
                                      title: "Enabling user",
                                      description: (
                                        <span className="inline-flex items-center gap-2">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Restoring access...
                                        </span>
                                      ),
                                    });
                                    const result = handleDisableUser(activeProfile.email, true);
                                    if (result) {
                                        // Update local state immediately
                                        setSelectedStudent({ ...activeProfile, enabled: true });
                                      setProfileCache((prev) => ({
                                        ...prev,
                                        [activeProfile.id]: { ...activeProfile, enabled: true },
                                      }));
                                      setStudents((prev) =>
                                        prev.map((student) =>
                                          student.id === activeProfile.id
                                            ? { ...student, enabled: true }
                                            : student
                                        )
                                      );
                                      // Refresh the full list
                                      fetchStudents();
                                      setIsSheetOpen(false);
                                      toastInstance.update({
                                        id: toastInstance.id,
                                        title: "User enabled",
                                        description: `${activeProfile.email} can log in again.`,
                                      });
                                    } else {
                                      console.error("enableStudent failed:", result);
                                      toastInstance.update({
                                        id: toastInstance.id,
                                        title: "Enable failed",
                                        description: "Unable to update user status.",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (err) {
                                    const message =
                                      err instanceof Error ? err.message : "Unable to update user status.";
                                    toast({
                                      title: "Enable failed",
                                      description: message,
                                      variant: "destructive",
                                    });
                                }
                              }}
                              >
                                <UserCheck className="h-4 w-4" />
                                Enable User
                              </Button>
                            )}
                            </div>
                          </div>
                          )}
                          </>
                        )}
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredStudents.length / itemsPerPage)}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              itemsPerPage={itemsPerPage}
              totalItems={filteredStudents.length}
            />
            </>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Students;
