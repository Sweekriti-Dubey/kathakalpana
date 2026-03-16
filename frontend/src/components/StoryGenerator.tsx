import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requireSupabaseClient } from '../lib/supabaseClient';

interface StoryGeneratorProps {
	token: string;
}

interface GeneratedChapter {
	title: string;
	content: string;
	image_prompt?: string;
	image_seed?: number;
	image_url?: string | null;
	image_error?: string | null;
}

interface GeneratedStory {
	title: string;
	moral: string;
	chapters: GeneratedChapter[];
}

const StoryGenerator: React.FC<StoryGeneratorProps> = ({ token }) => {
	const navigate = useNavigate();
	const supabase = requireSupabaseClient();
	const edgeBaseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
	const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
	const functionsBaseUrl = edgeBaseUrl?.trim()?.replace(/\/$/, '');
	const generateUrl = `${functionsBaseUrl}/generate-story`;
	const [genre, setGenre] = useState('A brave puppy in space');
	const [chapters, setChapters] = useState(3);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [useSampleImages, setUseSampleImages] = useState(true);
	const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null);

	const getTokenExpiry = (jwt: string): number | null => {
		try {
			const payload = jwt.split('.')[1];
			if (!payload) return null;
			const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
			const decoded = JSON.parse(atob(normalized));
			return typeof decoded?.exp === 'number' ? decoded.exp : null;
		} catch (_error) {
			return null;
		}
	};

	const getAccessToken = async () => {
		const fallback = token?.trim();
		const { data, error } = await supabase.auth.getSession();
		if (error) throw error;

		let accessToken = data.session?.access_token ?? fallback ?? '';
		const exp = accessToken ? getTokenExpiry(accessToken) : null;
		const now = Math.floor(Date.now() / 1000);

		if (exp !== null && exp - now < 60) {
			const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
			if (refreshError) throw refreshError;
			accessToken = refreshed.session?.access_token ?? accessToken;
		}

		return accessToken;
	};

	const generateStory = async () => {
		if (!functionsBaseUrl) {
			setError('Missing VITE_SUPABASE_FUNCTIONS_URL in frontend .env');
			return;
		}

		setLoading(true);
		setError('');
		setImageProgress(null);
		try {
			const accessToken = await getAccessToken();
			if (!accessToken) {
				throw new Error('Your session expired. Please log in again.');
			}

			const res = await fetch(generateUrl, {
				method: 'POST',
				headers: {
					apikey: supabaseAnonKey,
					'Content-Type': 'application/json',
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({ genre, chapters, use_sample_images: useSampleImages }),
			});

			if (!res.ok) {
				const errBody = await res.json().catch(() => ({}));
				throw new Error(errBody.error || `Request failed: ${res.status}`);
			}

			const contentType = res.headers.get('content-type') || '';

			if (contentType.includes('application/x-ndjson')) {
				// Streaming response: text first, then images progressively
				const reader = res.body!.getReader();
				const decoder = new TextDecoder();
				let buffer = '';
				let streamStory: GeneratedStory | null = null;

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop()!;

					for (const line of lines) {
						if (!line.trim()) continue;
						const event = JSON.parse(line);
						if (event.type === 'story_text') {
							streamStory = { title: event.title, moral: event.moral, chapters: event.chapters };
							setImageProgress({ done: 0, total: event.chapters.length });
						} else if (event.type === 'chapter_image') {
							if (streamStory) {
								const currentStory: GeneratedStory = streamStory;
								const updated = [...currentStory.chapters];
								updated[event.index] = {
									...updated[event.index],
									image_url: event.image_url,
									image_error: event.image_error,
								};
								streamStory = { ...currentStory, chapters: updated };
							}
							setImageProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : null));
						}
					}
				}

				if (streamStory) {
					navigate('/read', { state: { story: streamStory } });
				}
			} else {
				// Non-streaming JSON response (sample images)
				const data = await res.json();
				navigate('/read', { state: { story: data } });
			}
		} catch (err) {
			console.error('Generate failed:', err);
			setError(err instanceof Error ? err.message : 'Failed to generate story. Please try again.');
		} finally {
			setLoading(false);
			setImageProgress(null);
		}
	};

	return (
		<section className="story-generator">
			<h2>✨ Create a New Story</h2>

			<div className="genre-input-section">
				<input
					type="text"
					className="genre-input"
					value={genre}
					onChange={(e) => setGenre(e.target.value)}
					placeholder="Enter your story idea"
				/>

				<div className="chapter-count-section">
					<label htmlFor="chapters">Chapters: {chapters}</label>
					<input
						id="chapters"
						type="range"
						min={3}
						max={10}
						value={chapters}
						onChange={(e) => setChapters(Number(e.target.value))}
					/>
				</div>

				<div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
					<label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
						<input
							type="checkbox"
							checked={!useSampleImages}
							onChange={(e) => setUseSampleImages(!e.target.checked)}
						/>
						Generate real AI images (uses HuggingFace tokens)
					</label>
				</div>

				<button onClick={generateStory} disabled={loading || !genre.trim()}>
					{loading ? 'Generating...' : 'Generate Story'}
				</button>
			</div>

			{error && <p style={{ color: '#ff6b6b', marginTop: '16px' }}>{error}</p>}

			{imageProgress && (
				<div style={{ marginTop: '16px', textAlign: 'center' }}>
					<p style={{ color: '#a78bfa', fontWeight: 600 }}>
						🎨 Generating images… {imageProgress.done}/{imageProgress.total}
					</p>
					<div style={{ width: '100%', height: '6px', background: '#2d2d3d', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
						<div style={{
							width: `${(imageProgress.done / imageProgress.total) * 100}%`,
							height: '100%',
							background: 'linear-gradient(90deg, #a78bfa, #ec4899)',
							borderRadius: '3px',
							transition: 'width 0.5s ease',
						}} />
					</div>
				</div>
			)}
		</section>
	);
};

export default StoryGenerator;
