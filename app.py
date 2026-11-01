from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
import uuid
from werkzeug.utils import secure_filename
import smtplib
from email.message import EmailMessage

app = Flask(__name__, static_folder="Frontend", static_url_path="")
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
DATABASE = os.path.join(BASE_DIR, "test.db")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# DATABASE INITIALIZATION
def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            location TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            image_filename TEXT
        )
    """) # FIX: Added the missing closing parenthesis here
    
    conn.commit()
    conn.close()

# DATABASE CONNECTION
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def send_nagar_nigam_alert(category, location, count):
    msg = EmailMessage()
    msg['Subject'] = f"URGENT: High Priority Hazard Alert - {location}" # FIX: Fixed typos and f-string
    msg['From'] = "civicalert.indore@gmail.com" # FIX: 'form' was incomplete and misspelled
    msg['To'] = "test_nn.indore@mpurban.gov.in"

    # FIX: Fixed the quote formatting and properly closed the string
    body = f"""
    Attention Nagar Nigam Indore,

    A high priority civic hazard requires immediate action.

    Hazard Type: {category.upper()}
    Location: {location}
    Total Reports: {count}

    This issue has been reported by multiple citizens and requires immediate dispatch.

    Regards,
    Civic Alert Automated System
    """
    
    msg.set_content(body) # FIX: Added this missing line to attach the body to the email

    print("\n" + "="*50)
    print("MOCK EMAIL SENT TO NAGAR NIGAM:")
    print(msg.as_string())
    print("="*50 + "\n")

    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login("civicalert.indore@gmail.com", "YOUR_16_DIGIT_APP_PASSWORD")
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print("Email sending failed:", e)

# HOME
@app.route("/")
def home():
    return send_from_directory(app.static_folder, "index.html")

# CREATE REPORT
@app.route("/report", methods=["POST"])
def create_report():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "No data provided"}), 400

    required = ["title", "category", "location"]

    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    conn = get_db()
    c = conn.cursor()
    
    c.execute("""
        INSERT INTO reports
        (title, category, description, location, image_filename)
        VALUES (?, ?, ?, ?, ?)
    """, (
        data["title"],
        data["category"],
        data.get("description", ""),
        data["location"],
        data.get("image_filename")
    ))

    report_id = c.lastrowid
    conn.commit() # FIX: Removed the duplicate commit lines that were here

    # FIX: Passed parameters as a tuple, removed stray ')', and fixed "loaction" typo
    c.execute(
        "SELECT COUNT(*) FROM reports WHERE category = ? AND location = ?",
        (data["category"], data["location"]) 
    )
    
    report_count = c.fetchone()[0]

    if report_count >= 3:
        send_nagar_nigam_alert(data["category"], data["location"], report_count)

    conn.close()

    return jsonify({
        "message": "Report created successfully",
        "id": report_id
    }), 201

# GET ALL REPORTS
@app.route("/reports", methods=["GET"])
def get_reports():
    conn = get_db()
    reports = conn.execute("SELECT * FROM reports").fetchall()
    conn.close()

    return jsonify([dict(report) for report in reports])

# GET ONE REPORT
@app.route("/report/<int:report_id>", methods=["GET"])
def get_single_report(report_id):
    conn = get_db()
    report = conn.execute(
        "SELECT * FROM reports WHERE id = ?",
        (report_id,)
    ).fetchone()
    conn.close()

    if report is None:
        return jsonify({"error": "Report not found"}), 404

    return jsonify(dict(report))

# UPDATE REPORT STATUS
@app.route("/report/<int:report_id>", methods=["PUT"])
def update_report(report_id):
    data = request.get_json(silent=True)

    if not data or "status" not in data:
        return jsonify({"error": "Status is required"}), 400

    if data["status"] not in ["open", "in progress", "resolved"]:
        return jsonify({"error": "Invalid status"}), 400

    conn = get_db()
    c = conn.cursor()

    c.execute(
        "UPDATE reports SET status = ? WHERE id = ?",
        (data["status"], report_id)
    )

    updated = c.rowcount
    conn.commit()
    conn.close()

    if updated == 0:
        return jsonify({"error": "Report not found"}), 404

    return jsonify({"message": "Report status updated"})

# DELETE REPORT
@app.route("/report/<int:report_id>", methods=["DELETE"])
def delete_report(report_id):
    conn = get_db()
    c = conn.cursor()

    c.execute("DELETE FROM reports WHERE id = ?", (report_id,))
    deleted = c.rowcount

    conn.commit()
    conn.close()

    if deleted == 0:
        return jsonify({"error": "Report not found"}), 404

    return jsonify({"message": "Report deleted successfully"})

# UPLOAD IMAGE
@app.route("/upload", methods=["POST"])
def upload_image():
    if "image" not in request.files:
        return jsonify({"error": "Image not found"}), 400

    image = request.files["image"]

    if image.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not image.filename.lower().endswith((".png", ".jpg", ".jpeg")):
        return jsonify({"error": "Only PNG and JPG allowed"}), 400

    filename = secure_filename(image.filename)
    unique_filename = str(uuid.uuid4()) + "_" + filename

    image.save(os.path.join(UPLOAD_FOLDER, unique_filename))

    return jsonify({
        "message": "Image uploaded successfully",
        "filename": unique_filename
    })

# RETRIEVE IMAGE
@app.route("/uploads/<filename>", methods=["GET"])
def get_image(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# CALCULATE PRIORITY
@app.route("/report/<int:report_id>/priority", methods=["GET"])
def get_priority(report_id):
    conn = get_db()

    report = conn.execute(
        "SELECT category, location FROM reports WHERE id = ?",
        (report_id,)
    ).fetchone()

    if report is None:
        conn.close()
        return jsonify({"error": "Report not found"}), 404

    count = conn.execute(
        "SELECT COUNT(*) FROM reports WHERE category = ? AND location = ?",
        (report["category"], report["location"])
    ).fetchone()[0]

    conn.close()

    if count >= 5:
        priority = "High"
    elif count >= 3:
        priority = "Medium"
    else:
        priority = "Low"

    return jsonify({
        "reports_count": count,
        "priority": priority
    })

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=False)