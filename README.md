# AI Cloth Size Measurement (Web App)

This is a modern Flask-based web application that estimates a user's clothing size using their webcam. It is a direct port of the original PyQt5 desktop application into a web environment, retaining the core OpenCV and MediaPipe measurement logic.

## Project Structure

```text
cloth-size-app/
│
├── app.py                    # Flask application and routing
├── cloth.py                  # Core MediaPipe/OpenCV measurement logic
│
├── services/
│   ├── __init__.py
│   └── product_service.py    # Mock e-commerce product recommendations
│
├── templates/
│   └── index.html            # Main UI template (Virtual Fitting Room)
│
├── static/
│   ├── css/
│   │   └── style.css         # Modern, responsive UI styling
│   └── js/
│       └── app.js            # Webcam capture, API polling, and locking logic
│
├── data/
│   └── categories.json       # Mapping of clothing categories to keywords
│
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables
└── README.md                 # This file
```

## Setup Instructions

1. **Install Python 3.9+** (if not already installed).
2. **Create a virtual environment** (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure Environment Variables**:
   Edit the `.env` file and add your `SEARCH_API_KEY` when you are ready to integrate a real search API.

## How to Run

1. Start the Flask server:
   ```bash
   python app.py
   ```
2. Open your web browser and go to `http://localhost:5000`.

## How It Works

### 1. Camera Measurement
- The user's browser accesses the webcam via `navigator.mediaDevices.getUserMedia()`.
- The live video is displayed on a `<video>` element.
- A hidden `<canvas>` captures frames roughly every 300ms.
- The frame is converted to a base64 JPEG and sent to the Flask backend (`POST /api/measure`).
- `cloth.py` decodes the image, runs the existing MediaPipe Pose estimation, calibrates the focal length based on face width, and estimates distance and size.
- The result is returned to the frontend.

### 2. The 3-Second Size Lock
- The automatic lock logic is implemented in `static/js/app.js`.
- It monitors the `ready` and `size` fields from the backend response.
- If the distance is perfect and a size is detected, a 3-second timer starts.
- If the size changes or the user moves out of the valid distance range, the timer resets.
- If the same size holds steady for 3 consecutive seconds, the measurement locks automatically.

### 3. Manual Capture
- Once the user is at a "Perfect Distance" and a size is detected, the "Capture Size Now" button enables.
- The user can click it to immediately lock the currently detected size, bypassing the 3-second timer.

### 4. Product Recommendations
- When a size is locked, the frontend sends the Category, Gender, and Locked Size to `POST /api/recommend`.
- `services/product_service.py` intercepts this call. Currently, it generates formatted mock product data.
- The frontend renders these products in a responsive grid.

## Limitations

- **Performance Constraints:** Sending base64 images over HTTP 3-4 times a second can cause slight latency on slow networks or older laptops. 
- **Mock Product Data:** The `product_service.py` currently returns mock data. To get real products, you will need to replace the mock generation block with an actual HTTP request to an API (like SerpAPI or Amazon API).
- **Lighting and Backgrounds:** Since the backend relies on MediaPipe pose tracking without depth sensors, poor lighting or complex backgrounds may affect detection accuracy.
- **Single Person:** The measurement assumes only one person is in the frame.
