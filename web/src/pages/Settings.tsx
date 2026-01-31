import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Shield, Palette, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/contexts/UserContext';
import { uploadProfilePic } from '@/services/userService';
import { getAvatarUri } from '@/utils/avatar';
import { useAuth } from "@/contexts/AuthContext";
import { validatePassword } from "@/utils/authUtils";
import courseService from "@/services/courseService";

const Settings = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const { toast } = useToast();

  const { user, updateUser } = useUser();
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const { changePassword, approveInstructor } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Instructor approvals
  const { getAllStudents } = courseService;
  const [students, setAllStudents] = useState([]);
  const [studentFilter, setStudentFilter] = useState("");
  const [approvingPerson, setApprovingPerson] = useState<string>(null);

  const filteredStudents = students.filter(student => {
    const search = studentFilter.toLowerCase();
    return (
      student.name?.toLowerCase().includes(search) ||
      student.email?.toLowerCase().includes(search)
    );
  });

  const handleApproveInstructor = async (uuid: string, name: string) => {
    setApprovingPerson(uuid);
    try {
      const response = await approveInstructor(uuid);
      toast({
        title: "Instructor Approved",
        description: `Instructor ${name} has been approved.`
      });
      const studentsData = await getAllStudents();
      setAllStudents(studentsData.students);
    } catch (error) {
      console.error("Error approving instructor:", error);
      toast({
        title: "Error",
        description: `Failed to approve instructor ${name}.`,
        variant: "destructive"
      });
    } finally {
      setApprovingPerson(null);
    }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      const studentsData = await getAllStudents();
      setAllStudents(studentsData.students);
    }
    if (user) {
      setName(user.name ?? ''); 
      setBio(user.bio ?? '');
      setLocation(user.location ?? ''); 
      setPhone(user.phone ?? ''); 
      setAvatarUrl(getAvatarUri(user.avatar_url));
      fetchStudents();
    }
  }, [user]);

  const handleSaveProfile = async () => {
    await updateUser(user!.uuid, {
      name,
      bio,
      location,
      phone,
    });
    toast({
      title: 'Profile Updated',
      description: 'Your profile has been saved successfully',
    });
  };

  const handleSaveNotifications = async () => {
    toast({
      title: "Profile Updated",
      description: "Your profile has been saved successfully"
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChangeAvatar = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Convert to Blob and upload
    const blob = new Blob([file], { type: file.type });
    let avatarIdStr;
    if (user?.avatar_url == null) {
      avatarIdStr = "0.png";
    } else {
      avatarIdStr = user.avatar_url.split("_avatar")[1] || "0.png";
    }
    const avatarId = avatarIdStr.substring(0, avatarIdStr.length - 4);
    await uploadProfilePic(
      `${user?.email}_avatar${parseInt(avatarId) + 1}.png`,
      blob
    );
    await updateUser(user?.uuid || "", {
      avatar_url: `${user?.email}_avatar${parseInt(avatarId) + 1}.png`,
    });
    toast({
      title: 'Avatar Updated',
      description: 'Your profile picture has been updated successfully',
    });
  };

  const handleChangePassword = async () => {
    const currentPasswordInput = document.getElementById('current-password') as HTMLInputElement;
    const newPasswordInput = document.getElementById('new-password') as HTMLInputElement;
    const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement;
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (!validatePassword(newPassword)) {
      toast({
        title: 'Error',
        description: 'New password does not meet requirements.',
        variant: 'destructive',
      });
      return;
    }
    if (!validatePassword(confirmPassword)) {
      toast({
        title: 'Error',
        description: 'Confirm password does not meet requirements.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'New password and confirm password do not match',
        variant: 'destructive',
      });
      return;
    }
    try {
      await changePassword(user!.email, currentPassword, newPassword);
      toast({
        title: 'Success',
        description: 'Your password has been changed successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change password. Please check your current password.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className={`grid w-full md:w-[800px] 
            ${user.uuid === "550e8400-e29b-41d4-a716-446655440201" ? "grid-cols-4" : "grid-cols-3"}`
            }>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            {user.uuid === "550e8400-e29b-41d4-a716-446655440201" && (
              <TabsTrigger value="approval" className="gap-2">
                <Shield className="h-4 w-4" />
                Instructor Approvals
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6 gradient-card border-border space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <img src={avatarUrl} />
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" onClick={handleChangeAvatar}>
                    Change Avatar
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleAvatarFileChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="first-name">Name</Label>
                  <Input
                    id="first-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile}>Save Changes</Button>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6 gradient-card border-border space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">Email Notifications</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">New student enrollments</p>
                      <p className="text-sm text-muted-foreground">Get notified when students enroll in your courses</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Assignment submissions</p>
                      <p className="text-sm text-muted-foreground">Receive alerts for new assignment submissions</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Student messages</p>
                      <p className="text-sm text-muted-foreground">Get notified of new student messages</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              <Button onClick={handleSaveNotifications}>Save Preferences</Button>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="p-6 gradient-card border-border space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Password</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" className="mt-1" type="password" />
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      className="mt-1"
                      type="password"
                      onChange={e => setNewPassword(e.target.value)}
                      value={newPassword}
                    />
                    {newPassword && validatePassword(newPassword) && (
                      <p className="text-xs text-destructive mt-1">{validatePassword(newPassword)}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      className="mt-1"
                      type="password"
                      onChange={e => setConfirmPassword(e.target.value)}
                      value={confirmPassword}
                    />
                    {confirmPassword && validatePassword(confirmPassword) && (
                      <p className="text-xs text-destructive mt-1">{validatePassword(confirmPassword)}</p>
                    )}
                  </div>
                  <Button onClick={handleChangePassword}>Update Password</Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="approval" className="space-y-6">
            <Card className="p-6 gradient-card border-border space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Instructor Approvals
                </h3>
                <div className="mb-4">
                  <Input
                    type="text"
                    placeholder="Filter users by name or email"
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                  />
                </div>
                <div
                  style={{ maxHeight: '350px', overflowY: 'auto' }}
                  className="space-y-2 border rounded p-2 bg-background"
                >
                  {filteredStudents.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      No students found.
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <div
                        key={student.uuid+student.email}
                        className="flex items-center justify-between border-b last:border-b-0 pb-2 px-1"
                      >
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {student.email}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleApproveInstructor(student.id, student.name)}
                        >
                          {approvingPerson === student.id ? (
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          ) : (
                            'Approve'
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
