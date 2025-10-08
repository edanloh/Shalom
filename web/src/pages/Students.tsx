import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, Filter, Mail, MoreVertical, TrendingUp, BookOpen, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Colors } from "../constants";

const Students = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const students = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      enrolledDate: "2024-01-15",
      progress: 78,
      lastActivity: "2 hours ago",
      engagement: 92,
      coursesEnrolled: 3
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "m.chen@email.com",
      enrolledDate: "2024-02-03",
      progress: 45,
      lastActivity: "1 day ago",
      engagement: 67,
      coursesEnrolled: 2
    },
    {
      id: 3,
      name: "Emma Wilson",
      email: "emma.w@email.com",
      enrolledDate: "2024-01-28",
      progress: 92,
      lastActivity: "30 mins ago",
      engagement: 95,
      coursesEnrolled: 4
    },
    {
      id: 4,
      name: "James Rodriguez",
      email: "james.r@email.com",
      enrolledDate: "2024-03-10",
      progress: 23,
      lastActivity: "3 days ago",
      engagement: 45,
      coursesEnrolled: 1
    }
  ];

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEngagementColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "destructive";
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
          
          <Button className="gap-2">
            <Mail className="h-4 w-4" />
            Message All
          </Button>
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
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </Card>

        <Card className="gradient-card border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Enrolled Date</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
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
                  <TableCell className="text-muted-foreground">{student.enrolledDate}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{student.progress}%</span>
                      </div>
                      <div 
                        className="h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: Colors.gray200 }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${student.progress}%`,
                            background: `linear-gradient(90deg, ${Colors.purple400} 0%, ${Colors.purple600} 100%)`,
                            boxShadow: `0 2px 8px ${Colors.purple400}40`,
                          }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getEngagementColor(student.engagement) as any}>
                      {student.engagement}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{student.lastActivity}</TableCell>
                  <TableCell className="text-right">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedStudent(student)}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-md">
                        <SheetHeader>
                          <SheetTitle>Student Profile</SheetTitle>
                        </SheetHeader>
                        {selectedStudent && (
                          <div className="space-y-6 mt-6">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-16 w-16">
                                <AvatarFallback className="text-lg">
                                  {selectedStudent.name.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-lg text-foreground">{selectedStudent.name}</h3>
                                <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="p-4 rounded-lg bg-background/50">
                                <div className="flex items-center gap-2 text-primary mb-2">
                                  <TrendingUp className="h-4 w-4" />
                                  <span className="font-medium">Progress</span>
                                </div>
                                <div 
                                  className="h-2 rounded-full overflow-hidden mb-2"
                                  style={{ backgroundColor: Colors.gray200 }}
                                >
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${selectedStudent.progress}%`,
                                      background: `linear-gradient(90deg, ${Colors.purple400} 0%, ${Colors.purple600} 100%)`,
                                      boxShadow: `0 2px 8px ${Colors.purple400}40`,
                                    }}
                                  />
                                </div>
                                <p className="text-2xl font-bold text-foreground">{selectedStudent.progress}%</p>
                              </div>

                              <div className="p-4 rounded-lg bg-background/50">
                                <div className="flex items-center gap-2 text-accent mb-2">
                                  <BookOpen className="h-4 w-4" />
                                  <span className="font-medium">Courses Enrolled</span>
                                </div>
                                <p className="text-2xl font-bold text-foreground">{selectedStudent.coursesEnrolled}</p>
                              </div>

                              <div className="p-4 rounded-lg bg-background/50">
                                <div className="flex items-center gap-2 text-warning mb-2">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">Last Activity</span>
                                </div>
                                <p className="text-foreground">{selectedStudent.lastActivity}</p>
                              </div>
                            </div>

                            <Button className="w-full gap-2">
                              <Mail className="h-4 w-4" />
                              Send Message
                            </Button>
                          </div>
                        )}
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
};

export default Students;
