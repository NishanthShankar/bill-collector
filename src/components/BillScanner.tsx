import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { preprocessForOcr } from "@/lib/imagePreprocess";
import { parseBillText, type ParsedBill } from "@/lib/billParser";

export interface ScanResult extends ParsedBill {
  imageStorageId: Id<"_storage">;
}

interface BillScannerProps {
  onScanComplete: (result: ScanResult) => void;
  onCancel: () => void;
}

type Stage = "idle" | "uploading" | "preprocessing" | "scanning" | "done" | "error";

const STAGE_LABELS: Record<Stage, string> = {
  idle: "Ready to scan",
  uploading: "Uploading image...",
  preprocessing: "Preprocessing image...",
  scanning: "Running OCR...",
  done: "Scan complete!",
  error: "Scan failed",
};

export function BillScanner({ onScanComplete, onCancel }: BillScannerProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file.");
        setStage("error");
        return;
      }

      try {
        setError(null);

        // Step 1: Upload original image to Convex storage
        setStage("uploading");
        setProgress(0);
        const uploadUrl = await generateUploadUrl();
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadResult.ok) throw new Error("Upload failed");
        const { storageId } = (await uploadResult.json()) as {
          storageId: Id<"_storage">;
        };
        setProgress(100);

        // Step 2: Preprocess image
        setStage("preprocessing");
        setProgress(0);
        const processedBlob = await preprocessForOcr(file);
        setProgress(100);

        // Step 3: OCR with Tesseract.js (dynamic import)
        setStage("scanning");
        setProgress(0);
        const Tesseract = await import("tesseract.js");
        const worker = await Tesseract.createWorker("eng", undefined, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === "recognizing text") {
              setProgress(Math.round(m.progress * 100));
            }
          },
        });
        const {
          data: { text },
        } = await worker.recognize(processedBlob);
        await worker.terminate();

        // Step 4: Parse the OCR text
        const parsed = parseBillText(text);

        setStage("done");
        onScanComplete({
          ...parsed,
          imageStorageId: storageId,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setStage("error");
      }
    },
    [generateUploadUrl, onScanComplete]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const isProcessing = stage !== "idle" && stage !== "error" && stage !== "done";

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-primary text-lg">
          Scan a Bill
        </h3>
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {stage === "idle" || stage === "error" ? (
        <>
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-primary bg-primary-fixed/30"
                : "border-outline-variant/40 hover:border-primary/50 hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4 block">
              document_scanner
            </span>
            <p className="text-sm font-semibold text-primary mb-1">
              Drop a bill image here or click to browse
            </p>
            <p className="text-xs text-on-surface-variant">
              Supports JPEG, PNG, WebP
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-error-container rounded-lg">
              <span className="material-symbols-outlined text-error text-sm">
                error
              </span>
              <p className="text-sm text-on-error-container">{error}</p>
              <button
                onClick={() => {
                  setStage("idle");
                  setError(null);
                }}
                className="ml-auto text-sm font-semibold text-error hover:underline"
              >
                Try again
              </button>
            </div>
          )}
        </>
      ) : (
        /* Processing progress */
        <div className="space-y-6 py-4">
          {(["uploading", "preprocessing", "scanning"] as const).map(
            (s, idx) => {
              const stageIdx = ["uploading", "preprocessing", "scanning"].indexOf(
                stage
              );
              const thisIdx = idx;
              const isActive = stage === s;
              const isDone = thisIdx < stageIdx || stage === "done";

              return (
                <div key={s} className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isDone
                        ? "bg-secondary-container"
                        : isActive
                          ? "bg-primary"
                          : "bg-surface-container-high"
                    }`}
                  >
                    {isDone ? (
                      <span className="material-symbols-outlined text-on-secondary-container text-sm">
                        check
                      </span>
                    ) : (
                      <span
                        className={`text-xs font-bold ${isActive ? "text-white" : "text-on-surface-variant"}`}
                      >
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        isActive
                          ? "text-primary"
                          : isDone
                            ? "text-on-surface-variant"
                            : "text-on-surface-variant/50"
                      }`}
                    >
                      {STAGE_LABELS[s]}
                    </p>
                    {isActive && (
                      <div className="mt-2 w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
