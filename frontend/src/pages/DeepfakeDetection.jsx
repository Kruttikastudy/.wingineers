import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import deepfakeBg from "../assets/deepfake.avif";
import {
  ArrowLeft,
  UploadCloud,
  FileAudio,
  FileVideo,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Activity,
  Eye,
  Fingerprint,
} from "lucide-react";

export default function DeepfakeDetection() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisStep(1);
    setResult(null);
    setError(null);

    // Simulate analysis steps visually
    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1500);

    const formData = new FormData();
    formData.append("file", file);

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${apiUrl}/detect`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errMessage = "Analysis failed. Please try again.";
        try {
          const errData = await response.json();
          if (errData.detail) errMessage = errData.detail;
        } catch (e) {}
        throw new Error(errMessage);
      }

      const data = await response.json();
      setResult(data);
      setAnalysisStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  };

  const isAudio = file && file.type.startsWith("audio/");
  const isVideo = file && file.type.startsWith("video/");

  return (
    <div className="relative h-screen w-full font-sans text-white selection:bg-cyan-500/30 overflow-hidden flex flex-col">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${deepfakeBg})` }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
      </div>

      <div className="relative z-20 pt-6">
        <Navbar />
      </div>

      <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 flex-1 flex flex-col justify-start pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl lg:text-5xl font-black mb-4 tracking-tight">
            Deepfake{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Analysis
            </span>
          </h1>
          <p className="text-lg text-white/60 font-medium max-w-2xl mx-auto">
            Upload an audio or video file to analyze it for AI-generated
            manipulation.
          </p>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch min-h-0">
          {/* Left Column: Upload */}
          <div className="lg:col-span-6 flex flex-col h-auto">
            <div
              className={`relative flex-1 flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[2.5rem] transition-all duration-300 ${
                isDragging ?
                  "border-cyan-400 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]"
                : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="audio/*,video/*"
              />

              <div className="w-20 h-20 rounded-full bg-black/50 border border-white/10 flex items-center justify-center mb-6 shadow-xl object-cover">
                {isAudio ?
                  <FileAudio className="w-8 h-8 text-cyan-400" />
                : isVideo ?
                  <FileVideo className="w-8 h-8 text-cyan-400" />
                : <UploadCloud className="w-8 h-8 text-white/50" />}
              </div>

              <h3 className="font-display text-xl font-bold mb-2">
                {file ? file.name : "Select a file to analyze"}
              </h3>

              <p className="text-sm text-white/50 text-center mb-6 max-w-[250px]">
                {file ?
                  `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                : "Drag and drop or click to browse. Supports MP3, WAV, MP4, AVI, MOV."
                }
              </p>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold transition-colors"
                disabled={isAnalyzing}
              >
                {file ? "Choose Another File" : "Browse Files"}
              </button>
            </div>

            {file && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="mt-6 w-full flex justify-center items-center py-4 px-8 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] text-sm font-black text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ?
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Analyzing Neural Signatures...
                  </>
                : "Initiate Analysis"}
              </button>
            )}

            {error && (
              <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Visualization & Results */}
          <div className="lg:col-span-6 flex flex-col w-full h-auto">
            <div
              className={`flex-1 rounded-[2.5rem] border border-white/10 bg-black/60 backdrop-blur-3xl p-10 flex flex-col transition-all duration-500 overflow-y-auto ${result ? "shadow-[0_0_50px_rgba(0,0,0,0.5)]" : ""}`}
            >
              {!result && !isAnalyzing && (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 h-full">
                  <ShieldCheck className="w-16 h-16 text-white/20 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">
                    Ready for Analysis
                  </h3>
                  <p className="text-sm font-medium max-w-sm text-white/60">
                    Upload a file on the left to begin the neural scanning
                    process.
                  </p>

                  {/* Fake Grid to make it look technical even when empty */}
                  <div className="w-full max-w-sm mt-8 grid grid-cols-3 gap-3 opacity-40">
                    <div className="h-1 bg-white/20 rounded-full w-full"></div>
                    <div className="h-1 bg-white/20 rounded-full w-3/4 mx-auto"></div>
                    <div className="h-1 bg-white/20 rounded-full w-full"></div>
                    <div className="h-1 bg-white/20 rounded-full w-1/2"></div>
                    <div className="h-1 bg-white/20 rounded-full w-full"></div>
                    <div className="h-1 bg-white/20 rounded-full w-2/3 ml-auto"></div>
                  </div>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex-1 flex flex-col items-center justify-center text-center h-full">
                  <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin"></div>
                    <div className="absolute inset-3 rounded-full border-r-2 border-teal-400 animate-spin animation-delay-150"></div>
                    <div className="absolute inset-6 rounded-full border-b-2 border-emerald-400 animate-spin animation-delay-300"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {analysisStep * 20}%
                      </span>
                    </div>
                  </div>

                  <div className="max-w-sm w-full space-y-4">
                    <div
                      className={`flex items-center justify-between text-xs font-mono transition-opacity duration-300 ${analysisStep >= 1 ? "text-white/90" : "text-white/20"}`}
                    >
                      <span className="uppercase tracking-widest">
                        {file?.type?.includes("video") ?
                          "Extracting Frames"
                        : "Generating Spectrogram"}
                      </span>
                      <span>{analysisStep >= 1 ? "DONE" : "WAIT"}</span>
                    </div>
                    <div
                      className={`flex items-center justify-between text-xs font-mono transition-opacity duration-300 ${analysisStep >= 2 ? "text-white/90" : "text-white/20"}`}
                    >
                      <span className="uppercase tracking-widest">
                        {file?.type?.includes("video") ?
                          "Face Anomaly Detection"
                        : "Frequency Analysis"}
                      </span>
                      <span>{analysisStep >= 2 ? "DONE" : "WAIT"}</span>
                    </div>
                    <div
                      className={`flex items-center justify-between text-xs font-mono transition-opacity duration-300 ${analysisStep >= 3 ? "text-white/90" : "text-white/20"}`}
                    >
                      <span className="uppercase tracking-widest">
                        Neural Reference Comparison
                      </span>
                      <span>{analysisStep >= 3 ? "DONE" : "WAIT"}</span>
                    </div>
                    <div
                      className={`flex items-center justify-between text-xs font-mono transition-opacity duration-300 ${analysisStep >= 4 ? "text-cyan-400" : "text-white/20"}`}
                    >
                      <span className="uppercase tracking-widest font-bold">
                        Computing Final Verdict
                      </span>
                      <span>...</span>
                    </div>
                  </div>
                </div>
              )}

              {result && !isAnalyzing && (
                <div className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <h3 className="font-mono text-xs uppercase tracking-widest text-white/50 mb-1">
                        Analysis Verdict
                      </h3>
                      <div className="flex items-center gap-3">
                        {result.is_deepfake ?
                          <>
                            <ShieldAlert className="w-8 h-8 text-red-500" />
                            <span className="font-display text-3xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                              DEEPFAKE DETECTED
                            </span>
                          </>
                        : <>
                            <ShieldCheck className="w-8 h-8 text-emerald-500" />
                            <span className="font-display text-3xl font-black text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                              AUTHENTIC MEDIA
                            </span>
                          </>
                        }
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 flex-1 mt-6">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/60 font-medium">
                          Confidence Score
                        </span>
                        <span className="font-mono font-bold text-white">
                          {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${result.is_deepfake ? "bg-red-500" : "bg-emerald-500"}`}
                          style={{ width: `${result.confidence * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/10">
                      <p className="text-xs text-white/50 leading-relaxed font-medium">
                        {result.message ||
                          "Analysis completed successfully. Neural indicators point towards the above verdict."}
                      </p>
                    </div>
                  </div>

                  {/* Informational Panel below results */}
                  <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-5 h-5 text-cyan-400" />
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                          Unseen Artifacts
                        </h4>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">
                        Our models detect inconsistencies invisible to the human
                        eye, such as unnatural blinking patterns, unnatural skin
                        tones, and spectral shifts.
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Fingerprint className="w-5 h-5 text-cyan-400" />
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                          Neural Signatures
                        </h4>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">
                        Deepfakes leave behind algorithmic fingerprints during
                        audio/video generation. We cross-reference these with
                        millions of known malicious samples.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
