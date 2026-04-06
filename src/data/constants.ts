// Static data constants for Sonic Bloom Expo

export const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";
export const API_FALLBACK = "https://saavn.dev";

export const RECENTLY_PLAYED_KEY = "sonic_recently_played_native";
export const SEARCH_HISTORY_KEY = "sonic_search_history_native";
export const SEARCH_HISTORY_MAX = 10;
export const SONGS_PER_PAGE = 20;

export const TRENDING_SEARCHES = [
  // Bengali
  { title: "Arijit Singh Bangla", query: "Arijit Singh bengali hits", color: "#1a0808", category: "Bengali" },
  { title: "Anupam Roy Classics", query: "Anupam Roy best songs", color: "#081a1a", category: "Bengali" },
  { title: "Fossils & Rupam", query: "Fossils bangla band rock", color: "#1a1a1a", category: "Bengali" },
  { title: "Rabindra Sangeet", query: "best of rabindra sangeet collection", color: "#2a1a0a", category: "Bengali" },
  { title: "Nachiketa Hits", query: "Nachiketa Chakraborty hits", color: "#1a0f00", category: "Bengali" },
  { title: "Manna Dey Evergreen", query: "Manna Dey bengali old hits", color: "#0f0a1a", category: "Bengali" },
  { title: "Kolkata Movie Hits", query: "latest bengali movie songs", color: "#1a0008", category: "Bengali" },
  { title: "Jeet Gannguli Hits", query: "Jeet Gannguli bengali songs", color: "#08081a", category: "Bengali" },
  { title: "Hemanta Mukherjee", query: "Hemanta Mukherjee bengali hits", color: "#0a1a1a", category: "Bengali" },
  { title: "Srikanta Acharya", query: "Srikanta Acharya adhunik", color: "#1a2a2a", category: "Bengali" },
  { title: "Cactus Band", query: "Cactus bangla band hits", color: "#2a1a1a", category: "Bengali" },
  { title: "Pujo Hits 2024", query: "sharadiya pujo special songs", color: "#2a2a0a", category: "Bengali" },
  // Hindi
  { title: "Arijit Heartbreak", query: "arijit singh sad songs hindi", color: "#1a0000", category: "Hindi" },
  { title: "90s Bollywood", query: "90s evergreen hindi hits", color: "#0f0a1a", category: "Hindi" },
  { title: "Hindi Lofi Chill", query: "lofi hindi songs chill mix", color: "#08081a", category: "Hindi" },
  { title: "Badshah Party", query: "Badshah latest party hits", color: "#1a0008", category: "Hindi" },
  { title: "Emraan Hashmi Hits", query: "best of emraan hashmi songs", color: "#000a1a", category: "Hindi" },
  { title: "KK Soulful", query: "best of KK hindi songs", color: "#1a1a00", category: "Hindi" },
  { title: "Kishore Kumar Hits", query: "Kishore Kumar evergreen hits", color: "#2a1a1a", category: "Hindi" },
  { title: "Lata Mangeshkar", query: "Lata Mangeshkar golden hits", color: "#1a2a1a", category: "Hindi" },
  { title: "Hindi Rap / Indie", query: "hindi hip hop rap songs", color: "#0a0a1a", category: "Hindi" },
  { title: "Pritam Magic", query: "best of pritam songs", color: "#1a1a1a", category: "Hindi" },
  { title: "Shreya Ghoshal Hindi", query: "Shreya Ghoshal hindi hits", color: "#2a0a1a", category: "Hindi" },
  { title: "Latest Hindi 2025", query: "top bollywood songs 2025", color: "#001a1a", category: "Hindi" },
  // Bhojpuri
  { title: "Pawan Singh Hits", query: "Pawan Singh bhojpuri songs", color: "#2a1a00", category: "Bhojpuri" },
  { title: "Khesari Lal Dance", query: "Khesari Lal Yadav bhojpuri dance", color: "#1a2a0a", category: "Bhojpuri" },
  { title: "Shilpi Raj Hits", query: "Shilpi Raj bhojpuri latest", color: "#2a0a0a", category: "Bhojpuri" },
  { title: "Bhojpuri Bol Bam", query: "bhojpuri bhakti shiva songs", color: "#0a2a1a", category: "Bhojpuri" },
  { title: "Bhojpuri Sad Gane", query: "bhojpuri dard bhare gane", color: "#1a1a2a", category: "Bhojpuri" },
  { title: "Nirahua Best", query: "Dinesh Lal Yadav Nirahua hits", color: "#2a1a2a", category: "Bhojpuri" },
  // English
  { title: "Billboard Top 100", query: "billboard hot 100 english", color: "#0a1a1a", category: "English" },
  { title: "Taylor Swift Hits", query: "Taylor Swift best songs", color: "#1a0a2a", category: "English" },
  { title: "Justin Bieber", query: "Justin Bieber hits", color: "#0a1a2a", category: "English" },
  { title: "English Rock", query: "classic rock songs english", color: "#2a2a2a", category: "English" },
  { title: "EDM Party", query: "best edm house music hits", color: "#001a1a", category: "English" },
  { title: "Eminem Rap", query: "Eminem best rap songs", color: "#1a1a1a", category: "English" },
  { title: "Post Malone", query: "Post Malone top hits", color: "#0a0a1a", category: "English" },
  // Mood
  { title: "Rainy Day Bangla", query: "bengali rainy day songs collection", color: "#001a2a", category: "Mood" },
  { title: "Coffee House Adda", query: "coffee house bengali hits", color: "#2a1a0a", category: "Mood" },
  { title: "Midnight Hindi", query: "hindi slow and reverb songs", color: "#0a0a1a", category: "Mood" },
  { title: "Gym Motivation", query: "heavy gym workout music hindi", color: "#2a0000", category: "Mood" },
  { title: "Best of Sufi", query: "bollywood sufi hits collection", color: "#1a1a00", category: "Mood" },
];

