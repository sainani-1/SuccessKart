import os
import traceback
import base64
import json
import numpy as np
import cv2
try:
    import mediapipe as mp
    HAS_MEDIAPIPE = True
except Exception:
    mp = None
    HAS_MEDIAPIPE = False
try:
    import face_recognition as fr_lib
    HAS_DLIB = True
except Exception:
    fr_lib = None
    HAS_DLIB = False
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
    "https://sucesskart-git-main-sainani-1.vercel.app",
])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

FACE_MATCH_THRESHOLD = 0.6


ENCODING_VERSION = 3


def decode_image(image_b64):
    try:
        raw = image_b64.split(",")[-1]
        missing = len(raw) % 4
        if missing:
            raw += "=" * (4 - missing)
        img_data = base64.b64decode(raw)
        if len(img_data) < 100:
            return None
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None or img.size == 0:
            return None
        return img
    except Exception:
        return None


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


def _normalize_face(face_img):
    lab = cv2.cvtColor(face_img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge([l, a, b])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def compute_face_encoding(face_img):
    if HAS_DLIB:
        rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
        encodings = fr_lib.face_encodings(rgb)
        if encodings:
            return {"v": ENCODING_VERSION, "d": encodings[0].tolist(), "backend": "dlib"}

    normalized = _normalize_face(face_img)
    resized = cv2.resize(normalized, (100, 100))
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blocks = []
    for by in range(5):
        for bx in range(5):
            block = gray[by * 20:(by + 1) * 20, bx * 20:(bx + 1) * 20]
            block = block.astype(np.float64)
            blocks.append(float(np.mean(block)))
            blocks.append(float(np.std(block)))
    lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
    l_ch = lab[:, :, 0].astype(np.float64)
    a_ch = lab[:, :, 1].astype(np.float64)
    b_ch = lab[:, :, 2].astype(np.float64)
    blocks.extend([float(np.mean(l_ch)), float(np.std(l_ch))])
    blocks.extend([float(np.mean(a_ch)), float(np.std(a_ch))])
    blocks.extend([float(np.mean(b_ch)), float(np.std(b_ch))])
    encoding = np.array(blocks, dtype=np.float64)
    norm = np.linalg.norm(encoding)
    if norm > 0:
        encoding = encoding / norm
    return {"v": ENCODING_VERSION, "d": encoding.tolist(), "backend": "fallback"}


def compare_encodings(a, b):
    try:
        if not isinstance(a, dict) or not isinstance(b, dict):
            return 0.0
        a_ver = a.get("v", 0)
        b_ver = b.get("v", 0)
        if a_ver != b_ver:
            return 0.0
        a_vec = np.array(a["d"], dtype=np.float64)
        b_vec = np.array(b["d"], dtype=np.float64)
        if a_vec.shape != b_vec.shape or a_vec.shape[0] == 0:
            return 0.0
        if a.get("backend") == "dlib" and b.get("backend") == "dlib":
            distance = np.linalg.norm(a_vec - b_vec)
            return max(0.0, 1.0 - distance)
        norm_a = np.linalg.norm(a_vec)
        norm_b = np.linalg.norm(b_vec)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a_vec, b_vec) / (norm_a * norm_b))
    except Exception:
        return 0.0


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

        all_faces = supabase.table("face_embeddings").select("id, encoding").execute()
        stale_ids = []
        for row in (all_faces.data or []):
            raw = row.get("encoding", "")
            try:
                parsed = json.loads(raw) if isinstance(raw, str) else raw
                if isinstance(parsed, dict) and parsed.get("v", 0) != ENCODING_VERSION:
                    stale_ids.append(row["id"])
                elif isinstance(parsed, list):
                    stale_ids.append(row["id"])
            except Exception:
                stale_ids.append(row["id"])
        for sid in stale_ids:
            supabase.table("face_embeddings").delete().eq("id", sid).execute()
        print(f"[register] Saved encoding for {email}, cleaned {len(stale_ids)} old-format rows")

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
        best_score = FACE_MATCH_THRESHOLD
        all_scores = []

        for row in result.data:
            stored = json.loads(row["encoding"])
            score = compare_encodings(encoding, stored)
            all_scores.append({"email": row["email"], "score": round(score, 4)})
            if score > best_score:
                best_score = score
                best_match_email = row["email"]

        print(f"[recognize] Scores: {all_scores}")

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


