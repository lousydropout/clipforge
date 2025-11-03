import { useState } from "react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { ipcClient } from "../services/ipcClient";
import { useProjectStore } from "../store/useProjectStore";
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
  onSeekVideo: (time: number, duration: number) => void;
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
  onSeekVideo,
}: AIProcessorProps) {
  const { } = useProjectStore();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<StepData[]>([
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
    { status: "pending" },
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [tempFiles, setTempFiles] = useState<string[]>([]);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [showAllSentences, setShowAllSentences] = useState(false);

  const stepNames = [
    "Extract Audio",
    "Whisper Transcription", 
    "Segment Transcript",
    "AI Short Suggestions",
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
                `"${w.word}" (${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s)`
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
          if (!transcription) throw new Error("No transcription from step 1");

          const sentences = await ipcClient.segmentTranscript({ 
            words: transcription.words,
            fullText: transcription.text 
          });
          
          
          updateStep(2, {
            status: "complete",
            output: `Segmented into ${sentences.length} sentences`,
            result: sentences,
          });
          break;
        }

        case 3: {
          const sentences = steps[2].result;
          if (!sentences) throw new Error("No sentences from step 2");

          const suggestions = await ipcClient.gptShortSuggestions({ sentences });
          
          const highQualityCount = suggestions.filter(s => s.score >= 0.75).length;
          
          updateStep(3, {
            status: "complete",
            output: `Found ${highQualityCount} high-quality short clips (score >= 0.75) out of ${suggestions.length} total clips`,
            result: suggestions,
          });
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
    // Cleanup temp files
    if (tempFiles.length > 0) {
      await ipcClient.cleanupTempFiles({ filePaths: tempFiles });
      setTempFiles([]);
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
              {stepIndex === 0 && "Extract audio track for transcription and analysis."}
              {stepIndex === 1 && "Generate word-level transcript using Whisper."}
              {stepIndex === 2 && "Group words into sentence-like segments using punctuation or pauses > 0.5s."}
              {stepIndex === 3 && "Identify sentences that could make strong standalone short clips for social media."}
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

        {/* Step 0: Audio Player */}
        {stepIndex === 0 && step.status === "complete" && step.result && (
          <div className="mt-4">
            <h4 className="text-white font-medium mb-2">Audio Preview:</h4>
            <audio 
              controls 
              className="w-full"
              src={`file://${step.result}`}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Step 1: Full Transcript Option */}
        {stepIndex === 1 && step.status === "complete" && step.result && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullTranscript(!showFullTranscript)}
            >
              {showFullTranscript ? "Hide" : "Show"} Full Transcript
            </Button>
            {showFullTranscript && (
              <div className="mt-2 p-3 bg-gray-900 rounded border border-gray-700 max-h-64 overflow-y-auto">
                <p className="text-gray-300 text-sm whitespace-pre-wrap">
                  {step.result.text}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Sentences List */}
        {stepIndex === 2 && step.status === "complete" && step.result && (
          <div className="mt-4">
            <h4 className="text-white font-medium mb-2">Sentences:</h4>
            <div className="max-h-96 overflow-y-auto space-y-1">
              {(step.result as Array<{ text: string; start: number; end: number }>)
                .slice(0, showAllSentences ? undefined : 20)
                .map((sentence, idx) => (
                  <div key={idx} className="p-2 bg-gray-900 rounded border border-gray-700">
                    <p className="text-sm text-gray-300">{sentence.text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {sentence.start.toFixed(2)}s - {sentence.end.toFixed(2)}s
                    </p>
                  </div>
                ))}
            </div>
            {(step.result as Array<any>).length > 20 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowAllSentences(!showAllSentences)}
              >
                {showAllSentences ? "Show Less" : `Show All ${(step.result as Array<any>).length} Sentences`}
              </Button>
            )}
          </div>
        )}

        {/* Step 4: Suggestions list */}
        {stepIndex === 3 && step.status === "complete" && step.result && (
          <div className="mt-4">
            <h4 className="text-white font-medium mb-3">Suggested Shorts:</h4>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {(step.result as Array<{ clip: string[]; start: number; end: number; score: number; reason: string }>)
                .map((suggestion, idx) => {
                  const scoreColor = suggestion.score >= 0.75 
                    ? "bg-green-900/20 border-green-700 text-green-300"
                    : suggestion.score >= 0.5
                    ? "bg-yellow-900/20 border-yellow-700 text-yellow-300"
                    : "bg-gray-900/20 border-gray-700 text-gray-300";
                  
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded border cursor-pointer hover:opacity-80 transition-opacity ${scoreColor}`}
                      onClick={() => {
                        const bufferTime = 0.5;
                        const bufferedStart = Math.max(0, suggestion.start - bufferTime);
                        const bufferedEnd = suggestion.end + bufferTime;
                        const duration = bufferedEnd - bufferedStart;
                        
                        // Update trim range in store
                        const { updateTrack } = useProjectStore.getState();
                        updateTrack("main", {
                          startTime: bufferedStart,
                          endTime: bufferedEnd,
                        });
                        
                        // Seek and play video
                        onSeekVideo(bufferedStart, duration);
                        
                        // Show toast notification
                        toast.success(`Trim range updated: ${bufferedStart.toFixed(2)}s - ${bufferedEnd.toFixed(2)}s`);
                      }}
                      title={suggestion.reason}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">"{suggestion.clip.join(' ')}"</p>
                          <p className="text-xs opacity-75">
                            {(suggestion.start - 0.5).toFixed(2)}s - {(suggestion.end + 0.5).toFixed(2)}s (with 0.5s buffer)
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">
                            {(suggestion.score * 100).toFixed(0)}%
                          </span>
                          {/* TODO: Add "Export Clip" button here */}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
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
          AI Short Suggestion
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
