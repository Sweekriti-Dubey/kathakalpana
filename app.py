import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from story_generator import (
    generate_story,
    split_chapters,
    extract_image_prompt,
    generate_image,
    image_bytes_to_base64
)

app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return jsonify({"message": "Story Buddy Backend is running!"})

@app.route('/generate', methods=['GET'])
def generate():
    genre = request.args.get('genre', 'fantasy').strip()
    chapters = request.args.get('chapters', 3)
    token = request.args.get('token', '').strip()

    try:
        chapters = int(chapters)
        if not (1 <= chapters <= 10):
            return jsonify({"error": "Chapters must be between 1 and 10."}), 400

        if not genre:
            return jsonify({"error": "Genre is required."}), 400

        if not token.startswith("hf_"):
            return jsonify({"error": "Invalid Hugging Face token."}), 400

        print(f"🔍 Generating story: genre='{genre}', chapters={chapters}")

        raw_story = generate_story(genre, chapters, token)
        chapter_data = split_chapters(raw_story)

        if not chapter_data:
            raise ValueError("No chapters were generated. Possibly bad response from text model.")

        result = []
        for idx, (title, content) in enumerate(chapter_data, 1):
            img_prompt = extract_image_prompt(content)
            try:
                img_bytes = generate_image(img_prompt, token)
                img_b64 = image_bytes_to_base64(img_bytes)
            except Exception as e:
                print(f"⚠️ Image generation failed for chapter {idx}: {e}")
                img_b64 = ""

            result.append({
                "chapter": title,
                "content": content,
                "imagePrompt": img_prompt,
                "imageBase64": img_b64
            })

        return jsonify(result), 200

    except Exception as e:
        print(f"❌ Backend error: {e}")
        return jsonify({"error": "An error occurred while generating the story."}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
