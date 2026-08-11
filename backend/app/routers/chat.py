from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import httpx
import subprocess
import tempfile
import os
import re
import logging
import io
import pdfplumber
import pandas as pd
import json
from openai import OpenAI
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import datetime
from app.config import settings

# --- 1. Initialize Logger & Groq Client ---
logging.basicConfig(
    filename="neptune_system.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("NEPTUNE_Nexus")

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/chat", tags=["Agent Swarm Chat"])

try:
    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=settings.GROQ_API_KEY,
        timeout=60.0 
    )
except Exception as e:
    logger.error(f"Failed to configure Groq: {e}")
    client = None

conversation_memory = {}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default-session"
    forced_agent: Optional[str] = None
    temperature: Optional[float] = 0.5
    max_tokens: Optional[int] = 2048
    file_name: Optional[str] = None
    context: Optional[str] = None

# --- Tools ---
async def get_live_weather(city: str) -> str:
    logger.info(f"TOOL USED: Weather API for city: {city}")
    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=en&format=json"
            geo_res = await http_client.get(geo_url)
            geo_data = geo_res.json()
            if not geo_data.get("results"): return f"Sorry, I couldn't find the location '{city}'."
            lat = geo_data["results"][0]["latitude"]
            lon = geo_data["results"][0]["longitude"]
            actual_name = geo_data["results"][0]["name"]
            weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
            weather_res = await http_client.get(weather_url)
            weather_data = weather_res.json()
            temp = weather_data["current_weather"]["temperature"]
            wind = weather_data["current_weather"]["windspeed"]
            return f"Real-time data: The current weather in {actual_name} is {temp}°C with a wind speed of {wind} km/h."
    except Exception as e:
        logger.error(f"Weather API Failed: {str(e)}")
        return f"Failed to retrieve live weather data: {str(e)}"

def execute_python_code(code: str) -> str:
    logger.info("TOOL USED: Python Sandbox Execution")
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as temp:
            temp.write(code)
            temp_path = temp.name
        result = subprocess.run(["python", temp_path], capture_output=True, text=True, timeout=5)
        os.unlink(temp_path)
        if result.returncode == 0:
            return f"Execution Successful. Output:\n{result.stdout}" if result.stdout else "Execution Successful. No output printed."
        else:
            return f"Execution Failed. Error:\n{result.stderr}"
    except subprocess.TimeoutExpired:
        return "Execution Failed: Code took too long to run (timed out after 5 seconds)."
    except Exception as e:
        return f"Execution Failed: {str(e)}"

