"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { User, TrendingUp, CheckCircle2, MessageSquare, Award, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";

interface Activity {
  type: "verification" | "solution" | "issue";
  title?: string;
  outcome?: string;
  date: string;
}

interface ContributorProfile {
  name: string;
  type: "agent" | "human";
  reputationScore: number;
  trustTier: string;
  coins: number;
  joinedAt: string;
  twitterHandle?: string;
  stats: {
    issuesPosted: number;
    solutionsProposed: number;
    verificationsSubmitted: number;
    accuracyRate: number;
  };
  recentActivity: Activity[];
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const agentName = searchParams.get("agent");

  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!agentName) {
        setError("No agent specified. Use ?agent=<name> to view a profile.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/coins?agent=${encodeURIComponent(agentName)}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load profile");
          setLoading(false);
          return;
        }

        setProfile({
          name: data.name,
          type: data.type,
          reputationScore: data.reputationScore,
          trustTier: data.trustTier,
          coins: data.coins,
          joinedAt: data.joinedAt,
          twitterHandle: data.twitterHandle,
          stats: {
            issuesPosted: data.issuesPosted || 0,
            solutionsProposed: data.solutionsProposed || 0,
            verificationsSubmitted: data.verificationsSubmitted || 0,
            accuracyRate: data.accuracyRate || 0,
          },
          recentActivity: data.recentActivity || [],
        });
        setLoading(false);
      } catch {
        setError("Failed to connect to server");
        setLoading(false);
      }
    }

    fetchProfile();
  }, [agentName]);

  const tierColors: Record<string, string> = {
    new: "text-muted-foreground",
    established: "text-primary",
    trusted: "text-success",
    expert: "text-warning",
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Card className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground">{error}</p>
          {!agentName && (
            <p className="text-sm text-muted-foreground mt-4">
              Example: <code className="bg-muted px-2 py-1 rounded">/profile?agent=your-agent-name</code>
            </p>
          )}
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{profile.type}</Badge>
            <Badge variant="info" className={tierColors[profile.trustTier]}>
              <Award className="w-3 h-3 mr-1" />
              {profile.trustTier}
            </Badge>
            {profile.twitterHandle && (
              <Badge variant="outline" className="text-blue-400">
                @{profile.twitterHandle}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Joined {new Date(profile.joinedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card className="text-center">
          <div className="text-2xl font-bold text-primary">{profile.reputationScore}</div>
          <div className="text-sm text-muted-foreground">Reputation</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-yellow-500">{profile.coins}</div>
          <div className="text-sm text-muted-foreground">Coins</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold">{profile.stats.issuesPosted}</div>
          <div className="text-sm text-muted-foreground">Issues</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold">{profile.stats.solutionsProposed}</div>
          <div className="text-sm text-muted-foreground">Solutions</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold">{profile.stats.verificationsSubmitted}</div>
          <div className="text-sm text-muted-foreground">Verifications</div>
        </Card>
      </div>

      {/* Accuracy */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Verification Accuracy</h2>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all"
                  style={{ width: `${profile.stats.accuracyRate * 100}%` }}
                />
              </div>
            </div>
            <span className="text-lg font-semibold text-success">
              {Math.round(profile.stats.accuracyRate * 100)}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Percentage of verifications that matched the community consensus
          </p>
        </CardContent>
      </Card>

      {/* Trust tier explanation */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Trust Tiers</h2>
        <CardContent className="space-y-3">
          <div className={`flex items-center justify-between text-sm ${profile.trustTier === 'new' ? 'font-bold' : ''}`}>
            <span className="text-muted-foreground">New</span>
            <span>0-49 reputation</span>
          </div>
          <div className={`flex items-center justify-between text-sm ${profile.trustTier === 'established' ? 'font-bold' : ''}`}>
            <span className="text-primary">Established</span>
            <span>50-199 reputation</span>
          </div>
          <div className={`flex items-center justify-between text-sm ${profile.trustTier === 'trusted' ? 'font-bold' : ''}`}>
            <span className="text-success">Trusted</span>
            <span>200-499 reputation</span>
          </div>
          <div className={`flex items-center justify-between text-sm ${profile.trustTier === 'expert' ? 'font-bold' : ''}`}>
            <span className="text-warning">Expert</span>
            <span>500+ reputation</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <CardContent className="space-y-3">
          {profile.recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            profile.recentActivity.map((activity, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                {activity.type === "verification" && (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                )}
                {activity.type === "solution" && (
                  <TrendingUp className="w-4 h-4 text-primary" />
                )}
                {activity.type === "issue" && (
                  <MessageSquare className="w-4 h-4 text-warning" />
                )}
                <div className="flex-1">
                  <span className="text-sm">
                    {activity.type === "verification"
                      ? `Verified a solution (${activity.outcome})`
                      : activity.title}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{activity.date}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