export const MOODS = [
  { name: "Bollywood", emoji: "🎬", color: "#dc2626", query: "bollywood songs hits" },
  { name: "Romantic", emoji: "❤️", color: "#ec4899", query: "romantic bollywood songs" },
  { name: "Sad", emoji: "😢", color: "#3b82f6", query: "dard bhare sad songs" },
  { name: "Party", emoji: "🎉", color: "#f59e0b", query: "party songs hindi" },
  { name: "Devotional", emoji: "🙏", color: "#d97706", query: "devotional bhajan songs" },
  { name: "Bengali", emoji: "🎵", color: "#10b981", query: "bengali popular songs" },
  { name: "Retro", emoji: "📻", color: "#7c3aed", query: "old hindi classic songs" },
  { name: "Workout", emoji: "💪", color: "#ef4444", query: "workout motivation songs" },
  { name: "Chill", emoji: "🌊", color: "#06b6d4", query: "chill hindi songs" },
  { name: "Rap", emoji: "🎤", color: "#374151", query: "rap songs hindi" },
];

export const LABELS = [
  { name: "T-Series", query: "T-Series songs", color: "#1d4ed8" },
  { name: "Saregama", query: "Saregama classics", color: "#92400e" },
  { name: "Zee Music", query: "Zee Music Company", color: "#6d28d9" },
  { name: "Sony Music", query: "Sony Music India", color: "#0369a1" },
  { name: "YRF Music", query: "YRF Music", color: "#991b1b" },
  { name: "Tips", query: "Tips Official", color: "#065f46" },
];

export const ERAS = [
  { name: "70s", subtitle: "Golden Era", query: "old hindi songs 1970", color: "#92400e" },
  { name: "80s", subtitle: "Retro Magic", query: "hindi songs 1980", color: "#6d28d9" },
  { name: "90s", subtitle: "Nostalgia", query: "hindi songs 1990", color: "#1d4ed8" },
  { name: "2000s", subtitle: "Millennium", query: "hindi songs 2000", color: "#065f46" },
  { name: "2010s", subtitle: "Modern Era", query: "hindi songs 2015", color: "#991b1b" },
  { name: "2020s", subtitle: "Now", query: "latest hindi songs 2025", color: "#4338ca" },
];

