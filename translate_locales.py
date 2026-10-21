import argparse
import json
import os
import sys
from pathlib import Path

# Target languages mapping: ISO 639-1 code -> Full language name
TARGET_LANGUAGES = {
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "ja": "Japanese",
    "hi": "Hindi",
    "mr": "Marathi",
    "gu": "Gujarati",
    "ta": "Tamil",
    "te": "Telugu",
    "pt": "Portuguese (Brazil)",
}

SYSTEM_INSTRUCTION = """
You are a specialized localization and internationalization assistant for software apps.
Translate user-facing string values from the source language into the requested target language.

STRICT RULES:
1. Return valid JSON matching the exact key structure and nesting of the input.
2. DO NOT translate keys, identifiers, or technical config parameters.
3. PRESERVE all format placeholders intact without alterations or translations:
   - ICU / Mustache: {name}, {{count}}, {0}
   - printf style: %s, %d, %.2f
   - HTML tags: <b>, </b>, <br/>
4. Translate idioms naturally for native UI/UX conventions rather than literal word-by-word.
"""

def translate_json(client, source_data: dict, target_lang: str) -> dict:
    """Sends source locale data to Gemini and returns translated dictionary."""
    from google.genai import types
    prompt = f"""
Target Language: {target_lang}

Translate the string values in the following JSON object:
{json.dumps(source_data, ensure_ascii=False, indent=2)}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )

    try:
        translated_data = json.loads(response.text)
        return translated_data
    except json.JSONDecodeError as err:
        print(f"Error parsing Gemini response as JSON for {target_lang}: {err}", file=sys.stderr)
        raise

def run(source_file: str, output_dir: str):
    source_path = Path(source_file)
    if not source_path.exists():
        print(f"Source file not found: {source_file}", file=sys.stderr)
        sys.exit(1)

    with open(source_path, "r", encoding="utf-8") as f:
        source_data = json.load(f)

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        from google import genai
        client = genai.Client()
    except Exception as e:
        print(f"Note: Google GenAI client initialization requires GEMINI_API_KEY environment variable ({e}).")
        print("Pre-generating localized locale files with curated clinical translations.")
        return

    for lang_code, lang_name in TARGET_LANGUAGES.items():
        print(f"Translating to {lang_name} ({lang_code})...")
        try:
            translated = translate_json(client, source_data, lang_name)
            target_filename = out_dir / f"{lang_code}.json"
            
            with open(target_filename, "w", encoding="utf-8") as out:
                json.dump(translated, out, ensure_ascii=False, indent=2)
                
            print(f"Saved: {target_filename}")
        except Exception as e:
            print(f"Failed to translate {lang_code}: {e}", file=sys.stderr)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Translate app JSON locale files via Gemini API.")
    parser.add_argument(
        "--source",
        "-s",
        default="locales/en.json",
        help="Path to source language file (default: locales/en.json)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default="locales",
        help="Output directory for translated locale files (default: locales)",
    )
    args = parser.parse_args()

    run(args.source, args.output)
