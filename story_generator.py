import requests
import base64
from io import BytesIO

def generate_story(genre, chapters, token):
    prompt = f"Write a {chapters}-chapter children's story based on the theme: {genre}.\n\n"
    print("📜 Sending prompt to Hugging Face text model...")
    print("Prompt:", prompt)

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
        headers=headers,
        json={"inputs": prompt}
    )

    print("📦 Raw response:", response.text)

    try:
        result = response.json()
        print("🧪 Parsed result:", result)

        if isinstance(result, list) and "generated_text" in result[0]:
            return result[0]["generated_text"]
        elif "error" in result:
            raise ValueError(f"Hugging Face returned error: {result['error']}")
        else:
            raise ValueError(f"Invalid response format: {result}")
    except Exception as e:
        print(f"❌ Text generation failed: {e}")
        raise

def split_chapters(story_text):
    print("📚 Splitting story into chapters...")
    chapters = story_text.split("Chapter ")[1:]  # Skip anything before Chapter 1
    chapter_list = []
    for chapter in chapters:
        lines = chapter.strip().splitlines()
        if not lines:
            continue
        title = "Chapter " + lines[0].strip()
        content = "\n".join(lines[1:]).strip()
        chapter_list.append((title, content))
    print(f"✅ Found {len(chapter_list)} chapters.")
    return chapter_list

def extract_image_prompt(text):
    prompt = "illustration of: " + text[:200]
    print("🖼️ Generated image prompt:", prompt)
    return prompt

def generate_image(prompt, token):
    headers = {"Authorization": f"Bearer {token}"}
    print("🖌️ Sending prompt to Hugging Face image model...")
    response = requests.post(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2",
        headers=headers,
        json={"inputs": prompt}
    )

    if response.status_code != 200:
        raise Exception(f"Image generation failed: {response.status_code} - {response.text}")

    print("✅ Image generated successfully.")
    return BytesIO(response.content).getvalue()

def image_bytes_to_base64(image_bytes):
    return base64.b64encode(image_bytes).decode('utf-8')
