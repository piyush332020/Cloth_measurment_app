👕 AI FitVision — Smart Clothing Measurement & Virtual Try-On

Measure yourself. Discover your perfect fit. Try it before you buy it.

AI FitVision is an AI-powered smart clothing platform that transforms the traditional online shopping experience into an interactive virtual fitting room.

Instead of guessing your size, searching through endless products, and wondering “How will this look on me?”, the system brings everything together in one seamless workflow:

📸 Measure → 📏 Predict → 🛍️ Discover → 🤖 Try On
✨ Why AI FitVision?

Online clothing shopping has two major problems:

❌ What size should I buy?
❌ How will this clothing look on me?

AI FitVision tackles both using Computer Vision + AI + Real-Time Product Search + Virtual Try-On.

Simply use your camera, let the system analyze your body measurements, get your recommended clothing size, explore real products, and finally virtually try the selected garment.

🚀 Key Features
📏 AI-Based Body Measurement

Uses MediaPipe and OpenCV to detect body landmarks from the camera and estimate relevant body measurements.


👕 Intelligent Size Prediction

Converts the estimated measurements into a clothing size:
S → M → L → XL → XXL

🛍️ Real Product Discovery

After determining the size, the application searches for relevant clothing products using SerpApi / Google Shopping based on:

Gender
Clothing category
Recommended size
Optional keywords
🤖 AI Virtual Try-On

Select a garment and enter the AI Trial Room.

Using Decart Lucy VTON, the system generates a virtual clothing experience so users can visualize the selected garment on themselves.

📷 Real-Time Camera Experience

The virtual try-on is designed around a live camera experience rather than simply displaying a static product image.

🔐 Secure API Architecture

Sensitive API keys remain on the Flask backend while the frontend receives only the information required for the corresponding service.

<img width="210" height="631" alt="image" src="https://github.com/user-attachments/assets/2d8c6ff4-fd8f-45ce-9fb5-4bc7cda86d23" />

🔥 The Complete Experience
1️⃣ Measure

Stand in front of the camera.

The system detects body landmarks and processes the captured frame.

2️⃣ Get Your Size

The measurements are processed to determine an appropriate clothing size.

3️⃣ Discover Products

The application searches for actual shopping products matching the selected category and recommended size.

4️⃣ Pick Your Outfit

Choose a garment that you want to try.

5️⃣ Enter the AI Trial Room

The selected garment is passed into the virtual try-on workflow.

6️⃣ See the AI Result

The system uses Lucy VTON to create the virtual fitting experience.

<img width="210" height="486" alt="image" src="https://github.com/user-attachments/assets/44d9f4db-618c-4585-90cc-f05a610a7830" />


