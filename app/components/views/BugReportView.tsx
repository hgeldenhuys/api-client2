import React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import {
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Info,
  Monitor,
  Globe,
  Clock,
} from "lucide-react";
import { cn } from "~/utils/cn";
import { useApiClientConfig } from "~/components/ConfigProvider";
import { BugReport } from "~/types/config";

interface FormField {
  name: keyof Omit<BugReport, "systemInfo">;
  label: string;
  placeholder: string;
  required: boolean;
  type: "input" | "textarea";
}

const FORM_FIELDS: FormField[] = [
  {
    name: "title",
    label: "Title",
    placeholder: "Brief description of your feedback",
    required: true,
    type: "input",
  },
  {
    name: "description",
    label: "Description",
    placeholder:
      "Detailed description of your bug report, feature idea, or question",
    required: true,
    type: "textarea",
  },
  {
    name: "stepsToReproduce",
    label: "Steps to Reproduce (for bugs)",
    placeholder:
      "1. Go to...\n2. Click on...\n3. See error\n\n(Leave blank for ideas/questions)",
    required: false,
    type: "textarea",
  },
  {
    name: "expectedResult",
    label: "Expected Behavior/Outcome (for bugs/ideas)",
    placeholder: "What you expected to happen or would like to see",
    required: false,
    type: "textarea",
  },
  {
    name: "actualResult",
    label: "Actual Behavior (for bugs)",
    placeholder: "What actually happened (Leave blank for ideas/questions)",
    required: false,
    type: "textarea",
  },
];

export function BugReportView() {
  const config = useApiClientConfig();
  const [formData, setFormData] = React.useState<Omit<BugReport, "systemInfo">>(
    {
      title: "",
      description: "",
      stepsToReproduce: "",
      expectedResult: "",
      actualResult: "",
    },
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle");

  const handleInputChange = (
    name: keyof Omit<BugReport, "systemInfo">,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getSystemInfo = () => {
    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  };

  const validateForm = () => {
    // Only title and description are required for feedback
    return formData.title.trim() !== "" && formData.description.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setSubmitStatus("error");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const bugReport: BugReport = {
        ...formData,
        systemInfo: getSystemInfo(),
      };

      if (config.bugReporting.onSubmitBug) {
        await config.bugReporting.onSubmitBug(bugReport);
      }

      setSubmitStatus("success");

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          title: "",
          description: "",
          stepsToReproduce: "",
          expectedResult: "",
          actualResult: "",
        });
        setSubmitStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Failed to submit bug report:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = validateForm();

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Submit Feedback</h1>
            <p className="text-muted-foreground">
              Help us improve the API Client by sharing bugs, ideas, or
              questions
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {submitStatus === "success" && (
          <Card className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Feedback submitted successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Thank you for helping us improve the API Client.
                </p>
              </div>
            </div>
          </Card>
        )}

        {submitStatus === "error" && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  Please fill in all required fields
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Title and Description are required to submit feedback.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {FORM_FIELDS.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium mb-2">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    {field.type === "input" ? (
                      <Input
                        value={formData[field.name]}
                        onChange={(e) =>
                          handleInputChange(field.name, e.target.value)
                        }
                        placeholder={field.placeholder}
                        className={cn(
                          field.required &&
                            !formData[field.name].trim() &&
                            submitStatus === "error"
                            ? "border-red-300 focus:border-red-500"
                            : "",
                        )}
                      />
                    ) : (
                      <textarea
                        value={formData[field.name]}
                        onChange={(e) =>
                          handleInputChange(field.name, e.target.value)
                        }
                        placeholder={field.placeholder}
                        rows={4}
                        className={cn(
                          "w-full px-3 py-2 border border-input bg-background rounded-md text-sm",
                          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                          "disabled:cursor-not-allowed disabled:opacity-50 resize-vertical min-h-[100px]",
                          field.required &&
                            !formData[field.name].trim() &&
                            submitStatus === "error"
                            ? "border-red-300 focus:border-red-500"
                            : "",
                        )}
                      />
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>
                      System information will be included automatically
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className="min-w-[120px]"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent"></div>
                        Submitting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Submit Feedback
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* System Info Preview */}
          <div className="space-y-6">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                System Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Browser</p>
                    <p className="text-muted-foreground text-xs">
                      {navigator.userAgent.split(" ").slice(-2).join(" ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Viewport</p>
                    <p className="text-muted-foreground text-xs">
                      {window.innerWidth} × {window.innerHeight}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Timestamp</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Tips for Better Feedback</h3>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs">
                    🐛
                  </Badge>
                  <span>
                    <strong>Bug Reports:</strong> Include steps to reproduce
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs">
                    💡
                  </Badge>
                  <span>
                    <strong>Ideas:</strong> Describe the problem and your
                    solution
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs">
                    ❓
                  </Badge>
                  <span>
                    <strong>Questions:</strong> Be specific about what you need
                    help with
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs">
                    📷
                  </Badge>
                  <span>Screenshots and examples are always helpful</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
