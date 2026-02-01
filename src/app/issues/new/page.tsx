"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/card";
import { Button } from "@/components/button";
import { Input, Textarea, Select } from "@/components/input";
import { Badge } from "@/components/badge";
import { cn } from "@/lib/utils";

const STACK_OPTIONS = [
  "solana", "anchor", "node", "python", "rust", "typescript",
  "react", "nextjs", "postgres", "redis", "docker", "aws", "llm", "openai", "anthropic",
];

const ENV_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "ci", label: "CI/CD" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
];

export default function NewIssuePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    errorType: "",
    errorMessage: "",
    errorCode: "",
    stackTrace: "",
    logs: "",
    stack: [] as string[],
    runtime: "",
    os: "",
    environment: "local",
    dependencies: "",
  });

  const toggleStack = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      stack: prev.stack.includes(tag)
        ? prev.stack.filter((t) => t !== tag)
        : [...prev.stack, tag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Parse dependencies
      let deps: Record<string, string> = {};
      if (formData.dependencies.trim()) {
        formData.dependencies.split("\n").forEach((line) => {
          const [pkg, ver] = line.split(/[@:=]/).map((s) => s.trim());
          if (pkg && ver) deps[pkg] = ver;
        });
      }

      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          errorType: formData.errorType || undefined,
          errorMessage: formData.errorMessage || undefined,
          errorCode: formData.errorCode || undefined,
          stackTrace: formData.stackTrace || undefined,
          logs: formData.logs || undefined,
          stack: formData.stack,
          runtime: formData.runtime || undefined,
          os: formData.os || undefined,
          environment: formData.environment,
          dependencies: deps,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create issue");
      }

      router.push(`/issues/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to search
      </Link>

      <h1 className="text-2xl font-bold mb-2">Post a New Issue</h1>
      <p className="text-muted-foreground mb-8">
        Describe your problem clearly so others can help find a solution.
      </p>

      {error && (
        <div className="flex items-center gap-2 p-4 mb-6 bg-error/10 border border-error/20 rounded-lg text-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <Input
          label="Title *"
          placeholder="e.g., PostgreSQL connection refused on localhost"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        {/* Error Signature */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Error Signature</h3>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Error Type"
                placeholder="e.g., ECONNREFUSED, TypeError"
                value={formData.errorType}
                onChange={(e) => setFormData({ ...formData, errorType: e.target.value })}
              />
              <Input
                label="Error Code"
                placeholder="e.g., E001, 42601"
                value={formData.errorCode}
                onChange={(e) => setFormData({ ...formData, errorCode: e.target.value })}
              />
            </div>
            <Textarea
              label="Error Message"
              placeholder="The error message you received"
              value={formData.errorMessage}
              onChange={(e) => setFormData({ ...formData, errorMessage: e.target.value })}
              className="min-h-[80px]"
            />
          </CardContent>
        </Card>

        {/* Stack / Tags */}
        <div>
          <label className="text-sm font-medium mb-2 block">Stack / Technology</label>
          <div className="flex flex-wrap gap-2">
            {STACK_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleStack(tag)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                  formData.stack.includes(tag)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          placeholder="Describe what you were trying to do and what happened"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="min-h-[100px]"
        />

        {/* Stack Trace */}
        <Textarea
          label="Stack Trace"
          placeholder="Paste the full stack trace here"
          value={formData.stackTrace}
          onChange={(e) => setFormData({ ...formData, stackTrace: e.target.value })}
          className="min-h-[150px]"
        />

        {/* Logs */}
        <Textarea
          label="Relevant Logs"
          placeholder="Any relevant log output"
          value={formData.logs}
          onChange={(e) => setFormData({ ...formData, logs: e.target.value })}
        />

        {/* Environment */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Environment</h3>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Runtime"
                placeholder="e.g., node@22.0.0, python@3.12"
                value={formData.runtime}
                onChange={(e) => setFormData({ ...formData, runtime: e.target.value })}
              />
              <Input
                label="OS"
                placeholder="e.g., darwin@24.0.0, linux@5.15"
                value={formData.os}
                onChange={(e) => setFormData({ ...formData, os: e.target.value })}
              />
            </div>
            <Select
              label="Environment"
              options={ENV_OPTIONS}
              value={formData.environment}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
            />
            <Textarea
              label="Dependencies"
              placeholder="One per line: package@version or package: version"
              hint="e.g., pg@8.11.0, prisma@6.2.0"
              value={formData.dependencies}
              onChange={(e) => setFormData({ ...formData, dependencies: e.target.value })}
              className="min-h-[80px]"
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link href="/">
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={isSubmitting}>
            Post Issue
          </Button>
        </div>
      </form>
    </div>
  );
}
