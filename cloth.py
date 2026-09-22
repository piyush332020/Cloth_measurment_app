import cv2
import mediapipe as mp
import math

# Initialize mediapipe pose globally to avoid re-initializing for every frame
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=0,  # Light model to stop high CPU usage/timeouts
    smooth_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Known constants from the original application
KNOWN_FACE_WIDTH_CM = 16
KNOWN_SHOULDER_WIDTH_CM = 40
focal_length = None

def euclidean_dist(x1, y1, x2, y2):
    """Calculates the Euclidean distance between two points (x1, y1) and (x2, y2)."""
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def classify_size_by_shoulder_px(shoulder_width_px, frame_width):
    """Fallback when full body height/ankles are off-screen."""
    normalized_width = shoulder_width_px / frame_width
    if normalized_width < 0.30:
        return "S"
    elif normalized_width < 0.38:
        return "M"
    elif normalized_width < 0.45:
        return "L"
    elif normalized_width < 0.52:
        return "XL"
    else:
        return "XXL"

def classify_size_by_ratio(ratio):
    """Classifies clothing size based on shoulder width / body height ratio."""
    if ratio < 0.21:
        return "S"
    elif ratio < 0.22:
        return "M"
    elif ratio < 0.23:
        return "L"
    elif ratio < 0.25:
        return "XL"
    else:
        return "XXL"

def reset_calibration():
    """Resets the calculated focal length so it can be recalibrated."""
    global focal_length
    focal_length = None

def measure_frame(frame):
    """
    Processes a single OpenCV frame using MediaPipe Pose to estimate clothing size.
    Returns a dictionary containing size, distance, status, and readiness.
    """
    global focal_length

    h, w, _ = frame.shape
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process the frame with mediapipe
    result = pose.process(rgb)

    status_text = "Person not detected"
    size_text = None
    distance_cm = None
    ready = False

    if result.pose_landmarks:
        landmarks = result.pose_landmarks.landmark

        # Face width calibration (left ear to right ear)
        l_ear = landmarks[mp_pose.PoseLandmark.LEFT_EAR.value]
        r_ear = landmarks[mp_pose.PoseLandmark.RIGHT_EAR.value]

        l_ear_x, l_ear_y = int(l_ear.x * w), int(l_ear.y * h)
        r_ear_x, r_ear_y = int(r_ear.x * w), int(r_ear.y * h)

        face_width_px = euclidean_dist(l_ear_x, l_ear_y, r_ear_x, r_ear_y)

        # Auto-calibrate focal length if not already set
        if face_width_px > 0 and focal_length is None:
            # Assuming distance is 50cm during initial calibration based on original code
            focal_length = (face_width_px * 50) / KNOWN_FACE_WIDTH_CM

        status_text = "Detecting..."

        # Shoulder width detection
        l_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
        r_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]

        l_sh_x, l_sh_y = int(l_shoulder.x * w), int(l_shoulder.y * h)
        r_sh_x, r_sh_y = int(r_shoulder.x * w), int(r_shoulder.y * h)

        shoulder_width_px = euclidean_dist(l_sh_x, l_sh_y, r_sh_x, r_sh_y)

        if shoulder_width_px > 0 and focal_length:
            # Calculate distance using similar triangles
            distance_cm = (KNOWN_SHOULDER_WIDTH_CM * focal_length) / shoulder_width_px

            # Check distance thresholds (from original logic)
            if 63 <= distance_cm <= 120:
                status_text = "Perfect Distance"
                ready = True

                # Measure body height (nose to ankles)
                nose = landmarks[mp_pose.PoseLandmark.NOSE.value]
                l_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]
                r_ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]

                nose_y = int(nose.y * h)
                l_ankle_y = int(l_ankle.y * h)
                r_ankle_y = int(r_ankle.y * h)
                
                person_height_px = max(l_ankle_y, r_ankle_y) - nose_y

                # Calculate ratio and classify size
                if person_height_px > 0:
                    ratio = shoulder_width_px / person_height_px
                    size_text = classify_size_by_ratio(ratio)
                else:
                    # Use shoulder width fallback when upper body only is shown
                    size_text = classify_size_by_shoulder_px(shoulder_width_px, w)
            elif distance_cm < 63:
                status_text = "Move Back"
                ready = False
            else:
                status_text = "Move Closer"
                ready = False

        return {
            "success": True,
            "size": size_text,
            "distance_cm": round(distance_cm, 1) if distance_cm is not None else None,
            "status": status_text,
            "ready": ready
        }

    return {
        "success": False,
        "size": None,
        "distance_cm": None,
        "status": "Person not detected",
        "ready": False
    }
