import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requireSupabaseClient } from '../lib/supabaseClient';
import { Search, Book, Feather, Layers, Minus, Plus, Sparkles, Globe } from 'lucide-react';

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
	const [genre, setGenre] = useState('');
	const [chapters, setChapters] = useState(3);
	const [language, setLanguage] = useState('English');
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
				body: JSON.stringify({ genre, chapters, use_sample_images: useSampleImages, language }),
			});

			if (!res.ok) {
				const errBody = await res.json().catch(() => ({}));
				throw new Error(errBody.error || `Request failed: ${res.status}`);
			}

			const contentType = res.headers.get('content-type') || '';

	
				if (contentType.includes('application/x-ndjson')) {
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
		<div className="flex flex-col items-center max-w-[900px] mx-auto px-5 py-10">

			<div className="text-center mb-10">
				<h1 style={{ fontSize: '2.4em', margin: '0 0 12px 0' }}>
					What Story Will You Create Today?
				</h1>
			</div>

			<section className="card-base w-full p-8" style={{ backgroundColor: 'rgb(var(--app-surface))' }}>


				<div className="story-generator-input flex items-center rounded-xl p-3.5 mb-5">
					<Search className="mr-3 text-gray-400" size={20} />
					<input
						type="text"
						className="flex-1 border-none outline-none bg-transparent font-base text-lg placeholder-opacity-60"
						value={genre}
						onChange={(e) => setGenre(e.target.value)}
						placeholder="Describe your story idea... (e.g., 'A wizard lost in time')"
					/>
				</div>

				<div className="flex gap-4 mb-6">

					<button type="button" className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-br from-app-violet/20 to-app-pink/15 text-app-violet px-6 py-3 rounded-xl font-semibold border-[1.5px] border-app-violet/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-app-violet/30 disabled:opacity-50 disabled:cursor-not-allowed">
						<Book size={18} className="inline" /> Story
					</button>
					<button type="button" onClick={() => alert("Poems coming soon!")} className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-br from-app-violet/20 to-app-pink/15 text-app-violet px-6 py-3 rounded-xl font-semibold border-[1.5px] border-app-violet/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-app-violet/30 disabled:opacity-50 disabled:cursor-not-allowed">
						<Feather size={18} className="inline" /> Poem
					</button>

					<div className="language-selector flex items-center gap-1.5 px-3 py-1.5 rounded-xl">
						<Globe size={18} className="text-violet-600" />
						<select 
							value={language}
							onChange={(e) => setLanguage(e.target.value)}
							className="border-none outline-none text-sm font-semibold cursor-pointer"
						>
							<option value="English">English</option>
							<option value="Hindi">Hindi (हिन्दी)</option>
							<option value="Spanish">Spanish</option>
							<option value="French">French</option>
							<option value="German">German</option>
							<option value="Japanese">Japanese</option>
							<option value="Arabic">Arabic</option>
						</select>
					</div>

					<div className="chapters-control flex items-center gap-3 rounded-xl px-3 py-2">
						<Layers size={18} className="text-violet-600 flex-shrink-0" />
						<span className="chapters-control-text font-medium text-sm whitespace-nowrap flex-shrink-0">Chapters:</span>
						<div className="flex items-center gap-2 flex-shrink-0">
							<button type="button" onClick={() => setChapters(Math.max(1, chapters - 1))} className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-app-violet/20 to-app-pink/15 text-app-violet px-2 py-1 rounded-md font-semibold border-[1.5px] border-app-violet/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-app-violet/30 disabled:opacity-50 disabled:cursor-not-allowed">
								<Minus size={14} />
							</button>
							<span className="chapters-count font-bold w-6 text-center">{chapters}</span>
							<button type="button" onClick={() => setChapters(Math.min(10, chapters + 1))} className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-app-violet/20 to-app-pink/15 text-app-violet px-2 py-1 rounded-md font-semibold border-[1.5px] border-app-violet/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-app-violet/30 disabled:opacity-50 disabled:cursor-not-allowed">
								<Plus size={14} />
							</button>
						</div>
					</div>
				</div>

				<button
					type="button"
					onClick={generateStory}
					disabled={loading || !genre.trim()}
					className="button px-8 py-3 rounded-full font-semibold shadow-lg shadow-app-violet/30 hover:-translate-y-1 hover:scale-105 hover:shadow-xl hover:shadow-app-violet/40 active:scale-95 transition-all duration-300 border-none inline-flex items-center justify-center gap-2.5 w-full mt-2 text-base"
				>
					{loading ? (
						<>Generating… <Sparkles size={18} className="animate-spin" /></>
					) : (
						<><Sparkles size={18} /> Generate Story</>
					)}
				</button>
			</section>

			<div className="mt-4 flex items-center justify-center gap-2">
				<label className="cursor-pointer flex items-center gap-1.5 text-gray-500 text-sm">
					<input
						type="checkbox"
						checked={!useSampleImages}
						onChange={(e) => setUseSampleImages(!e.target.checked)}
					/>
					Generate real AI images (uses HuggingFace tokens)
				</label>
			</div>

			{/* Error Message */}
			{error && <p className="text-red-500 mt-4 text-center">{error}</p>}

			{/* Image Progress */}
			{imageProgress && (
				<div className="mt-4 text-center w-full">
					<p className="story-text-accent font-semibold">
						🎨 Generating images… {imageProgress.done}/{imageProgress.total}
					</p>
					<div className="progress-bar-dark w-full h-1.5 rounded-sm mt-2 overflow-hidden">
						<div 
							style={{
								width: `${(imageProgress.done / imageProgress.total) * 100}%`,
								height: '100%',
								background: 'linear-gradient(90deg, #a78bfa, #ec4899)',
								borderRadius: '2px',
								transition: 'width 0.5s ease',
							}} 
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default StoryGenerator;
