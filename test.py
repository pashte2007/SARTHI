from groq import Groq

client = Groq(api_key="your_api_key_here")

# The inputs from the browser
current_field = "age"
user_text = "umm.. main pichle saal unnees saal ka tha" 

print(f"📦 Current Field: {current_field.upper()}")
print(f"🗣️ User said: {user_text}")
print("🧠 AI is thinking...\n")

# The dynamic prompt
# The dynamic, highly engineered prompt
# The Advanced Chain-of-Thought Prompt
system_prompt = f"""
You are an intelligent data extraction AI for a form-filling app.
The user is filling out the '{current_field}' field.
Input text: "{user_text}"

Follow these rules:
1. Translate the Hinglish to English internally. 
2. Perform logical deductions (e.g., if they say they were 19 last year, they are 20 now).
3. Return ONLY a strict JSON object. No markdown, no extra text.
4. The JSON MUST contain exactly two keys: 'reasoning' (where you explain your math/logic) and 'value' (the final extracted data).

Example format:
{{"reasoning": "User stated they were 19 last year. 19 + 1 = 20.", "value": 20}}
"""
chat_completion = client.chat.completions.create(
    messages=[{"role": "system", "content": system_prompt}],
    model="llama-3.3-70b-versatile", 
    temperature=0, 
)

print("✅ Output from AI:")
print(chat_completion.choices[0].message.content)