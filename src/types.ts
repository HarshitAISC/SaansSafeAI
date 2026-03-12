import { Type } from "@google/genai";

export interface User {
  id: string;
  name: string;
  role: 'citizen' | 'authority';
  points: number;
}

export interface Report {
  id: string;
  userId: string;
  imageUrl: string;
  lat: number;
  lng: number;
  status: 'pending' | 'verified' | 'rejected';
  confidence: number;
  intensity: 'low' | 'medium' | 'high';
  density: 'low' | 'medium' | 'high';
  analysis: string;
  timestamp: string;
}

export interface FireEvent {
  id: string;
  reportId?: string;
  lat: number;
  lng: number;
  intensity: number;
  density: number;
  heat_score: number;
  source: 'citizen' | 'camera';
  timestamp: string;
  resolved: boolean;
}

export interface Prediction {
  lat: number;
  lng: number;
  probability: number;
  reason: string;
}
