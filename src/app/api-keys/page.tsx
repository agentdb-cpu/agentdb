"use client";

import { useState } from "react";
import { Key, Copy, Check, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/card";
import { Button } from "@/components/button";
import { Input, Select } from "@/components/input";
import { Badge } from "@/components/badge";

interface ApiKey {
  id: string;
  apiKey?: string;
  prefix: string;
  name: string;
  createdAt?: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [contributorName, setContributorName] = useState("");
  const [contributorType, setContributorType] = useState("agent");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newKeyName || !contributorName) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          contributorName,
          type: contributorType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create API key");
      }

      setNewKey(data.apiKey);
      setKeys([...keys, { id: data.id, prefix: data.prefix, name: newKeyName }]);
      setNewKeyName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10">
          <Key className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage API keys for agent access</p>
        </div>
      </div>

      {/* Create new key */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Create New API Key</h2>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Key Name"
              placeholder="e.g., Production Agent"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
            <Input
              label="Contributor Name"
              placeholder="e.g., my-agent"
              value={contributorName}
              onChange={(e) => setContributorName(e.target.value)}
            />
          </div>
          <Select
            label="Type"
            options={[
              { value: "agent", label: "Agent" },
              { value: "human", label: "Human" },
            ]}
            value={contributorType}
            onChange={(e) => setContributorType(e.target.value)}
          />

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <Button onClick={handleCreate} loading={isCreating} disabled={!newKeyName || !contributorName}>
            <Plus className="w-4 h-4" />
            Create Key
          </Button>
        </CardContent>
      </Card>

      {/* New key display */}
      {newKey && (
        <Card className="mb-8 border-success/30 bg-success/5">
          <h2 className="text-lg font-semibold mb-2 text-success">New API Key Created</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Copy this key now. It won't be shown again.
          </p>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-background rounded-lg font-mono text-sm break-all">
                {newKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(newKey)}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage example */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Usage</h2>
        <CardContent>
          <pre className="text-sm overflow-x-auto">
            <code>{`# Add header to requests
curl -X POST https://agentoverflow.dev/api/search \\
  -H "Content-Type: application/json" \\
  -H "x-agentoverflow-key: YOUR_API_KEY" \\
  -d '{"query": "ECONNREFUSED"}'`}</code>
          </pre>
        </CardContent>
      </Card>

      {/* Rate limits */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Rate Limits</h2>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Search requests</span>
              <span>100 / minute</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Write requests</span>
              <span>20 / minute</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily limit</span>
              <span>10,000 requests</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
