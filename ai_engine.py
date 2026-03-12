import cv2
import numpy as np
import torch
from ultralytics import YOLO
import datetime
import json

class SaansSafeAI:
    def __init__(self, yolo_model_path='yolov8n.pt'):
        # Load YOLOv8 for fire detection
        self.model = YOLO(yolo_model_path)
        
        # Mock CNN for smoke detection (in reality, you'd load a trained .h5 or .pth)
        self.smoke_model = None 

    def detect_fire_and_smoke(self, frame):
        """
        Detects fire and smoke in a video frame.
        Returns detection metadata.
        """
        results = self.model(frame)
        detections = []
        
        for r in results:
            boxes = r.boxes
            for box in boxes:
                # Assuming class 0 is fire in a custom trained model
                # Here we use standard YOLO for demo
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                
                if conf > 0.5:
                    detection = {
                        "event_id": f"evt_{datetime.datetime.now().timestamp()}",
                        "timestamp": datetime.datetime.now().isoformat(),
                        "type": "fire",
                        "confidence_score": conf,
                        "fire_intensity": "high" if conf > 0.8 else "medium",
                        "smoke_density": "medium", # Simulated smoke detection
                        "location": {"lat": 28.6139, "lng": 77.2090} # Geotagged
                    }
                    detections.append(detection)
                    
        return detections

    def detect_fire_opencv(self, frame):
        """
        Detects fire using OpenCV color masking (HSV).
        Assigns intensity based on the area of the detected fire.
        """
        # Convert to HSV color space
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Define range for fire color (Yellow/Orange/Red)
        lower_fire = np.array([0, 120, 120], dtype="uint8")
        upper_fire = np.array([35, 255, 255], dtype="uint8")
        
        # Threshold the HSV image to get only fire colors
        mask = cv2.inRange(hsv, lower_fire, upper_fire)
        
        # Apply some morphological operations to remove noise
        mask = cv2.erode(mask, None, iterations=2)
        mask = cv2.dilate(mask, None, iterations=4)
        
        # Find contours in the mask
        contours, _ = cv2.findContours(mask.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        detections = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 500: # Minimum area to be considered a fire
                x, y, w, h = cv2.boundingRect(cnt)
                
                # Calculate heat score based on area (normalized)
                heat_score = min(int((area / 10000) * 100), 100)
                
                detection = {
                    "event_id": f"cv_{datetime.datetime.now().timestamp()}",
                    "timestamp": datetime.datetime.now().isoformat(),
                    "type": "fire",
                    "intensity": "high" if heat_score > 70 else "medium" if heat_score > 30 else "low",
                    "heat_score": heat_score,
                    "bbox": [x, y, w, h],
                    "location": {"lat": 28.6139, "lng": 77.2090} # Geotagged
                }
                detections.append(detection)
                
        return detections

class PredictivePollutionModel:
    def __init__(self):
        # In production, this would be a Random Forest or LSTM model
        pass

    def predict_spike(self, temp, wind_speed, humidity, past_incidents, aqi_data):
        """
        Predicts pollution hotspots in the next 3 hours.
        """
        # Logic: High temp + Low wind + High past incidents = High probability
        risk_score = (temp * 0.1) - (wind_speed * 0.5) + (past_incidents * 2)
        probability = min(max(risk_score / 100, 0), 1)
        
        return {
            "prediction_time": (datetime.datetime.now() + datetime.timedelta(hours=3)).isoformat(),
            "probability": probability,
            "hotspots": [
                {"lat": 28.7041, "lng": 77.1025, "risk": "high" if probability > 0.7 else "medium"}
            ]
        }

if __name__ == "__main__":
    # Example usage
    ai = SaansSafeAI()
    predictor = PredictivePollutionModel()
    
    print("AI Engine Initialized.")
    # result = ai.detect_fire_and_smoke(some_frame)
    prediction = predictor.predict_spike(30, 5, 60, 10, 150)
    print(f"Pollution Prediction: {json.dumps(prediction, indent=2)}")
