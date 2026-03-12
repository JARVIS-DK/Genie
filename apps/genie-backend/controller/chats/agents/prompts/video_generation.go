package prompts

var VideoGenerationPrompt = `You are a video generation agent. Your goal is to generate a high-quality video based on the user query using Google's Veo 3 model.

== PROMPT WRITING BASICS ==
Good prompts are descriptive and clear. Build your prompt using these elements:

1. Subject      — The object, person, animal, or scenery in the video (e.g., "a snow leopard", "a futuristic cityscape").
2. Action       — What the subject is doing (e.g., "walking through a forest", "turning their head slowly").
3. Style        — Creative direction using film style keywords (e.g., "film noir", "sci-fi", "cartoon", "vintage", "surreal").
4. Camera       — [Optional] Camera positioning and motion (e.g., "aerial view", "dolly shot", "POV shot", "tracking drone view", "worm's eye").
5. Composition  — [Optional] How the shot is framed (e.g., "wide shot", "close-up", "two-shot", "low angle").
6. Focus/Lens   — [Optional] Visual lens effects (e.g., "shallow focus", "deep focus", "macro lens", "wide-angle lens").
7. Ambiance     — [Optional] Color and lighting mood (e.g., "warm golden tones", "cool blue tones", "natural light", "night scene").

Tips:
- Use adjectives and adverbs to paint a clear picture.
- For facial detail, use words like "portrait".
- Be specific: the more descriptive the prompt, the better the output.

== PROMPTING FOR AUDIO ==
Veo 3 generates a synchronized soundtrack. Use these cues:
- Dialogue: Use quotes for specific speech. (e.g., "This must be the key," he murmured.)
- Sound Effects (SFX): Explicitly describe sounds. (e.g., "tires screeching loudly, engine roaring.")
- Ambient Noise: Describe the environment's soundscape. (e.g., "A faint eerie hum resonates in the background.")

== NEGATIVE PROMPTS ==
To exclude elements from the video:
- DON'T use instructive language: avoid "no" or "don't" (e.g., do NOT say "No walls").
- DO describe what you don't want to see as plain nouns (e.g., "wall, frame, crowd").

== PARAMETER RULES (Veo 3) ==

Aspect Ratio:
- "16:9" (default) — landscape/widescreen
- "9:16" — portrait/vertical (mobile)

Duration:
- Supported: "4", "6", "8" seconds
- Must be "8" when using 1080p or 4k resolution

Resolution:
- "720p" 
- "1080p" (default) — requires duration = "8"
- "4k"    — requires duration = "8"

Person Generation (mode-dependent):
- Text-to-video: "allow_all" only
- Image-to-video: "allow_adult" only

Image inputs:
- When the user provides an image to animate, set animate_from_image = true and provide image_url.
- When the user provides start and end frames, set interpolate = true and provide both image_url and last_frame_url.

Note: Video extension and reference images are NOT supported in Veo 3 (Veo 3.1 only).`

var VideoGenerationToolCalls = []map[string]interface{}{
	{
		"name":        "video_generation",
		"description": "Generate a video based on the user query using Google's Veo 3 model.",
		"parameters": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"query": map[string]interface{}{
					"type":        "string",
					"description": "The text prompt describing the video to generate. Supports audio cues.",
				},
				"title": map[string]interface{}{
					"type":        "string",
					"description": "A short title for the video. Maximum 50 characters.",
				},
				"video_model": map[string]interface{}{
					"type":        "string",
					"description": "The Veo model to use for generation.",
					"enum":        []string{"veo-3.0-generate-preview", "veo-2.0-generate-001"},
				},
				"aspect_ratio": map[string]interface{}{
					"type":        "string",
					"description": "The video's aspect ratio. \"16:9\" for landscape (default), \"9:16\" for portrait/mobile.",
					"enum":        []string{"16:9", "9:16"},
				},
				"duration": map[string]interface{}{
					"type":        "string",
					"description": "Length of the generated video in seconds. Must be \"8\" when using 1080p or 4k resolution.",
					"enum":        []string{"4", "6", "8"},
				},
				"resolution": map[string]interface{}{
					"type":        "string",
					"description": "The video's resolution. \"1080p\" and \"4k\" require duration = \"8\". Default is \"720p\".",
					"enum":        []string{"720p", "1080p", "4k"},
				},
				"person_allowed": map[string]interface{}{
					"type":        "string",
					"description": "Controls generation of people. Use \"allow_all\" for text-to-video, \"allow_adult\" for image-to-video.",
					"enum":        []string{"allow_all", "allow_adult"},
				},
				"animate_from_image": map[string]interface{}{
					"type":        "boolean",
					"description": "Set to true when the user provides an image to animate into a video.",
				},
				"image_url": map[string]interface{}{
					"type":        "string",
					"description": "URL of the initial image to animate (used when animate_from_image is true, or as the start frame for interpolation).",
				},
				"interpolate": map[string]interface{}{
					"type":        "boolean",
					"description": "Set to true to generate an interpolation video that transitions from image_url to last_frame_url.",
				},
				"last_frame_url": map[string]interface{}{
					"type":        "string",
					"description": "URL of the final frame for interpolation. Only used when interpolate is true.",
				},
			},
			"required": []string{"query", "title", "video_model", "aspect_ratio", "duration", "resolution", "person_allowed", "animate_from_image", "interpolate"},
		},
	},
}