@app.route("/api/detect-blink", methods=["POST"])
def detect_blink():
    try:
        data = request.json
        frames = data.get("frames", [])

        if not frames or len(frames) < 4:
            return jsonify({"error": "Need at least 4 frames"}), 400

        if HAS_MEDIAPIPE:
            return _detect_blink_mediapipe(frames)
        else:
            return _detect_blink_opencv(frames)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def _detect_blink_mediapipe(frames):
    LEFT_EYE = [33, 160, 158, 133, 153, 144]
    RIGHT_EYE = [362, 385, 387, 263, 373, 380]

    def compute_ear(landmarks, eye_indices, w, h):
        pts = []
        for idx in eye_indices:
            lm = landmarks[idx]
            pts.append((lm.x * w, lm.y * h))
        pts = np.array(pts, dtype=np.float64)
        v1 = np.linalg.norm(pts[1] - pts[5])
        v2 = np.linalg.norm(pts[2] - pts[4])
        h1 = np.linalg.norm(pts[0] - pts[3])
        if h1 == 0:
            return 0.0
        return (v1 + v2) / (2.0 * h1)

    face_mesh = mp.solutions.face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    )

    ear_values = []
    faces_detected = 0

    for frame_b64 in frames:
        try:
            image = decode_image(frame_b64)
            if image is None or image.size == 0:
                continue
            h, w = image.shape[:2]
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb)
            if not results.multi_face_landmarks:
                continue
            faces_detected += 1
            landmarks = results.multi_face_landmarks[0].landmark
            left_ear = compute_ear(landmarks, LEFT_EYE, w, h)
            right_ear = compute_ear(landmarks, RIGHT_EYE, w, h)
            avg_ear = (left_ear + right_ear) / 2.0
            ear_values.append(avg_ear)
        except Exception:
            continue

    face_mesh.close()

    if len(ear_values) < 3:
        return jsonify({
            "blink_detected": False,
            "reason": "not_enough_landmarks",
            "faces_detected": faces_detected,
            "backend": "mediapipe",
        })

    ear_arr = np.array(ear_values)
    avg_ear = float(np.mean(ear_arr))
    min_ear = float(np.min(ear_arr))
    max_ear = float(np.max(ear_arr))
    std_ear = float(np.std(ear_arr))

    EAR_CLOSED_THRESH = 0.28
    blink_detected = False
    blink_method = None

    closed_frames = [i for i, e in enumerate(ear_values) if e < EAR_CLOSED_THRESH]
    open_frames = [i for i, e in enumerate(ear_values) if e >= EAR_CLOSED_THRESH]

    if closed_frames and open_frames:
        blink_detected = True
        blink_method = "ear_closed_open"

    if not blink_detected and std_ear > 0.01:
        for i in range(1, len(ear_values) - 1):
            neighbor_avg = (ear_values[i - 1] + ear_values[i + 1]) / 2.0
            if neighbor_avg - ear_values[i] > 0.03:
                blink_detected = True
                blink_method = "ear_valley"
                break

    if not blink_detected and max_ear - min_ear > 0.03:
        blink_detected = True
        blink_method = "ear_range"

    if not blink_detected and min_ear < avg_ear - 1.0 * std_ear and min_ear < EAR_CLOSED_THRESH:
        blink_detected = True
        blink_method = "ear_statistical"

    return jsonify({
        "blink_detected": blink_detected,
        "valid_frames": len(ear_values),
        "faces_detected": faces_detected,
        "ear_values": [round(e, 4) for e in ear_values],
        "avg_ear": round(avg_ear, 4),
        "min_ear": round(min_ear, 4),
        "max_ear": round(max_ear, 4),
        "std_ear": round(std_ear, 4),
        "blink_method": blink_method,
        "backend": "mediapipe",
    })