export const HINDI_ARTISTS = [
  { name: "Arijit Singh", image: "https://c.saavncdn.com/artists/Arijit_Singh_500x500.jpg", query: "Arijit Singh hits" },
  { name: "Shreya Ghoshal", image: "https://c.saavncdn.com/artists/Shreya_Ghoshal_500x500.jpg", query: "Shreya Ghoshal songs" },
  { name: "Sonu Nigam", image: "https://c.saavncdn.com/artists/Sonu_Nigam_500x500.jpg", query: "Sonu Nigam hits" },
  { name: "Kumar Sanu", image: "https://c.saavncdn.com/artists/Kumar_Sanu_500x500.jpg", query: "Kumar Sanu hits" },
  { name: "Atif Aslam", image: "https://c.saavncdn.com/artists/Atif_Aslam_500x500.jpg", query: "Atif Aslam hits" },
  { name: "Alka Yagnik", image: "https://c.saavncdn.com/artists/Alka_Yagnik_500x500.jpg", query: "Alka Yagnik songs" },
  { name: "KK", image: "https://c.saavncdn.com/artists/KK_500x500.jpg", query: "KK artist" },
  { name: "Jubin Nautiyal", image: "https://c.saavncdn.com/artists/Jubin_Nautiyal_500x500.jpg", query: "Jubin Nautiyal" },
  { name: "Sunidhi Chauhan", image: "https://c.saavncdn.com/artists/Sunidhi_Chauhan_500x500.jpg", query: "Sunidhi Chauhan" },
  { name: "Mohit Chauhan", image: "https://c.saavncdn.com/artists/Mohit_Chauhan_500x500.jpg", query: "Mohit Chauhan" },
  { name: "Pawan Singh", image: "https://c.saavncdn.com/artists/Pawan_Singh_500x500.jpg", query: "Pawan Singh bhojpuri songs" },
  { name: "Khesari Lal", image: "https://c.saavncdn.com/artists/Khesari_Lal_Yadav_500x500.jpg", query: "Khesari Lal Yadav" },
];

export const BENGALI_ARTISTS = [
  { name: "Anupam Roy", image: "https://c.saavncdn.com/artists/Anupam_Roy_500x500.jpg", query: "Anupam Roy best songs" },
  { name: "Nachiketa", image: "https://c.saavncdn.com/artists/Nachiketa_Chakraborty_500x500.jpg", query: "Nachiketa Chakraborty hits" },
  { name: "Fossils", image: "https://c.saavncdn.com/artists/Fossils_500x500.jpg", query: "Fossils Band" },
  { name: "Rupankar", image: "https://c.saavncdn.com/artists/Rupankar_Bagchi_500x500.jpg", query: "Rupankar Bagchi" },
  { name: "Manna Dey", image: "https://c.saavncdn.com/artists/Manna_Dey_500x500.jpg", query: "Manna Dey" },
  { name: "Lopamudra", image: "https://c.saavncdn.com/artists/Lopamudra_Mitra_500x500.jpg", query: "Lopamudra Mitra" },
  { name: "Shilpi Raj", image: "https://c.saavncdn.com/artists/Shilpi_Raj_500x500.jpg", query: "Shilpi Raj bhojpuri latest" },
];

