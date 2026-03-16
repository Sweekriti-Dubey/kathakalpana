import React, { useState } from 'react';
import axios from 'axios';
import { Play, Square, Save } from 'lucide-react';
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
	const saveUrl = `${functionsBaseUrl}/save-story`;
	const [genre, setGenre] = useState('A brave puppy in space');
	const [chapters, setChapters] = useState(3);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [story, setStory] = useState<GeneratedStory | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
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
		setStory(null);
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
							setStory({ title: event.title, moral: event.moral, chapters: event.chapters });
							setImageProgress({ done: 0, total: event.chapters.length });
						} else if (event.type === 'chapter_image') {
							setStory((prev) => {
								if (!prev) return prev;
								const updated = [...prev.chapters];
								updated[event.index] = {
									...updated[event.index],
									image_url: event.image_url,
									image_error: event.image_error,
								};
								return { ...prev, chapters: updated };
							});
							setImageProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : null));
						}
					}
				}
			} else {
				// Non-streaming JSON response (sample images)
				const data = await res.json();
				setStory(data);
			}
		} catch (err) {
			console.error('Generate failed:', err);
			setError(err instanceof Error ? err.message : 'Failed to generate story. Please try again.');
		} finally {
			setLoading(false);
			setImageProgress(null);
		}
	};

	const saveStory = async () => {
		if (!story) return;
		if (!functionsBaseUrl) {
			setError('Missing VITE_SUPABASE_FUNCTIONS_URL in frontend .env');
			return;
		}

		setSaving(true);
		setError('');
		try {
			const accessToken = await getAccessToken();
			if (!accessToken) {
				throw new Error('Your session expired. Please log in again.');
			}

			await axios.post(saveUrl, story, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					apikey: supabaseAnonKey,
				}
			});
			alert('Story saved to your library!');
			navigate('/library');
		} catch (err) {
			console.error('Save failed:', err);
			setError('Failed to save story. Please try again.');
		} finally {
			setSaving(false);
		}
	};

	const openReader = () => {
		if (!story) return;
		navigate('/read', { state: { story } });
	};

	const toggleNarration = () => {
		if (!story) return;
		if (isPlaying) {
			window.speechSynthesis.cancel();
			setIsPlaying(false);
			return;
		}

		const text = story.chapters.map((chapter) => `${chapter.title}. ${chapter.content}`).join(' ');
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.rate = 0.95;
		utterance.pitch = 1.05;
		utterance.onend = () => setIsPlaying(false);
		setIsPlaying(true);
		window.speechSynthesis.speak(utterance);
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

			{story && (
				<div className="generated-story">
					<div className="story-header">
						<h3>{story.title}</h3>
						<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
							<button type="button" onClick={openReader} disabled={loading}>
								Read in Flip Book
							</button>
							<button
								type="button"
								onClick={toggleNarration}
								className={`audio-btn ${isPlaying ? 'playing' : ''}`}
							>
								{isPlaying ? <Square size={16} /> : <Play size={16} />}
								{isPlaying ? 'Stop Audio' : 'Play Audio'}
							</button>
							<button type="button" onClick={saveStory} disabled={saving || loading}>
								<Save size={16} style={{ marginRight: 8 }} /> {saving ? 'Saving...' : 'Save to Library'}
							</button>
						</div>
					</div>

					{story.chapters.map((chapter, index) => (
						<div key={`${chapter.title}-${index}`} className="story-chapter">
							{chapter.image_url ? (
								<img
									src={chapter.image_url}
									alt={`${chapter.title} illustration`}
									style={{ width: '100%', borderRadius: '14px', marginBottom: '16px' }}
								/>
							) : !chapter.image_error && imageProgress ? (
								<div style={{
									width: '100%', height: '200px', borderRadius: '14px', marginBottom: '16px',
									background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d3d 50%, #1a1a2e 100%)',
									display: 'flex', alignItems: 'center', justifyContent: 'center',
								}}>
									<span style={{ color: '#a78bfa', fontSize: '14px' }}>🎨 Generating image…</span>
								</div>
							) : null}
							{chapter.image_error && (
								<p style={{ color: '#ff6b6b', marginBottom: '12px' }}>
									Image unavailable: {chapter.image_error}
								</p>
							)}
							<div className="chapter-content">
								<h4>{chapter.title}</h4>
								<p>{chapter.content}</p>
							</div>
						</div>
					))}

					<div className="story-moral">
						<h4>Moral</h4>
						<p>{story.moral}</p>
					</div>
				</div>
			)}
		</section>
	);
};

export default StoryGenerator;