def _detect_blink_opencv(frames):
    images = []
    for frame_b64 in frames:
        try:
            image = decode_image(frame_b64)
            if image is not None and image.size > 0:
                images.append(image)
        except Exception:
            continue

    if len(images) < 4:
        return jsonify({"blink_detected": False, "reason": "not_enough_frames", "backend": "opencv"})

    ref_gray = cv2.cvtColor(images[0], cv2.COLOR_BGR2GRAY)
    ref_faces = face_cascade.detectMultiScale(ref_gray, 1.05, 4, minSize=(60, 60))
    if len(ref_faces) == 0:
        return jsonify({"blink_detected": False, "reason": "no_face_found", "backend": "opencv"})

    rx, ry, rw, rh = max(ref_faces, key=lambda f: f[2] * f[3])

    eye_bands = []
    for image in images:
        try:
            ih, iw = image.shape[:2]
            pad_x = int(0.1 * rw)
            y1 = max(0, ry + int(rh * 0.2))
            y2 = min(ih, ry + int(rh * 0.55))
            x1 = max(0, rx + pad_x)
            x2 = min(iw, rx + rw - pad_x)
            eye_band = image[y1:y2, x1:x2]
            if eye_band.size == 0 or eye_band.shape[0] < 5 or eye_band.shape[1] < 5:
                continue
            gray = cv2.cvtColor(eye_band, cv2.COLOR_BGR2GRAY)
            resized = cv2.resize(gray, (100, 40))
            eye_bands.append(resized)
        except Exception:
            continue

    if len(eye_bands) < 3:
        return jsonify({"blink_detected": False, "reason": "not_enough_bands", "backend": "opencv"})

    variances = []
    means = []
    for band in eye_bands:
        variances.append(float(np.var(band)))
        means.append(float(np.mean(band)))

    var_arr = np.array(variances)
    mean_arr = np.array(means)

    avg_var = float(np.mean(var_arr))
    min_var = float(np.min(var_arr))
    avg_mean = float(np.mean(mean_arr))
    min_mean = float(np.min(mean_arr))

    blink_detected = False
    blink_method = None

    if avg_var > 0:
        var_drop = (avg_var - min_var) / avg_var
        if var_drop > 0.08:
            blink_detected = True
            blink_method = "variance_drop"

    if not blink_detected and avg_mean > 0:
        mean_drop = (avg_mean - min_mean) / avg_mean
        if mean_drop > 0.03:
            blink_detected = True
            blink_method = "brightness_drop"

    return jsonify({
        "blink_detected": blink_detected,
        "valid_frames": len(eye_bands),
        "variances": [round(v, 2) for v in variances],
        "blink_method": blink_method,
        "backend": "opencv",
    })
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "supabase_configured": supabase is not None,
        "mediapipe": HAS_MEDIAPIPE,
        "dlib": HAS_DLIB,
    })


@app.route("/api/admin/face-data", methods=["GET"])
def list_face_data():
    try:
        if not supabase:
            return jsonify({"error": "Backend not configured"}), 500

        result = supabase.table("face_embeddings").select("id, user_id, email, encoding").execute()
        rows = result.data or []

        face_data = []
        for row in rows:
            enc_raw = row.get("encoding", "{}")
            if isinstance(enc_raw, str):
                enc = json.loads(enc_raw)
            else:
                enc = enc_raw
            if isinstance(enc, dict):
                dim = len(enc.get("d", []))
                version = enc.get("v", 0)
            else:
                dim = 0
                version = 0
            face_data.append({
                "id": row.get("id"),
                "user_id": row.get("user_id"),
                "email": row.get("email"),
                "encoding_version": version,
                "encoding_length": dim,
            })

        return jsonify({"success": True, "faces": face_data, "total": len(face_data)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/face-data/<face_id>", methods=["DELETE"])
def delete_face_data(face_id):
    try:
        if not supabase:
            return jsonify({"error": "Backend not configured"}), 500

        supabase.table("face_embeddings").delete().eq("id", face_id).execute()
        return jsonify({"success": True, "message": "Face data deleted"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
