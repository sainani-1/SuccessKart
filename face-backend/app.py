import os
import traceback
import base64
import json
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "https://sucesskart.vercel.app",
])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
eye_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_eye.xml"
)

HIST_MATCH_THRESHOLD = 0.45
EAR_THRESHOLD = 0.21
EAR_CONSEC_FRAMES = 2


def decode_image(image_b64):
    raw = image_b64.split(",")[-1]
    missing = len(raw) % 4
    if missing:
        raw += "=" * (4 - missing)
    img_data = base64.b64decode(raw)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def detect_and_crop_face(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(80, 80))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    pad = int(0.15 * max(w, h))
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(image.shape[1], x + w + pad)
    y2 = min(image.shape[0], y + h + pad)
    face_roi = image[y1:y2, x1:x2]
    return face_roi


def compute_face_encoding(face_img):
    resized = cv2.resize(face_img, (100, 100))
    hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
    hist_h = cv2.calcHist([hsv], [0], None, [50], [0, 180])
    hist_s = cv2.calcHist([hsv], [1], None, [60], [0, 256])
    cv2.normalize(hist_h, hist_h, 0, 1, cv2.NORM_MINMAX)
    cv2.normalize(hist_s, hist_s, 0, 1, cv2.NORM_MINMAX)
    hist = np.concatenate([hist_h.flatten(), hist_s.flatten()])

    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    lbp = compute_lbp(gray)
    lbp_hist, _ = np.histogram(lbp.ravel(), bins=56, range=(0, 56), density=True)

    encoding = np.concatenate([hist, lbp_hist])
    return encoding.tolist()


def compute_lbp(gray_img):
    rows, cols = gray_img.shape
    lbp = np.zeros((rows, cols), dtype=np.uint8)
    for i in range(1, rows - 1):
        for j in range(1, cols - 1):
            center = gray_img[i, j]
            code = 0
            code |= (1 << 7) if gray_img[i - 1, j - 1] >= center else 0
            code |= (1 << 6) if gray_img[i - 1, j] >= center else 0
            code |= (1 << 5) if gray_img[i - 1, j + 1] >= center else 0
            code |= (1 << 4) if gray_img[i, j + 1] >= center else 0
            code |= (1 << 3) if gray_img[i + 1, j + 1] >= center else 0
            code |= (1 << 2) if gray_img[i + 1, j] >= center else 0
            code |= (1 << 1) if gray_img[i + 1, j - 1] >= center else 0
            code |= (1 << 0) if gray_img[i, j - 1] >= center else 0
            lbp[i, j] = code
    return lbp


def compare_encodings(a, b):
    a = np.array(a, dtype=np.float64)
    b = np.array(b, dtype=np.float64)
    hist_size = 50 + 60
    a_hist = a[:hist_size]
    b_hist = b[:hist_size]
    a_lbp = a[hist_size:]
    b_lbp = b[hist_size:]
    hist_corr = cv2.compareHist(
        a_hist.astype(np.float32),
        b_hist.astype(np.float32),
        cv2.HISTCMP_CORREL,
    )
    lbp_corr = cv2.compareHist(
        a_lbp.astype(np.float32),
        b_lbp.astype(np.float32),
        cv2.HISTCMP_CORREL,
    )
    return 0.5 * hist_corr + 0.5 * lbp_corr