export const CUSTOM_SEARCH_KEYWORDS = [
  // Duet Jodi - Hindi
  { title: "Kumar Sanu & Alka Yagnik", query: "Kumar Sanu and Alka Yagnik romantic hits", color: "#2a0000", category: "Jodi" },
  { title: "Udit Narayan & Alka Yagnik", query: "Udit Narayan and Alka Yagnik best duets", color: "#001a2a", category: "Jodi" },
  { title: "Arijit & Shreya Ghoshal", query: "Arijit Singh and Shreya Ghoshal hindi duets", color: "#1a0808", category: "Jodi" },
  { title: "Sonu Nigam & Shreya", query: "Sonu Nigam and Shreya Ghoshal hits", color: "#0a1a0a", category: "Jodi" },
  { title: "Atif Aslam & Shreya", query: "Atif Aslam and Shreya Ghoshal romantic songs", color: "#1a1a00", category: "Jodi" },
  { title: "Abhijeet & Alka Yagnik", query: "Abhijeet Bhattacharya and Alka Yagnik hits", color: "#2a0a2a", category: "Jodi" },
  { title: "KK & Shreya Ghoshal", query: "KK and Shreya Ghoshal duet collection", color: "#002a1a", category: "Jodi" },
  { title: "Mohit Chauhan & Shreya", query: "Mohit Chauhan and Shreya Ghoshal hits", color: "#1a0f00", category: "Jodi" },
  // Duet Jodi - Bengali
  { title: "Anupam & Prashmita", query: "Anupam Roy and Prashmita Paul hits", color: "#0a1a2a", category: "Jodi" },
  { title: "Arijit & Shreya (Bangla)", query: "Arijit Singh and Shreya Ghoshal bengali duets", color: "#1a0008", category: "Jodi" },
  { title: "Kumar Sanu & Alka (Bangla)", query: "Kumar Sanu and Alka Yagnik bengali hits", color: "#1a1a1a", category: "Jodi" },
  { title: "Rupankar & Lopamudra", query: "Rupankar Bagchi and Lopamudra Mitra songs", color: "#2a1a0a", category: "Jodi" },
  { title: "Nachiketa & Subhamita", query: "Nachiketa Chakraborty and Subhamita Banerjee duets", color: "#0f0a1a", category: "Jodi" },
  { title: "Jeet & Shreya (Bangla)", query: "Jeet Gannguli and Shreya Ghoshal bengali songs", color: "#081a08", category: "Jodi" },
  // Duet Jodi - Bhojpuri
  { title: "Pawan Singh & Shilpi Raj", query: "Pawan Singh and Shilpi Raj bhojpuri hits", color: "#2a1a00", category: "Jodi" },
  { title: "Khesari & Priyanka Singh", query: "Khesari Lal Yadav and Priyanka Singh duets", color: "#1a2a0a", category: "Jodi" },
  { title: "Nirahua & Amrapali", query: "Nirahua and Amrapali Dubey bhojpuri hits", color: "#2a0a0a", category: "Jodi" },
  // Mood
  { title: "Kolkata Monsoon Vibe", query: "bengali rainy day barish songs", color: "#002a3a", category: "Mood" },
  { title: "Midnight Heartbreak", query: "hindi extremely sad broken heart songs", color: "#1a1a2a", category: "Mood" },
  { title: "Highway Drive Hindi", query: "hindi road trip travel songs", color: "#2a2a00", category: "Mood" },
  { title: "Pujo 2025 Dance", query: "bengali dhak and pujo dance hits", color: "#3a0000", category: "Mood" },
  { title: "Coffee House Adda", query: "soulful bengali acoustic songs", color: "#1a0f00", category: "Mood" },
  { title: "Hindi Lofi Sleep", query: "hindi lofi soft songs for sleep", color: "#0a0a2a", category: "Mood" },
  { title: "Sufi Soul Hindi", query: "best of bollywood sufi and qawwali", color: "#2a1a00", category: "Mood" },
  { title: "Bengali Rock Spirit", query: "bangla band rock and alternative hits", color: "#1a1a1a", category: "Mood" },
  { title: "Wedding Sangeet", query: "bollywood sangeet and mehendi dance", color: "#2a002a", category: "Mood" },
  { title: "Workout Energy", query: "hindi high bass workout motivation", color: "#3a0a00", category: "Mood" },
  // English Vibes
  { title: "English Chill Pop", query: "late night english chill pop hits", color: "#0a1a1a", category: "Mood" },
  { title: "Romantic English Duets", query: "best english romantic duet songs", color: "#2a1a2a", category: "Mood" },
  { title: "Hip-Hop Party English", query: "top english hip hop rap party", color: "#1a1a1a", category: "Mood" },
];

export const QUICK_PICKS = [
  { title: "Arijit Singh Top 20", desc: "Most popular tracks", query: "Arijit Singh top hits", color: "#1a0808" },
  { title: "Bengali Modern", desc: "Contemporary bengali hits", query: "modern bengali songs", color: "#081a08" },
  { title: "Bollywood Blockbusters", desc: "Chart-topping movie songs", query: "bollywood blockbuster songs", color: "#1a0f00" },
  { title: "Lofi & Chill", desc: "Relaxed vibes", query: "lofi hindi songs chill", color: "#08081a" },
];


export const TIME_GREETINGS: Record<string, { title: string; subtitle: string; emoji: string; query: string }> = {
  morning: { title: "Good Morning", subtitle: "Start your day with fresh vibes", emoji: "☀️", query: "morning songs hindi bengali" },
  afternoon: { title: "Good Afternoon", subtitle: "Keep the energy going", emoji: "🌤️", query: "bollywood upbeat songs" },
  evening: { title: "Good Evening", subtitle: "Unwind with soulful melodies", emoji: "🌅", query: "romantic evening songs hindi" },
  night: { title: "Good Night", subtitle: "Relax and drift away", emoji: "🌙", query: "lofi chill night songs hindi" },
};

export const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
};

export const getSongOfDayIndex = (max: number) => {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return seed % Math.max(max, 1);
};

export const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};