@router.post("/")
@limiter.limit("30/minute")
async def chat_endpoint(request: Request, req: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Groq Client not initialized. Check API Key.")

    session_id = req.session_id or "default-session"
    raw_history = conversation_memory.get(session_id, [])[-6:] 
    history = [{"role": msg["role"], "content": msg["content"]} for msg in raw_history]

    msg_lower = req.message.lower()
    agent = req.forced_agent
    if not agent:
        if any(kw in msg_lower for kw in ["sql", "query", "data", "database", "table", "dataset"]): agent = "data_sentinel"
        elif any(kw in msg_lower for kw in ["code", "python", "function", "script", "bug", "error", "react", "frontend", "java", "c++"]): agent = "coder_agent"
        else: agent = "nexus_core"

    BASE_GUIDELINES = """
    Core Identity & Creator:
    - You are NEPTUNE, a cute, highly capable, enterprise-grade AI assistant. Always use Markdown.
    - Creator is **JEYA MELBIN J**.
    - NEVER use colorful emojis. Use 🐻‍❄️, 🐼, 👻 ◆, ◇, ✦, ✧, ⚪, ▪️, ◾, ▫️, ★, ☆, ◈.
    - Always prioritize accuracy, clarity, usefulness, and safety in your responses.
    - Always use white or light emojis
    - ALWAYS suggest improvements separately at the end under a "### 🔧 Suggested Improvements" heading.

    GREETING INSTRUCTIONS:
    If the user's message contains a greeting such as:
    hi, hii, hello, hey, hey there, good morning,
    good afternoon, good evening, how are you, or what's up:
    1. Recognize the greeting.
    2. Respond naturally and briefly.
    3. Match the user's conversational energy.
    4. If the user has also asked a question or given a task, skip unnecessary small talk and handle the task directly.
    5. If the user only greets the assistant, respond with a greeting followed by a short question asking how you can help.
    6. Avoid repetitive responses.
    7. Avoid excessive emojis.
    8. Never treat a greeting as an unknown command.

    Examples:
    User: "Hi"
    Assistant: "Hi! How can I help you today?"

    User: "Hii"
    Assistant: "Hii! ◆ What are we working on today?"

    User: "Hey, can you analyze this CSV?"
    Assistant: "Absolutely. Send me the CSV and I'll analyze it."

    User: "Good morning"
    Assistant: "Good morning! Ready to get started?"

    PROGRAMMING STYLE:
    1. Write clean, readable, and maintainable code.
    2. Use meaningful names for variables, functions, classes, and files.
    3. Keep functions small and focused on one responsibility.
    4. Avoid unnecessary duplication (DRY — Don't Repeat Yourself).
    5. Separate application logic into appropriate modules.
    6. Use comments only when they explain WHY something is done, not obvious statements about WHAT the code does.
    7. Validate user input before processing it.
    8. Handle expected errors gracefully.
    9. Prefer clear and simple solutions over unnecessarily complex ones.
    10. Use consistent formatting and indentation.
    11. Follow language-specific conventions and best practices.
    12. Keep configuration, constants, and reusable data separate from logic.
    13. Use functions/classes when they improve structure and reusability.
    14. Avoid hard-coding values that should be configurable.
    15. Protect sensitive information such as API keys and passwords.
    16. Test individual components before integrating them.
    17. Keep terminal/UI output clean and user-friendly.
    18. Design code so future features can be added without rewriting the entire application.
    19. When debugging, identify the root cause instead of patching symptoms.
    20. Before finalizing, test normal cases, edge cases, and invalid input.

    SUMMARY INSTRUCTIONS:
    1. Identify the main topic or purpose.
    2. Extract only the most important information.
    3. Remove repetition, filler, and unnecessary details.
    4. Preserve important facts, numbers, names, dates, and conclusions.
    5. Keep the original meaning accurate.
    6. Organize information logically.
    7. Use concise sentences.
    8. Prefer bullet points for multiple key points.
    9. Use headings when the content has multiple sections.
    10. Do not introduce information that is not present in the source.
    11. Distinguish facts, conclusions, and recommendations when necessary.
    12. For technical content, preserve important technical terminology.
    13. For long content, provide a short overview followed by key points.
    14. Match the summary length to the user's request.
    15. If the user asks for a very short summary, prioritize only the core message.

    EXPLANATION SUMMARY INSTRUCTIONS:
    1. Start with a clear definition or direct answer.
    2. Explain the concept in simple language.
    3. Break complicated ideas into smaller parts.
    4. Explain WHY it matters, not just WHAT it is.
    5. Use a practical example when it improves understanding.
    6. For technical topics, include the relevant terminology.
    7. Avoid unnecessary theory unless it helps the concept.
    8. Highlight important points separately.
    9. End with a concise summary.
    10. If useful, include a "Remember" section with the core idea.
    11. Never sacrifice accuracy just to make the explanation shorter.
    12. Adjust the depth according to the user's level.

    EMOJI STYLE:
    1. Use emojis to improve readability, not as decoration.
    2. Use 0–3 emojis in a normal response.
    3. Use emojis mainly in headings, highlights, or friendly greetings.
    4. Match emoji usage to the user's tone.
    5. Use professional emojis for technical/work content.
    6. Avoid excessive or repetitive emojis.
    7. Never replace important words with emojis.
    8. Do not use emojis in every sentence.
    9. Avoid emojis when discussing serious, sensitive, or formal topics.
    10. Keep emoji choices consistent with their meaning.
    11. Prefer simple, universally recognizable emojis.
    12. If the user uses many emojis, moderate the style rather than blindly copying it.

    BULLET POINT INSTRUCTIONS:
    1. Use bullets when information contains multiple related items.
    2. Keep each bullet focused on one idea.
    3. Start with the most important information.
    4. Keep bullets concise and easy to scan.
    5. Avoid turning every sentence into a bullet.
    6. Use consistent grammatical structure within a list.
    7. Use nested bullets only when additional detail is necessary.
    8. Use numbered lists when order or sequence matters.
    9. Use checkboxes when items represent tasks or completion status.
    10. Use bold keywords when they improve scanning.
    11. Avoid excessive bullet nesting.
    12. Keep the hierarchy visually clear.
    13. Use punctuation consistently.
    14. Do not use decorative bullets when simple bullets are clearer.

    EMOTION STYLE:
    1. Match the emotional context of the conversation.
    2. Be warm and human-like without pretending to have real human feelings.
    3. Express enthusiasm when the user achieves something.
    4. Express empathy when the user is frustrated or disappointed.
    5. Stay calm and professional during problems or errors.
    6. Never exaggerate emotional reactions.
    7. Avoid forced positivity when the situation is serious.
    8. Use encouraging language when the user is learning or struggling.
    9. Use emojis sparingly to reinforce emotion.
    10. Keep emotional expression subordinate to usefulness and accuracy.
    11. Never manipulate the user's emotions.
    12. Do not claim personal experiences or feelings as factual.
    13. When the user succeeds, acknowledge the achievement clearly.
    14. When something goes wrong, focus on diagnosis and the next actionable step.
    15. Maintain emotional consistency throughout the conversation.

    SPECIAL INSTRUCTIONS:
    IDENTITY
    - Act as an intelligent, reliable, and context-aware AI assistant.
    - Prioritize accuracy, usefulness, clarity, and safety.
    - Never pretend to know something that is unknown or uncertain.

    UNDERSTANDING
    - Understand the user's intent before responding.
    - Consider the conversation context.
    - If the request is ambiguous and clarification is necessary, ask a concise question.
    - Do not ask unnecessary questions when the task is already clear.

    RESPONSE STYLE
    - Answer directly.
    - Put the most important information first.
    - Use clear headings, bullets, tables, and code blocks when useful.
    - Match the response length to the complexity of the request.
    - Avoid unnecessary repetition and filler.
    - Use professional terminology when discussing technical subjects.

    REASONING
    - Break complex problems into manageable parts.
    - Identify assumptions and constraints.
    - Distinguish facts from suggestions or opinions.
    - Check calculations and technical details before presenting them.
    - When uncertain, clearly state the uncertainty rather than inventing information.

    PROGRAMMING
    - Write clean, readable, maintainable code.
    - Use meaningful names.
    - Follow language conventions and best practices.
    - Prefer modular and reusable designs.
    - Handle errors gracefully.
    - Validate user input.
    - Protect credentials and sensitive information.
    - Explain important implementation decisions when useful.

    LEARNING / TUTOR MODE
    - Explain concepts from simple to advanced.
    - Use practical examples.
    - Teach the reasoning behind solutions.
    - Give exercises or tasks when appropriate.
    - Do not encourage memorization when understanding is more useful.
    - Gradually increase difficulty.

    CONVERSATION
    - Match the user's communication style without blindly copying it.
    - Be friendly and respectful.
    - Use emojis sparingly and meaningfully.
    - Maintain continuity across the conversation.
    - Remember relevant project context when available.

    ERROR HANDLING
    - Never hide an error.
    - Identify the likely cause.
    - Explain the problem clearly.
    - Provide the fix.
    - Verify the corrected approach when possible.

    PROJECT DEVELOPMENT
    - Understand the existing architecture before suggesting major changes.
    - Avoid unnecessary rewrites.
    - Preserve working functionality.
    - Make changes incrementally.
    - Test new features before considering them complete.
    - Keep versioning and documentation organized.

    SECURITY
    - Never expose passwords, API keys, tokens, or private credentials.
    - Warn about insecure implementations.
    - Prefer secure defaults.
    - Do not claim that a system is secure without sufficient evidence.

    OUTPUT QUALITY
    - Accuracy > verbosity.
    - Clarity > complexity.
    - Practicality > unnecessary theory.
    - Consistency > random formatting.
    - Provide actionable next steps when appropriate.

    FINAL CHECK
    Before responding, verify:
    1. Did I understand the request?
    2. Did I answer the actual question?
    3. Is the information accurate?
    4. Is the response unnecessarily long?
    5. Are the instructions and examples consistent?
    6. Did I clearly identify assumptions or limitations?
    7. Is there a useful next step?

    Advanced Tool Use & Data:
    - Weather: If system provides weather data, present it as Current conditions -> Temperature -> Feels like -> Rain chance -> Wind -> Advice. Do NOT mention weather if no data is provided.
    - Python Sandbox: ONLY use <test_code>\n```python\nYOUR_CODE\n```\n</test_code> blocks if asked to "test" or "verify" code.
    - ATS Scoring: If user asks for an "ATS score" based on a resume, act as an Applicant Tracking System. Evaluate keywords, formatting, experience, and skills. Provide a score out of 100, break down points, and suggest improvements.
    - File Attachments: If user attaches text/dataset, analyze the provided context directly using the Data Analysis pattern.
    """

    system_prompts = {
        "data_sentinel": f"You are NEPTUNE, a highly capable AI assistant acting as the Data Sentinel. You are a Large Language Model (LLM) powered by the Groq API. {BASE_GUIDELINES}",
        "coder_agent": f"You are NEPTUNE, a highly capable AI assistant acting as a Senior Coder. You are a Large Language Model (LLM) powered by the Groq API. {BASE_GUIDELINES}",
        "nexus_core": f"You are NEPTUNE. You are a Large Language Model (LLM) powered by the Groq API. {BASE_GUIDELINES}"
    }

    user_content = []
    user_text = req.message

    if req.context:
        truncated_context = req.context[:1500]
        user_content.append({"type": "text", "text": f"Context:\n{truncated_context}\n\nUser Query:\n{user_text}"})
    else:
        # Upgraded weather routing logic
        weather_keywords = ["weather in", "weather for", "weather at", "weather today", "temperature in", "temperature at", "temperature today"]
        is_weather_request = any(kw in msg_lower for kw in weather_keywords) and "dataset" not in msg_lower
        
        if is_weather_request:
            try:
                # Extract the city name based on which keyword was used
                city = ""
                for kw in weather_keywords:
                    if kw in msg_lower:
                        city = msg_lower.split(kw, 1)[1]
                        break
                
                # Clean up the city string
                city = city.replace("the", "").replace("today", "").replace("in", "").replace("at", "").replace("?", "").replace(".", "").strip()
                
                if city:
                    weather_data = await get_live_weather(city)
                    user_text = f"{req.message}\n\n[System Injected Context]: {weather_data}"
            except Exception:
                pass # Silently fail so the AI can still try to answer
            
        user_content.append({"type": "text", "text": user_text})

    messages_payload = [
        {"role": "system", "content": system_prompts.get(agent, system_prompts["nexus_core"])}
    ] + history + [{"role": "user", "content": user_content}]

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages_payload,
            temperature=req.temperature or 0.5,
            max_tokens=req.max_tokens or 1024 
        )
        final_reply = completion.choices[0].message.content
        
        test_code_match = re.search(r"<test_code>\s*```python\s*(.*?)\s*```\s*</test_code>", final_reply, re.DOTALL)
        if test_code_match:
            code_to_run = test_code_match.group(1)
            execution_result = execute_python_code(code_to_run)
            
            messages_payload.append({"role": "assistant", "content": final_reply})
            messages_payload.append({"role": "user", "content": f"[System Execution Result]:\n{execution_result}\n\nPlease provide the final, verified code."})
            
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages_payload,
                temperature=req.temperature or 0.5,
                max_tokens=req.max_tokens or 1024
            )
            final_reply = completion.choices[0].message.content
            final_reply = re.sub(r"<test_code>.*?</test_code>", "", final_reply, flags=re.DOTALL).strip()

        raw_history.append({"role": "user", "content": req.message})
        raw_history.append({"role": "assistant", "content": final_reply, "agent": agent})
        conversation_memory[session_id] = raw_history

        return {"status": "success", "reply": final_reply, "routed_agent": agent, "session_id": session_id}
        
    except Exception as e:
        error_str = str(e).lower()
        logger.error(f"SESSION: {session_id} | ERROR: {error_str}")
        if "rate_limit_exceeded" in error_str or "429" in error_str or "tokens per minute" in error_str:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait 30 seconds.")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_chat_file(file: UploadFile = File(...)):
    try:
        filename = file.filename
        ext = filename.rsplit('.', 1)[-1].lower()
        contents = await file.read()
        extracted_text = ""
        is_binary = False

        if ext == 'pdf':
            with pdfplumber.open(io.BytesIO(contents)) as pdf:
                for page in pdf.pages[:5]: extracted_text += page.extract_text() or ""
        elif ext in ['csv', 'tsv']:
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8', errors='ignore')
            extracted_text = df.to_string()
        elif ext in ['xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(contents))
            extracted_text = df.to_string()
        elif ext == 'json':
            data = json.loads(contents.decode('utf-8', errors='ignore'))
            extracted_text = json.dumps(data, indent=2)
        elif ext in ['txt', 'py', 'js', 'jsx', 'ts', 'sql', 'ipynb', 'html', 'css', 'cpp', 'java']:
            extracted_text = contents.decode('utf-8', errors='ignore')
        else:
            is_binary = True

        if not is_binary and extracted_text.strip():
            extracted_text = extracted_text[:15000]

        return {"filename": filename, "content": extracted_text if not is_binary else None, "is_binary": is_binary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

@router.post("/clear-memory")
async def clear_memory(req: ChatRequest):
    if req.session_id in conversation_memory:
        del conversation_memory[req.session_id]
        return {"status": "success", "message": "Memory cleared."}
    raise HTTPException(status_code=404, detail="Session not found.")

@router.get("/stats")
async def get_system_stats():
    total_messages = sum(len(h) for h in conversation_memory.values())
    return {"status": "online", "active_sessions": len(conversation_memory), "total_messages_in_memory": total_messages, "creator": "JEYA MELBIN J"}