@app.route("/api/register-face", methods=["POST"])
def register_face():
    try:
        if not supabase:
            return jsonify({"error": "Backend not configured. Missing SUPABASE env vars."}), 500

        data = request.json
        email = data.get("email")
        image_b64 = data.get("image_base64")

        if not email or not image_b64:
            return jsonify({"error": "email and image_base64 are required"}), 400

        image = decode_image(image_b64)
        if image is None:
            return jsonify({"error": "Invalid image data"}), 400

        face = detect_and_crop_face(image)
        if face is None:
            return jsonify({"error": "No face detected. Please face the camera and try again."}), 400

        encoding = compute_face_encoding(face)

        profile = supabase.table("profiles").select("id").eq("email", email).execute()
        if not profile.data:
            return jsonify({"error": "User not found with this email"}), 404

        user_id = profile.data[0]["id"]

        existing = supabase.table("face_embeddings").select("id").eq("user_id", user_id).execute()
        if existing.data:
            supabase.table("face_embeddings").update({
                "encoding": json.dumps(encoding),
            }).eq("user_id", user_id).execute()
        else:
            supabase.table("face_embeddings").insert({
                "user_id": user_id,
                "email": email,
                "encoding": json.dumps(encoding),
            }).execute()

        return jsonify({"success": True, "message": "Face registered successfully"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/recognize-face", methods=["POST"])
def recognize_face():
    try:
        if not supabase:
            return jsonify({"error": "Backend not configured. Missing SUPABASE env vars."}), 500

        data = request.json
        image_b64 = data.get("image_base64")

        if not image_b64:
            return jsonify({"error": "image_base64 is required"}), 400

        image = decode_image(image_b64)
        if image is None:
            return jsonify({"error": "Invalid image data"}), 400

        face = detect_and_crop_face(image)
        if face is None:
            return jsonify({"error": "No face detected. Please face the camera and try again."}), 400

        encoding = compute_face_encoding(face)

        result = supabase.table("face_embeddings").select("email, encoding").execute()
        if not result.data:
            return jsonify({"error": "No registered faces found"}), 404

        best_match_email = None
        best_score = HIST_MATCH_THRESHOLD

        for row in result.data:
            stored = json.loads(row["encoding"])
            score = compare_encodings(encoding, stored)
            if score > best_score:
                best_score = score
                best_match_email = row["email"]

        if best_match_email:
            return jsonify({
                "success": True,
                "email": best_match_email,
                "confidence": round(float(best_score), 4),
            })

        return jsonify({"error": "No matching face found"}), 404
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def compute_ear(eye_pts):
    """Compute Eye Aspect Ratio from 6 eye landmark points."""
    pts = np.array(eye_pts, dtype=np.float64)
    A = np.linalg.norm(pts[1] - pts[5])
    B = np.linalg.norm(pts[2] - pts[4])
    C = np.linalg.norm(pts[0] - pts[3])
    if C == 0:
        return 0.0
    return (A + B) / (2.0 * C)


def detect_eyes_in_face(face_img, face_x, face_y):
    """Detect eyes within a face region and return their center+size."""
    gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
    eyes = eye_cascade.detectMultiScale(gray, 1.1, 4, minSize=(20, 20))
    if len(eyes) < 2:
        return None
    eye_list = []
    for (ex, ey, ew, eh) in eyes:
        cx = face_x + ex + ew // 2
        cy = face_y + ey + eh // 2
        eye_list.append((cx, cy, max(ew, eh)))
    eye_list.sort(key=lambda e: e[0])
    return eye_list[:2]


@app.route("/api/detect-blink", methods=["POST"])
def detect_blink():
    """Accept multiple frames, detect eye blinks using EAR."""
    try:
        data = request.json
        frames = data.get("frames", [])

        if not frames or len(frames) < 4:
            return jsonify({"error": "Need at least 4 frames for blink detection"}), 400

        ear_values = []
        for frame_b64 in frames:
            image = decode_image(frame_b64)
            if image is None:
                continue

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(80, 80))
            if len(faces) == 0:
                ear_values.append(0.35)
                continue

            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            face_roi = image[y:y+h, x:x+w]
            eye_result = detect_eyes_in_face(face_roi, x, y)

            if eye_result and len(eye_result) == 2:
                left_eye, right_eye = eye_result
                le_cx, le_cy, le_r = left_eye
                re_cx, re_cy, re_r = right_eye

                r = max(le_r, re_r) // 2 + 4
                pts_left = [
                    (le_cx - r, le_cy), (le_cx - r//2, le_cy - r//2),
                    (le_cx + r//2, le_cy - r//2), (le_cx + r, le_cy),
                    (le_cx + r//2, le_cy + r//2), (le_cx - r//2, le_cy + r//2),
                ]
                pts_right = [
                    (re_cx - r, re_cy), (re_cx - r//2, re_cy - r//2),
                    (re_cx + r//2, re_cy - r//2), (re_cx + r, re_cy),
                    (re_cx + r//2, re_cy + r//2), (re_cx - r//2, re_cy + r//2),
                ]
                ear_left = compute_ear(pts_left)
                ear_right = compute_ear(pts_right)
                ear_values.append((ear_left + ear_right) / 2.0)
            else:
                ear_values.append(0.35)

        if len(ear_values) < 4:
            return jsonify({"error": "Could not process enough frames"}), 400

        blink_detected = False
        below_count = 0
        for ear in ear_values:
            if ear < EAR_THRESHOLD:
                below_count += 1
            else:
                if below_count >= EAR_CONSEC_FRAMES:
                    blink_detected = True
                    break
                below_count = 0

        if not blink_detected and below_count >= EAR_CONSEC_FRAMES:
            blink_detected = True

        return jsonify({
            "blink_detected": blink_detected,
            "frame_count": len(ear_values),
            "avg_ear": round(float(np.mean(ear_values)), 4),
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
def health():
    return jsonify({"status": "ok", "supabase_configured": supabase is not None})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
