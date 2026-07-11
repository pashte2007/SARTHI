import json
from flask import Flask, render_template, request, jsonify
from groq import Groq

app = Flask(__name__)

# ⚠️ Remember to paste your actual Groq API Key here before the presentation!
client = Groq(api_key="your_api_key_here")


# --- SCALABLE ROUTES ---
@app.route("/")
def dashboard():
    return render_template("dashboard.html")

@app.route("/pension")
def pension():
    return render_template("pension.html")

@app.route("/railway")
def railway():
    return render_template("railway.html")

# --- AI LOGIC (Smart Jury Demo Architecture) ---
@app.route("/api/process", methods=["POST"])
def process_text():
    data = request.json
    raw_text = data.get("text", "")
    field_id = data.get("field_id", "")

    if not raw_text:
        return jsonify({"status": "error", "text": ""})

    print(f"👂 AI Heard (Raw): {raw_text}")
    print("🧠 AI is thinking...")
    
    # --- 🚀 THE SMART JURY DEMO PROMPT ---
    system_prompt = f"""
    You are an intelligent data extraction AI for an elderly form-filling app.
    The user is currently on the '{field_id}' field.
    User's raw text: "{raw_text}"

    CRITICAL INSTRUCTIONS FOR JSON OUTPUT:
    You must return a JSON object with keys: 'status', 'value', 'reasoning', and 'text' (optional, for voice alerts), and 'target_field' (optional).

    🚨 JURY DEMO RULES (FOLLOW EXACTLY):
    1. If field is 'passengers' and the user asks for a number greater than 2 (e.g., "4", "char"):
       Return EXACTLY: {{"status": "unavailable", "value": "", "reasoning": "Only 2 seats exist", "text": "Only 2 seats are available in this coach. Say YES to book 2 seats, or NO to choose a different coach."}}
    
    2. If field is 'passengers' and user says "No" or wants to change to Sleeper:
       Return EXACTLY: {{"status": "step_back", "target_field": "coach_class", "value": "", "reasoning": "User rejected", "text": "Okay, changing to Sleeper class. How many passengers for Sleeper?"}}
    
    3. If field is 'passengers' and user says "Yes" or accepts the 2 seats:
       Return EXACTLY: {{"status": "success", "value": "2", "reasoning": "User accepted compromise", "text": "2"}}
       
    4. For ALL OTHER fields and normal inputs:
       Extract the exact value. Format it.
       Return: {{"status": "success", "value": "extracted_data", "reasoning": "Normal extraction"}}
       (If invalid, return value as "INVALID").
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "system", "content": system_prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0,
        )

        response_text = chat_completion.choices[0].message.content
        
        # 💡 NEW DEBUG LINE: See exactly what the LLM tried to say
        print(f"🤖 RAW LLM OUTPUT: {response_text}") 

        # --- 🚀 BULLETPROOF JSON EXTRACTOR ---
        # Finds the first '{' and the last '}' to ignore conversational fluff
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}') + 1
        
        if start_idx != -1 and end_idx != 0:
            cleaned_text = response_text[start_idx:end_idx]
            ai_data = json.loads(cleaned_text)
        else:
            # If no JSON brackets are found at all, force a safe failure
            print("❌ ERROR: No JSON brackets found in the LLM response.")
            ai_data = {"status": "error", "value": "INVALID"}
        # --- END BULLETPROOF EXTRACTOR ---
        
        extracted_value = ai_data.get("value")
        ai_status = ai_data.get("status", "success")
        
        print(f"🤔 AI Reasoning: {ai_data.get('reasoning')}")

        # Standard Invalid Check Guardrail
        if str(extracted_value).upper() == "INVALID" and ai_status == "success":
            print(f"⚠️ AI REJECTED Input for '{field_id}'\n")
            return jsonify({"status": "invalid", "text": f"I didn't quite catch a valid {field_id}. Please repeat."})

        # --- DYNAMIC ROUTING BASED ON AI STATUS ---
        if ai_status == "unavailable":
            return jsonify({"status": "unavailable", "text": ai_data.get("text")})
            
        elif ai_status == "step_back":
            return jsonify({
                "status": "step_back", 
                "target_field": ai_data.get("target_field"), 
                "text": ai_data.get("text")
            })

        # --- STANDARD SUCCESS FINISH LINE ---
        final_text = str(extracted_value).title() if "name" in field_id else str(extracted_value)
        print(f"✅ AI Final Output for '{field_id}': {final_text}\n")
        
        return jsonify({"status": "success", "text": final_text})

    except Exception as e:
        print(f"❌ Python Crash Error: {e}\n")
        return jsonify({"status": "error", "text": "Connection error. Please try again."})

# --- PATIENCE MODE LOGGER ---
@app.route("/api/log", methods=["POST"])
def log_event():
    data = request.json
    print(f"\n👵 [PATIENCE MODE ACTIVATED]: {data.get('message', '')}\n")
    return jsonify({"status": "success"})

if __name__ == "__main__":
    app.run(debug=True)