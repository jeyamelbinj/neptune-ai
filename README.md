🪐 NEPTUNE - AI CHATBOT
🚀 Version 2.0
STATUS: FINAL STAGE ✅
Live Demo: https://neptune-ai-ecru.vercel.app/

An enterprise-grade, cinematic AI assistant built with React, Three.js, and FastAPI. NEPTUNE bridges the gap between advanced Large Language Models (LLMs) and interactive data engineering, featuring a live 3D interface and a powerful backend ecosystem.

——————————————————————————————————————————————————————————————————————————————————————————————————————————

👨‍💻 Developer
JEYA MELBIN J

🔗 LinkedIn:
www.linkedin.com/in/jeyamelbinjeyakumar

🔗 GitHub:
https://github.com/jeyamelbin

🔗 Portfolio:
https://jeyamelbinj.github.io/melbin-portfolio/

——————————————————————————————————————————————————————————————————————————————————————————————————————————

📌 Project Overview
NEPTUNE is the highly advanced successor to MIKA v1.0. Transitioning from a simple rule-based terminal script, NEPTUNE is now a full-stack web application featuring a live 3D Three.js interface, custom audio synthesis, and a powerful FastAPI backend ecosystem.

The assistant uses Large Language Models (LLMs), specifically Llama 3.1 via the Groq API, to understand user intent, write production-ready code, analyze datasets, and perform complex reasoning tasks in real-time.

——————————————————————————————————————————————————————————————————————————————————————————————————————————

✨ Key Features
🧠 1. LLM-Powered Swarm Intelligence
NEPTUNE doesn't just use one prompt. It routes queries to specialized AI agents (Coder, Data Sentinel) utilizing the Groq API for ultra-low latency responses.

Context-Aware: Maintains conversation history for deep, multi-turn reasoning.
Role Adoption: Dynamically shifts tone from "Senior Engineer" to "Data Analyst" based on the task.
Tool Use: Can execute Python sandbox code to verify solutions before presenting them.
📊 2. Data Sentinel Hub
A built-in Pandas-powered data analysis suite. Users can upload CSVs, Excel, and PDFs directly into the browser to clean, impute, and deduplicate datasets instantly.

Auto-detect and fill missing values (Mean, Median, Mode, Zero).
Remove duplicate rows and auto-format datasets.
Generate mathematical aggregates (Sum, Mean, Median, Variance, Std Dev) instantly.
🌌 3. Cinematic 3D Interface
A live, breathing Three.js robot with gyroscopic rings, glassmorphism panels, and real-time cursor tracking.

Living AI Voice Pack: Custom Web Audio API synthesized UI sounds and a living AI voice (Text-to-Speech) for the intro sequence.
Premium Chat UX: Custom tick-scrollbar, traveling light borders, and full mobile responsiveness.
🛠️ 4. Advanced Tools & ATS Scoring
ATS Resume Scoring: Evaluates uploaded resumes against Applicant Tracking System criteria.
Live Weather API: Fetches real-time meteorological data.
File Parsing: Extracts text from PDFs, CSVs, and code files seamlessly.

——————————————————————————————————————————————————————————————————————————————————————————————————————————

🏗️ Project Architecture
neptune/│├── backend/                 # FastAPI Python Backend│   ├── app/│   │   ├── config.py        # API Keys & DB Config (.env)│   ├── main.py              # FastAPI Entry Point│   │   └── routers/│   │       ├── chat.py      # LLM Routing, Memory, & Tools│   │       └── data_engine.py # Pandas Data Hub│   └── requirements.txt│└── frontend/                # React Three.js Frontend    └── src/        ├── components/     # 3D Canvas, Chat UI, Settings        ├── hooks/          # Custom React Hooks (Audio)        └── assets/        # NEPTUNE Brand Logos

——————————————————————————————————————————————————————————————————————————————————————————————————————————

🛠️ Technologies Used
Technology
Purpose
React + Vite	Frontend UI & SPA Architecture
Three.js	3D robot, rings, and lighting
Tailwind CSS	Styling and Glassmorphism
FastAPI	High-performance Python backend
Pandas	Data cleaning and manipulation
Groq API	Ultra-fast LLM inference (Llama 3.1)
Web Audio API	Synthesized creature voice & UI sounds

——————————————————————————————————————————————————————————————————————————————————————————————————————————

⚙️ Installation & Setup
1. Backend Setup

bash
cd backend
python -m venv env
env\Scripts\activate
pip install -r requirements.txt

Create a .env file in the backend/ directory:

env
GROQ_API_KEY=your_groq_api_key_here

Run the backend server:

bash
python -m uvicorn app.main:app --reload

2. Frontend Setup

bash
cd frontend
npm install
npm run dev
Open your browser and go to http://localhost:5173

——————————————————————————————————————————————————————————————————————————————————————————————————————————

▶️ Sample Interaction
========================================
        🪐 NEPTUNE - AI CHATBOT
========================================

You: Hi

NEPTUNE:
Hi! How can I help you today?

You: Write a Python function for a palindrome. Make sure it actually works before giving it to me.

NEPTUNE:
The code has been verified to correctly check for a palindrome.
```python
def is_palindrome(s: str) -> bool:
    s = ''.join(c for c in s if c.isalnum()).lower()
    return s == s[::-1]

You: Upload this CSV and tell me the missing values.
NEPTUNE:
Based on the dataset provided, there are 142 missing values detected.


---

## 🎯 Project Objectives

- Build a cinematic, enterprise-grade AI assistant from scratch.
- Implement a 3D web interface using Three.js and React.
- Integrate LLMs (Llama 3.1) with a FastAPI backend.
- Create a custom audio synthesis engine using the Web Audio API.
- Perform real-time data analysis using Pandas.

---

## 🚀 Future Improvements

- Cloud Deployment (Vercel + Render)
- Database integration (PostgreSQL) for persistent chat history
- User authentication and private accounts
- Streaming LLM responses (Server-Sent Events) for faster feedback

---

## 📚 Learning Outcomes

Through this project, I gained experience in:

✅ Full-Stack Web Development (React + FastAPI)  
✅ Integrating Large Language Models (LLMs) & Groq API  
✅ 3D Web Graphics (Three.js)  
✅ Audio Synthesis with Web Audio API  
✅ Advanced Pandas Data Engineering  
✅ UI/UX Design with Tailwind CSS

---

## 📄 License

This project is licensed under the MIT License.

---

## 📬 Contact

**JEYA MELBIN J**

**GitHub:**  
[https://github.com/jeyamelbin](https://github.com/jeyamelbin)

**LinkedIn:**  
[www.linkedin.com/in/jeyamelbinjeyakumar](https://www.linkedin.com/in/jeyamelbinjeyakumar)

**Portfolio:**  
[https://jeyamelbinj.github.io/melbin-portfolio/](https://jeyamelbinj.github.io/melbin-portfolio/)

——————————————————————————————————————————————————————————————————————————————————————————————————————————
