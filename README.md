👕 AI-Powered Smart Clothing Measurement & Virtual Try-On

An AI-powered virtual fitting room that combines Computer Vision, real-time body measurement, intelligent clothing-size recommendation, e-commerce product discovery, and AI virtual try-on into one platform.

Instead of simply asking “What size should I buy?”, this project creates an end-to-end experience:

📸 Measure → 📏 Predict Size → 🛍️ Discover Clothes → 🤖 Try Them Virtually

✨ Features
📸 Real-Time Body Measurement using MediaPipe and OpenCV
📏 Automatic Clothing Size Prediction from S to XXXL
👕 Supports different clothing categories such as T-shirts and shirts
🛍️ Real Product Recommendations using SerpApi / Google Shopping
🔎 Recommendations based on gender, category, and measured size
🤖 AI Virtual Try-On using Decart's Lucy VTON
📷 Live camera-based virtual fitting experience
⚡ Real-time image processing
🌐 Flask-based backend with an interactive web interface
🧠 How It Works
        📷 Camera / Image
              ↓
       MediaPipe + OpenCV
              ↓
      Body Landmark Detection
              ↓
       📏 Body Measurement
              ↓
       👕 Size Prediction
        S / M / L / XL...
              ↓
      🛍️ Product Search
        (SerpApi)
              ↓
       Select a Garment
              ↓
       🤖 Lucy VTON AI
              ↓
      👤 Virtual Try-On
🛠️ Tech Stack
Technology	Purpose
🐍 Python	Core application & AI processing
👁️ OpenCV	Image/video processing
🧍 MediaPipe	Human pose & landmark detection
🌐 Flask	Backend & REST APIs
🛍️ SerpApi	Real-time clothing/product discovery
🤖 Decart Lucy VTON	AI virtual try-on
💻 HTML/CSS/JavaScript	Frontend
🔐 dotenv	API key/environment management
🚀 What Makes This Project Different?

Most clothing-size applications stop after recommending a size.

This project goes a step further by connecting measurement + shopping + virtual try-on into a single workflow.

Your camera becomes a measuring tool, your measurements become a shopping assistant, and AI becomes your virtual fitting room.

🎯 Project Goal

The goal is to make online clothing selection more personalized and interactive by reducing uncertainty around both clothing size and how a selected garment may look on the user.
