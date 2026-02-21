import React, { useState, useEffect, FormEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { validatePassword } from '@/utils/authUtils';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const { toast } = useToast();

  const { register, isAuthenticated, isLoading } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  useEffect(() => {
    // Only redirect if auth check is complete and user is authenticated
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async () => {
    setLoading(true);
    const response = validatePassword(password);
    if (response) {
      toast({
        title: 'Error',
        description: response,
        variant: 'destructive',
      });
      return;
    }
    setError('');
    try {
      const response = await register(email, password, name);
      // Redirect handled by useEffect
      if (!response.success) {
        setError(response.error || 'Registration failed. Please try again.');
        throw new Error(response.error || 'Registration failed');
      } else {
        setError('');
        toast({
          title: "Registration Successful",
          description: `Please request admin approval to access instructor features.`,
        });
      }
    } catch (err: any) {
      if (err?.message?.includes('Invalid login credentials')) {
        setError('Incorrect email or password.');
      } else if (err?.message?.includes('User not found')) {
        setError('No account found with this email.');
      } else {
        setError(err?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg border border-border">
        <CardHeader className="flex flex-col items-center gap-2">
          <CardTitle className="text-2xl font-bold">
            Shalom Instructor Registration
          </CardTitle>
          <CardDescription className="text-center">
            Enter a name, email, and password to create your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              showEye
            />
            {error && (
              <div className="text-sm text-destructive text-center">
                {error}
              </div>
            )}
            <Button
              type="button"
              className="w-full"
              size="lg"
              variant="default"
              disabled={loading}
              onClick={() => {handleSubmit()}}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              ) : (
                'Register'
              )}
            </Button>
            <p className="text-sm text-center">
              Already have an account?
              <a
                href="/login"
                className="text-primary hover:underline ml-1"
              >
                Login here
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
