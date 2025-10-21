import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { COGNITO_CLIENT_ID, COGNITO_REGION } from "@/env";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokens, setTokens] = useState(null);
  const [challenge, setChallenge] = useState<null | {
    session: string;
    username: string;
  }>(null);
  const [newPassword, setNewPassword] = useState("");

  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  React.useEffect(() => {
    // Only redirect if auth check is complete and user is authenticated
    if (!isLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const client = new CognitoIdentityProviderClient({
        region: COGNITO_REGION,
      });
      const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });
      const response = await client.send(command);
      if (response.AuthenticationResult) {
        setTokens(response.AuthenticationResult);
        login({
          IdToken: response.AuthenticationResult.IdToken!,
          AccessToken: response.AuthenticationResult.AccessToken!,
          RefreshToken: response.AuthenticationResult.RefreshToken,
        });
        // Redirect handled by useEffect
      } else if (response.ChallengeName === "NEW_PASSWORD_REQUIRED") {
        setChallenge({ session: response.Session!, username: email });
      } else {
        setError("Authentication failed. Please check your credentials.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An error occurred during login.");
      } else {
        setError("An error occurred during login.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setLoading(true);
    setError("");
    try {
      const client = new CognitoIdentityProviderClient({
        region: COGNITO_REGION,
      });
      const command = new RespondToAuthChallengeCommand({
        ClientId: COGNITO_CLIENT_ID,
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        Session: challenge.session,
        ChallengeResponses: {
          USERNAME: challenge.username,
          NEW_PASSWORD: newPassword,
        },
      });
      const response = await client.send(command);
      if (response.AuthenticationResult) {
        setTokens(response.AuthenticationResult);
        setChallenge(null);
        setNewPassword("");
        login({
          IdToken: response.AuthenticationResult.IdToken!,
          AccessToken: response.AuthenticationResult.AccessToken!,
          RefreshToken: response.AuthenticationResult.RefreshToken,
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(
          err.message || "An error occurred while setting new password."
        );
      } else {
        setError("An error occurred while setting new password.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg border border-border">
        <CardHeader className="flex flex-col items-center gap-2">
          <CardTitle className="text-2xl font-bold">
            Sign in to Shalom
          </CardTitle>
          <CardDescription className="text-center">
            {challenge
              ? "Set a new password to continue"
              : "Enter your email and password"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {challenge ? (
            <form className="space-y-4" onSubmit={handleNewPassword}>
              <Input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
              />
              {error && (
                <div className="text-sm text-destructive text-center">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                variant="default"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  "Set New Password"
                )}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
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
              />
              {error && (
                <div className="text-sm text-destructive text-center">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                variant="default"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
