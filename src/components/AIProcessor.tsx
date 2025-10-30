import { useState } from "react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { ipcClient } from "../services/ipcClient";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  ArrowRight,
  Play,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface AIProcessorProps {
  videoPath: string;
  onProcessingComplete: (mutedVideoPath: string) => void;
}

type StepStatus = "pending" | "processing" | "complete" | "error";

interface StepData {
  status: StepStatus;
  output?: string;
  error?: string;
  result?: any;
}

export function AIProcessor({
  videoPath,
  onProcessingComplete,
}: AIProcessorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<StepData[]>([
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [tempFiles, setTempFiles] = useState<string[]>([]);
  const [mutedVideoPath, setMutedVideoPath] = useState<string | null>(null);

  const stepNames = [
    "Extract Audio",
    "Whisper Transcription",
    "Detect Filler Words",
    "Apply Muting",
  ];

  const updateStep = (stepIndex: number, updates: Partial<StepData>) => {
    setSteps((prev) =>
      prev.map((step, index) =>
        index === stepIndex ? { ...step, ...updates } : step
      )
    );
  };

  const canProceed = (stepIndex: number) => {
    return steps[stepIndex]?.status === "complete";
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleStartStep = async (stepIndex: number) => {
    if (isProcessing) return;

    setIsProcessing(true);
    updateStep(stepIndex, { status: "processing", error: undefined });

    try {
      switch (stepIndex) {
        case 0: {
          const audioPath = await ipcClient.extractAudio({ videoPath });
          updateStep(0, {
            status: "complete",
            output: `Audio extracted to: ${audioPath}`,
            result: audioPath,
          });
          setTempFiles((prev) => [...prev, audioPath]);
          break;
        }

        case 1: {
          const audioPath = steps[0].result;
          if (!audioPath) throw new Error("No audio path from step 1");

          const transcription = await ipcClient.whisperTranscription({
            audioPath,
          });
          console.log("Whisper transcription:", transcription);

          // Create detailed output showing word-level timestamps
          const sampleWords = transcription.words
            .slice(0, 5)
            .map(
              (w) =>
                `"${w.text}" (${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s)`
            )
            .join("\n");

          const output = `Transcribed ${
            transcription.words.length
          } words with timestamps:

Full text: "${transcription.text}"

Sample words with timestamps:
${sampleWords}
${
  transcription.words.length > 5
    ? `\n... and ${transcription.words.length - 5} more words`
    : ""
}`;

          updateStep(1, {
            status: "complete",
            output: output,
            result: transcription,
          });
          break;
        }

        case 2: {
          const transcription = steps[1].result;
          if (!transcription) throw new Error("No transcription from step 2");

          const intervals = await ipcClient.gptFillerDetection({
            text: transcription.text,
            words: transcription.words,
          });
          updateStep(2, {
            status: "complete",
            output: `Found ${intervals.length} filler words:\n${intervals
              .map((i) => `"${i.text}" at ${i.start.toFixed(1)}s`)
              .join("\n")}`,
            result: intervals,
          });
          break;
        }

        case 3: {
          const intervals = steps[2].result;
          if (!intervals) throw new Error("No filler intervals from step 3");

          const mutedPath = await ipcClient.applyMuting({
            videoPath,
            fillerIntervals: intervals,
          });
          setMutedVideoPath(mutedPath);
          updateStep(3, {
            status: "complete",
            output: `Muted video created: ${mutedPath}`,
            result: mutedPath,
          });
          onProcessingComplete(mutedPath);
          break;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      updateStep(stepIndex, {
        status: "error",
        error: errorMessage,
      });
      toast.error(`Step ${stepIndex + 1} failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    setCurrentStep(0);
    setSteps([
      { status: "pending" },
      { status: "pending" },
      { status: "pending" },
      { status: "pending" },
    ]);
    setMutedVideoPath(null);

    // Cleanup temp files
    if (tempFiles.length > 0) {
      await ipcClient.cleanupTempFiles({ filePaths: tempFiles });
      setTempFiles([]);
    }
    if (mutedVideoPath) {
      await ipcClient.cleanupTempFiles({ filePaths: [mutedVideoPath] });
    }
  };

  const renderStepIcon = (status: StepStatus) => {
    switch (status) {
      case "pending":
        return <Circle className="h-5 w-5 text-gray-500" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const renderStepContent = (stepIndex: number) => {
    const step = steps[stepIndex];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {renderStepIcon(step.status)}
          <h3 className="text-lg font-semibold text-white">
            {stepNames[stepIndex]}
          </h3>
        </div>

        {step.status === "pending" && (
          <div className="p-4 bg-gray-900 rounded border border-gray-700">
            <p className="text-gray-300 mb-4">
              {stepIndex === 0 && "Extract audio from video for processing"}
              {stepIndex === 1 && "Transcribe audio using OpenAI Whisper"}
              {stepIndex === 2 && "Analyze transcript to identify filler words"}
              {stepIndex === 3 &&
                "Apply muting to detected filler word intervals"}
            </p>
            <Button
              onClick={() => handleStartStep(stepIndex)}
              disabled={isProcessing}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Start {stepNames[stepIndex]}
            </Button>
          </div>
        )}

        {step.status === "processing" && (
          <div className="p-4 bg-blue-900/20 border border-blue-700 rounded">
            <p className="text-blue-300">
              Processing {stepNames[stepIndex]}...
            </p>
          </div>
        )}

        {step.status === "complete" && step.output && (
          <div className="p-4 bg-green-900/20 border border-green-700 rounded">
            <h4 className="text-green-300 font-medium mb-2">Output:</h4>
            <pre className="text-green-200 text-sm whitespace-pre-wrap font-mono">
              {step.output}
            </pre>
          </div>
        )}

        {step.status === "error" && step.error && (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded">
            <h4 className="text-red-300 font-medium mb-2">Error:</h4>
            <p className="text-red-200 text-sm">{step.error}</p>
            <Button
              onClick={() => handleStartStep(stepIndex)}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border-t border-gray-700 p-4 bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">
          AI Filler Word Removal
        </h2>
        {steps.every((s) => s.status === "pending") && (
          <Button onClick={handleReset} variant="outline">
            Reset
          </Button>
        )}
      </div>

      <Tabs
        value={currentStep.toString()}
        onValueChange={(value) => setCurrentStep(parseInt(value))}
      >
        <TabsList className="grid w-full grid-cols-4">
          {stepNames.map((name, index) => (
            <TabsTrigger
              key={index}
              value={index.toString()}
              className="flex items-center gap-2"
            >
              {renderStepIcon(steps[index].status)}
              <span className="hidden sm:inline">{name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {stepNames.map((_, index) => (
          <TabsContent key={index} value={index.toString()}>
            {renderStepContent(index)}
          </TabsContent>
        ))}
      </Tabs>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
        <div className="text-sm text-gray-400">
          Step {currentStep + 1} of {stepNames.length}
        </div>

        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
          )}

          {currentStep < 3 && canProceed(currentStep) && (
            <Button onClick={handleNextStep} size="sm">
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* API Key Notice */}
      {steps.every((s) => s.status === "pending") && (
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
          <p className="text-sm text-blue-300">
            Make sure OPENAI_API_KEY is set in your environment variables.
          </p>
        </div>
      )}
    </div>
  );
}
