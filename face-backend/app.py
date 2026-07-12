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

HIST_MATCH_THRESHOLD = 0.45


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


def extract_eye_region(image, face_rect):
    x, y, w, h = face_rect
    eye_top = y + int(h * 0.2)
    eye_bottom = y + int(h * 0.55)
    eye_left = x + int(w * 0.1)
    eye_right = x + int(w * 0.9)
    eye_top = max(0, eye_top)
    eye_left = max(0, eye_left)
    eye_bottom = min(image.shape[0], eye_bottom)
    eye_right = min(image.shape[1], eye_right)
    roi = image[eye_top:eye_bottom, eye_left:eye_right]
    if roi.size == 0:
        return None
    return cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)


@app.route("/api/detect-blink", methods=["POST"])
def detect_blink():
    try:
        data = request.json
        frames = data.get("frames", [])

        if not frames or len(frames) < 4:
            return jsonify({"error": "Need at least 4 frames"}), 400

        eye_regions = []
        for frame_b64 in frames:
            image = decode_image(frame_b64)
            if image is None:
                continue

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.05, 4, minSize=(60, 60))
            if len(faces) == 0:
                continue

            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            region = extract_eye_region(image, (x, y, w, h))
            if region is not None:
                resized = cv2.resize(region, (100, 40))
                eye_regions.append(resized)

        if len(eye_regions) < 3:
            return jsonify({"blink_detected": False, "reason": "not_enough_faces"})

        diffs = []
        for i in range(1, len(eye_regions)):
            diff = cv2.absdiff(eye_regions[i - 1], eye_regions[i])
            mean_diff = float(np.mean(diff))
            diffs.append(mean_diff)

        avg_diff = float(np.mean(diffs))
        max_diff = float(max(diffs))
        spike_count = sum(1 for d in diffs if d > avg_diff * 1.5 + 3)

        blink_detected = spike_count >= 1 or max_diff > 18

        return jsonify({
            "blink_detected": blink_detected,
            "frame_count": len(eye_regions),
            "avg_diff": round(avg_diff, 2),
            "max_diff": round(max_diff, 2),
            "spike_count": spike_count,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
def health():
    return jsonify({"status": "ok", "supabase_configured": supabase is not None})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
