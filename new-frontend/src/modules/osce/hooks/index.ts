import { useEffect, useRef, useCallback } from "react";
import { useOsceStore } from "../store/osceStore";
import { osceApi } from "../services";
import type { OsceStation, OsceFilters } from "../types";

export function useOsceStations() {
  const { availableStations, setAvailableStations, selectedFilters, setFilters } = useOsceStore();
  const isLoading = useRef(false);

  useEffect(() => {
    if (isLoading.current) return;
    isLoading.current = true;

    osceApi.getStations(selectedFilters).then((stations) => {
      setAvailableStations(stations);
      isLoading.current = false;
    }).catch(() => {
      isLoading.current = false;
    });
  }, [selectedFilters, setAvailableStations, setFilters]);

  const filteredStations = availableStations;

  return { stations: filteredStations, isLoading: isLoading.current };
}

export function useOsceFilters() {
  const { selectedFilters, setFilters } = useOsceStore();

  const updateFilters = useCallback((filters: Partial<OsceFilters>) => {
    setFilters(filters);
  }, [setFilters]);

  const resetFilters = useCallback(() => {
    setFilters({
      specialty: "all",
      type: "all",
      difficulty: "all",
      searchQuery: "",
    });
  }, [setFilters]);

  return { filters: selectedFilters, updateFilters, resetFilters };
}

export function useOsceTimer() {
  const { timer, isRunning, status } = useOsceStore();
  const warningThreshold = 120;

  return {
    remaining: timer,
    isRunning: isRunning && status === "running",
    shouldWarn: timer <= warningThreshold && timer > 0,
    isExpired: timer <= 0,
    formatTime: (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    },
  };
}

export function useVoiceInteraction() {
  const { addMessage, setVoiceState, isSpeaking, isListening } = useOsceStore();

  const startListening = useCallback((onResult: (text: string) => void) => {
    setVoiceState("listening");
    onResult("Voice input simulated");
  }, [setVoiceState]);

  const stopListening = useCallback(() => {
    setVoiceState("idle");
  }, [setVoiceState]);

  const speak = useCallback((text: string) => {
    setVoiceState("processing");
    setTimeout(() => {
      setVoiceState("speaking");
      setTimeout(() => {
        addMessage({ role: "patient", content: text });
        setVoiceState("idle");
      }, 1000);
    }, 500);
  }, [addMessage, setVoiceState]);

  return {
    isListening: isListening,
    isSpeaking: isSpeaking,
    startListening,
    stopListening,
    speak,
  };
}

export function useExaminationSession() {
  const {
    currentStation,
    startStation,
    addMessage,
    completeStation,
    conversation,
    timer,
    status,
  } = useOsceStore();

  const startExamination = useCallback(async (station: OsceStation) => {
    startStation(station);
    addMessage({
      role: "patient",
      content: `Hello doctor, what can I help you with?`,
    });
  }, [startStation, addMessage]);

  const submitStudentInput = useCallback(async (input: string, audioUrl?: string) => {
    addMessage({ role: "student", content: input, audioUrl });
  }, [addMessage]);

  const endExamination = useCallback(async () => {
    if (currentStation) {
      const feedback = await completeStation({
        overallScore: 78,
        status: "Pass",
        competencies: [],
        missedPoints: [],
        modelAnswer: ["Complete history and examination performed"],
        recommendations: [],
      });
      return feedback;
    }
  }, [currentStation, completeStation]);

  return {
    currentStation,
    conversation,
    timer,
    status,
    startExamination,
    submitStudentInput,
    endExamination,
  };
}

export function useOsceProgress() {
  const { progress, loadProgress } = useOsceStore();

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  return progress;
}